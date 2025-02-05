import { Service, ServiceType, elizaLogger } from '@elizaos/core';
import { BigNumber as BigNumber$1 } from '@ethersproject/bignumber';
import { BigNumber } from 'ethers';
import { WebSocket } from 'ws';
import { WebSocketProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';
import { Contract } from '@ethersproject/contracts';

// src/actions/arbitrageAction.ts
var executeArbitrageAction = {
  name: "EXECUTE_ARBITRAGE",
  similes: ["TRADE_ARBITRAGE", "RUN_ARBITRAGE"],
  description: "Execute arbitrage trades across markets",
  validate: async (runtime, _message) => {
    return runtime.getSetting("arbitrage.walletPrivateKey") !== undefined;
  },
  handler: async (runtime, _message) => {
    const service = runtime.getService(ServiceType.ARBITRAGE);
    const markets = await service.evaluateMarkets();
    if (markets.length > 0) {
      await service.executeArbitrage(markets);
    }
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Find arbitrage opportunities" }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Scanning for arbitrage trades",
          action: "EXECUTE_ARBITRAGE"
        }
      }
    ]
  ]
};
var marketProvider = {
  get: async (runtime, _message) => {
    const service = runtime.getService(ServiceType.ARBITRAGE);
    const markets = await service.evaluateMarkets();
    return {
      opportunities: markets.length,
      totalProfit: "0",
      // Calculate total profit
      lastUpdate: (/* @__PURE__ */ new Date()).toISOString(),
      markets: {}
      // This will be populated by the service
    };
  }
};
var DEFAULT_THRESHOLDS = {
  minProfitThreshold: BigNumber.from("100000000000000"),
  // 0.0001 ETH
  maxTradeSize: BigNumber.from("1000000000000000000"),
  // 1 ETH
  gasLimit: 5e5,
  minerRewardPercentage: 90
};

// src/core/addresses.ts
var WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
var ETHER = BigNumber.from(10).pow(18);
var Arbitrage = class {
  // 1 second
  constructor(wallet, flashbotsProvider, bundleExecutorContract) {
    this.wallet = wallet;
    this.flashbotsProvider = flashbotsProvider;
    this.bundleExecutorContract = bundleExecutorContract;
    this.bundleEntries = [];
    this.thresholds = DEFAULT_THRESHOLDS;
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY = 1e3;
  }
  async evaluateMarkets(marketsByToken) {
    elizaLogger.log("Starting market evaluation...");
    const opportunities = [];
    for (const [tokenAddress, markets] of Object.entries(marketsByToken)) {
      const validMarkets = await this.filterValidMarkets(markets, tokenAddress);
      for (let i = 0; i < validMarkets.length; i++) {
        for (let j = i + 1; j < validMarkets.length; j++) {
          const opportunity = await this.checkArbitrageOpportunity(
            validMarkets[i],
            validMarkets[j],
            tokenAddress
          );
          if (opportunity) {
            opportunities.push(opportunity);
          }
        }
      }
    }
    return opportunities.sort((a, b) => b.profit.sub(a.profit).toNumber());
  }
  async filterValidMarkets(markets, tokenAddress) {
    const validMarkets = [];
    for (const market of markets) {
      try {
        const reserves = await market.getReserves(tokenAddress);
        if (reserves.gt(this.thresholds.minProfitThreshold)) {
          validMarkets.push(market);
        }
      } catch (error) {
        console.error(`Error checking market ${market.marketAddress}:`, error);
      }
    }
    return validMarkets;
  }
  async checkArbitrageOpportunity(market1, market2, tokenAddress) {
    try {
      const price1 = await market1.getTokensOut(WETH_ADDRESS, tokenAddress, ETHER);
      const price2 = await market2.getTokensOut(WETH_ADDRESS, tokenAddress, ETHER);
      const [buyMarket, sellMarket] = price1.gt(price2) ? [market2, market1] : [market1, market2];
      const profit = price1.gt(price2) ? price1.sub(price2) : price2.sub(price1);
      if (profit.gt(this.thresholds.minProfitThreshold)) {
        const volume = await this.calculateOptimalVolume(buyMarket, sellMarket, tokenAddress, profit);
        return {
          marketPairs: [{
            buyFromMarket: buyMarket,
            sellToMarket: sellMarket
          }],
          profit,
          volume,
          tokenAddress,
          buyFromMarket: buyMarket,
          sellToMarket: sellMarket
        };
      }
    } catch (error) {
      console.error("Error checking arbitrage opportunity:", error);
    }
    return null;
  }
  async takeCrossedMarkets(markets, currentBlock, maxAttempts) {
    for (const market of markets) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const transaction = await this.executeArbitrageTrade(market, currentBlock);
          if (transaction) {
            elizaLogger.log(`Successful arbitrage execution: ${transaction.hash}`);
            await transaction.wait(1);
            break;
          }
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === maxAttempts) {
            console.error("Max attempts reached for market", market);
          } else {
            await new Promise((r) => setTimeout(r, this.RETRY_DELAY));
          }
        }
      }
    }
  }
  async executeArbitrageTrade(market, blockNumber) {
    const buyCalls = await market.buyFromMarket.sellTokensToNextMarket(
      WETH_ADDRESS,
      market.volume,
      market.sellToMarket
    );
    const intermediateAmount = await market.buyFromMarket.getTokensOut(
      WETH_ADDRESS,
      market.tokenAddress,
      market.volume
    );
    const sellCallData = await market.sellToMarket.sellTokens(
      market.tokenAddress,
      intermediateAmount,
      this.bundleExecutorContract.address
    );
    const targets = [...buyCalls.targets, market.sellToMarket.marketAddress];
    const payloads = [...buyCalls.data, sellCallData];
    const minerReward = market.profit.mul(90).div(100);
    const bundle = await this.createBundle(
      market.volume,
      minerReward,
      targets,
      payloads,
      blockNumber
    );
    return this.executeBundleWithRetry(bundle, blockNumber);
  }
  async createBundle(volume, minerReward, targets, payloads, blockNumber) {
    const gasEstimate = await this.estimateGasWithBuffer(
      volume,
      minerReward,
      targets,
      payloads
    );
    const gasPrice = await this.getOptimalGasPrice(blockNumber);
    const transaction = await this.bundleExecutorContract.populateTransaction.uniswapWeth(
      volume,
      minerReward,
      targets,
      payloads,
      { gasLimit: gasEstimate, gasPrice }
    );
    const signedTx = await this.wallet.signTransaction(transaction);
    const bundleEntry = await this.createBundleEntry(signedTx);
    return [bundleEntry];
  }
  async estimateGasWithBuffer(volume, minerReward, targets, payloads) {
    const estimate = await this.bundleExecutorContract.estimateGas.uniswapWeth(
      volume,
      minerReward,
      targets,
      payloads
    );
    return estimate.mul(120).div(100);
  }
  async getOptimalGasPrice(blockNumber) {
    const { currentGasPrice, avgGasPrice } = await getGasPriceInfo(this.wallet.provider);
    const basePrice = currentGasPrice.gt(avgGasPrice) ? currentGasPrice : avgGasPrice;
    return basePrice.mul(110).div(100);
  }
  async executeBundleWithRetry(bundle, blockNumber) {
    for (let i = 0; i < this.MAX_RETRIES; i++) {
      try {
        await this.simulateBundle(bundle, blockNumber);
        const response = await this.flashbotsProvider.sendBundle(
          bundle.map((entry) => ({
            signedTransaction: entry.signedTransaction,
            signer: this.wallet,
            transaction: {
              to: entry.to,
              gasLimit: entry.gas,
              gasPrice: entry.gas_price,
              value: entry.value,
              data: entry.input
            }
          })),
          blockNumber + 1
        );
        if ("error" in response) {
          throw new Error(response.error.message);
        }
        return response;
      } catch (error) {
        console.error(`Bundle execution attempt ${i + 1} failed:`, error);
        if (i === this.MAX_RETRIES - 1) throw error;
        await new Promise((r) => setTimeout(r, this.RETRY_DELAY));
      }
    }
    return null;
  }
  async createBundleEntry(signedTx) {
    const tx = await this.wallet.provider.getTransaction(signedTx);
    if (!tx?.to || !tx?.gasPrice || !tx?.value) {
      throw new Error("Invalid transaction");
    }
    return {
      to: tx.to,
      gas: tx.gasLimit.toNumber(),
      gas_price: tx.gasPrice.toString(),
      value: tx.value.toNumber(),
      input: tx.data,
      from: this.wallet.address,
      signedTransaction: signedTx,
      signer: this.wallet.address
    };
  }
  async simulateBundle(bundle, blockNumber) {
    const stringBundle = bundle.map((entry) => entry.signedTransaction);
    const simulation = await this.flashbotsProvider.simulate(stringBundle, blockNumber);
    if ("error" in simulation) {
      throw new Error(`Simulation failed: ${simulation.error.message}`);
    }
    const { bundleGasPrice, coinbaseDiff, totalGasUsed } = simulation;
    const cost = bundleGasPrice.mul(totalGasUsed);
    const profit = coinbaseDiff.sub(cost);
    if (profit.lte(this.thresholds.minProfitThreshold)) {
      throw new Error("Bundle not profitable enough");
    }
  }
  async submitBundleWithAdjustedGasPrice(bundle, blockNumber, blocksApi) {
    elizaLogger.log(`Submitting bundle with adjusted gas price for block ${blockNumber}`);
    try {
      const { currentGasPrice, avgGasPrice } = await getGasPriceInfo(this.wallet.provider);
      const competingBundlesGasPrices = await monitorCompetingBundlesGasPrices(blocksApi);
      let competingBundleGasPrice = BigNumber$1.from(0);
      for (const price of competingBundlesGasPrices) {
        const currentPrice = BigNumber$1.from(price);
        if (currentPrice.gt(competingBundleGasPrice)) {
          competingBundleGasPrice = currentPrice;
        }
      }
      const adjustedGasPrice = await this.adjustGasPriceForTransaction(
        currentGasPrice,
        avgGasPrice,
        competingBundleGasPrice
      );
      if (adjustedGasPrice.lte(currentGasPrice)) {
        throw new Error("Adjusted gas price is not competitive");
      }
      const isValidBundleGas = await checkBundleGas(adjustedGasPrice);
      if (!isValidBundleGas) {
        throw new Error("Invalid bundle gas");
      }
      const currentTimestamp = Math.floor(Date.now() / 1e3);
      const maxTimestamp = currentTimestamp + 60;
      const targetBlockNumber = blockNumber + 1;
      const bundleSubmission = await this.flashbotsProvider.sendBundle(
        bundle.map((entry) => ({
          signedTransaction: entry.signedTransaction,
          signer: this.wallet,
          transaction: {
            to: entry.to,
            gasLimit: entry.gas,
            gasPrice: entry.gas_price,
            value: entry.value,
            data: entry.input
          }
        })),
        targetBlockNumber,
        {
          minTimestamp: currentTimestamp,
          maxTimestamp
        }
      );
      if ("error" in bundleSubmission) {
        throw new Error(`Bundle submission failed: ${bundleSubmission.error.message}`);
      }
      elizaLogger.log("Bundle submitted successfully:", {
        blockNumber: targetBlockNumber,
        adjustedGasPrice: adjustedGasPrice.toString(),
        bundleHash: bundleSubmission.bundleHash
      });
    } catch (error) {
      console.error("Failed to submit bundle with adjusted gas price:", error);
      throw error;
    }
  }
  async adjustGasPriceForTransaction(currentGasPrice, avgGasPrice, competingBundleGasPrice) {
    elizaLogger.log("Calculating adjusted gas price", {
      current: currentGasPrice.toString(),
      average: avgGasPrice.toString(),
      competing: competingBundleGasPrice.toString()
    });
    let adjustedGasPrice = currentGasPrice;
    if (avgGasPrice.gt(adjustedGasPrice)) {
      adjustedGasPrice = avgGasPrice;
    }
    if (competingBundleGasPrice.gt(adjustedGasPrice)) {
      adjustedGasPrice = competingBundleGasPrice;
    }
    const premium = adjustedGasPrice.mul(10).div(100);
    adjustedGasPrice = adjustedGasPrice.add(premium);
    elizaLogger.log("Adjusted gas price:", adjustedGasPrice.toString());
    return adjustedGasPrice;
  }
  async calculateOptimalVolume(buyFromMarket, sellToMarket, tokenAddress, profit) {
    elizaLogger.log("Entering calculateOptimalVolume");
    const availableLiquidityBuy = await buyFromMarket.getReserves(tokenAddress);
    const availableLiquiditySell = await sellToMarket.getReserves(tokenAddress);
    const maxTradeSize = BigNumber$1.from(1e5);
    const priceImpactBuy = await buyFromMarket.getPriceImpact(tokenAddress, maxTradeSize);
    const priceImpactSell = await sellToMarket.getPriceImpact(tokenAddress, maxTradeSize);
    const tradingFeeBuy = await buyFromMarket.getTradingFee(tokenAddress);
    const tradingFeeSell = await sellToMarket.getTradingFee(tokenAddress);
    let left = BigNumber$1.from(1);
    let right = maxTradeSize;
    let optimalVolume = BigNumber$1.from(0);
    let maxExpectedProfit = BigNumber$1.from(0);
    while (left.lt(right)) {
      const mid = left.add(right).div(2);
      const expectedProfit = profit.mul(mid).sub(priceImpactBuy.mul(mid)).sub(priceImpactSell.mul(mid)).sub(tradingFeeBuy.mul(mid)).sub(tradingFeeSell.mul(mid));
      if (expectedProfit.gt(maxExpectedProfit) && expectedProfit.gte(this.thresholds.minProfitThreshold)) {
        maxExpectedProfit = expectedProfit;
        optimalVolume = mid;
        left = mid.add(1);
      } else {
        right = mid.sub(1);
      }
    }
    optimalVolume = BigNumber$1.from(Math.min(
      optimalVolume.toNumber(),
      availableLiquidityBuy.toNumber(),
      availableLiquiditySell.toNumber()
    ));
    elizaLogger.log(`calculateOptimalVolume: optimalVolume = ${optimalVolume}`);
    return optimalVolume;
  }
};
async function checkBundleGas(bundleGas) {
  const isValid = bundleGas.gte(42e3);
  elizaLogger.log(`checkBundleGas: bundleGas = ${bundleGas}, isValid = ${isValid}`);
  return isValid;
}
async function monitorCompetingBundlesGasPrices(blocksApi) {
  elizaLogger.log("Entering monitorCompetingBundlesGasPrices");
  const recentBlocks = await blocksApi.getRecentBlocks();
  const competingBundlesGasPrices = recentBlocks.map((block) => block.bundleGasPrice);
  elizaLogger.log(`monitorCompetingBundlesGasPrices: competingBundlesGasPrices = ${competingBundlesGasPrices}`);
  return competingBundlesGasPrices;
}
async function getGasPriceInfo(provider) {
  const feeData = await provider.getFeeData();
  const currentGasPrice = feeData.gasPrice || BigNumber$1.from(0);
  const block = await provider.getBlock("latest");
  const prices = [];
  for (let i = 0; i < 5; i++) {
    const historicalBlock = await provider.getBlock(block.number - i);
    if (historicalBlock.baseFeePerGas) {
      prices.push(historicalBlock.baseFeePerGas);
    }
  }
  const avgGasPrice = prices.length > 0 ? prices.reduce((a, b) => a.add(b)).div(prices.length) : currentGasPrice;
  return { currentGasPrice, avgGasPrice };
}
var ArbitrageService = class extends Service {
  constructor() {
    super(...arguments);
    this.arbitrage = null;
    this.wsConnection = null;
    this.marketsByToken = {};
    this.currentBlock = 0;
  }
  static get serviceType() {
    return ServiceType.ARBITRAGE;
  }
  get serviceType() {
    return ServiceType.ARBITRAGE;
  }
  // Remove unnecessary constructor
  // constructor() {
  //     super();
  // }
  async initialize(runtime) {
    this.runtime = runtime;
    let wsUrl = runtime.getSetting("ARBITRAGE_ETHEREUM_WS_URL");
    let rpcUrl = runtime.getSetting("ARBITRAGE_EVM_PROVIDER_URL");
    console.log("ArbitrageService initialize - URLs:", {
      wsUrl,
      rpcUrl
    });
    if (!wsUrl && !rpcUrl) {
      throw new Error("Missing both ARBITRAGE_ETHEREUM_WS_URL and ARBITRAGE_EVM_PROVIDER_URL envs");
    }
    if (!wsUrl && rpcUrl) {
      wsUrl = rpcUrl.replace("https://", "wss://");
      console.log("Using derived WebSocket URL:", wsUrl);
    }
    if (!wsUrl) {
      throw new Error("No WebSocket URL available after all fallbacks");
    }
    const walletKey = runtime.getSetting("ARBITRAGE_EVM_PRIVATE_KEY");
    if (!walletKey) throw new Error("Missing ARBITRAGE_EVM_PRIVATE_KEY env");
    console.log("Initializing WebSocketProvider with URL:", wsUrl);
    const provider = new WebSocketProvider(wsUrl);
    const wallet = new Wallet(walletKey, provider);
    const flashbotsKey = runtime.getSetting("FLASHBOTS_RELAY_SIGNING_KEY");
    if (!flashbotsKey) throw new Error("Missing FLASHBOTS_RELAY_SIGNING_KEY env");
    const flashbotsProvider = await FlashbotsBundleProvider.create(
      provider,
      wallet,
      flashbotsKey
    );
    const bundleExecutorAddress = runtime.getSetting("BUNDLE_EXECUTOR_ADDRESS");
    if (!bundleExecutorAddress) throw new Error("Missing BUNDLE_EXECUTOR_ADDRESS env");
    const bundleExecutorContract = new Contract(
      bundleExecutorAddress,
      [
        "function execute(bytes[] calldata calls) external payable",
        "function executeWithToken(bytes[] calldata calls, address tokenAddress, uint256 tokenAmount) external payable"
      ],
      wallet
    );
    this.arbitrage = new Arbitrage(
      wallet,
      flashbotsProvider,
      bundleExecutorContract
    );
    console.log("Setting up WebSocket connection to:", wsUrl);
    this.wsConnection = new WebSocket(wsUrl);
    this.setupWebSocketHandlers();
  }
  setupWebSocketHandlers() {
    if (!this.wsConnection) return;
    this.wsConnection.on("open", () => {
      console.log("WebSocket connection established");
      this.wsConnection?.send(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_subscribe",
        params: ["newHeads"]
      }));
    });
    this.wsConnection.on("message", async (data) => {
      const message = JSON.parse(data);
      if (message.params?.result?.number) {
        this.currentBlock = Number.parseInt(message.params.result.number, 16);
      }
    });
    this.wsConnection.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
    this.wsConnection.on("close", () => {
      console.log("WebSocket connection closed");
      setTimeout(() => this.initialize(this.runtime), 5e3);
    });
  }
  async evaluateMarkets() {
    if (!this.arbitrage) throw new Error("ArbitrageService not initialized");
    return this.arbitrage.evaluateMarkets(this.marketsByToken);
  }
  async executeArbitrage(markets) {
    if (!this.arbitrage) throw new Error("ArbitrageService not initialized");
    const maxAttempts = 10;
    return this.arbitrage.takeCrossedMarkets(markets, this.currentBlock, maxAttempts);
  }
  async stop() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }
};

// src/index.ts
var arbitrageService = new ArbitrageService();
var arbitragePlugin = {
  name: "arbitrage-plugin",
  description: "Automated arbitrage trading plugin",
  actions: [executeArbitrageAction],
  providers: [marketProvider],
  services: [arbitrageService]
};
var index_default = arbitragePlugin;

export { index_default as default };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map