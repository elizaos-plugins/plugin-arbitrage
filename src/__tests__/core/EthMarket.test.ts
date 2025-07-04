import { describe, it, expect, beforeEach } from "bun:test";
import { EthMarket } from "../../core/EthMarket";
import { BigNumber } from "@ethersproject/bignumber";

// Create a concrete implementation for testing
class TestEthMarket extends EthMarket {
  constructor(
    marketAddress: string,
    tokenAddress: string,
    tokens: string[],
    protocol: any
  ) {
    super(marketAddress, tokenAddress, tokens, protocol);
  }

  receiveDirectly(): boolean {
    return true;
  }

  async getReserves(tokenAddress: string): Promise<BigNumber> {
    return BigNumber.from("1000000");
  }

  async getTokensOut(
    tokenIn: string,
    tokenOut: string,
    amountIn: BigNumber
  ): Promise<BigNumber> {
    return amountIn.mul(2);
  }

  async sellTokens(
    tokenIn: string,
    tokenOut: string,
    amountIn: BigNumber,
    recipient: string
  ): Promise<any> {
    return { hash: "0xhash" };
  }

  async sellTokensToNextMarket(
    tokenIn: string,
    tokenOut: string,
    amountIn: BigNumber,
    nextMarket: EthMarket
  ): Promise<any> {
    return { hash: "0xhash" };
  }

  async getPriceImpact(
    tokenIn: string,
    tokenOut: string,
    amountIn: BigNumber
  ): Promise<number> {
    return 0.02;
  }

  async getTradingFee(): Promise<number> {
    return 0.003;
  }

  async getBalance(tokenAddress: string): Promise<BigNumber> {
    return BigNumber.from("5000000");
  }
}

describe("EthMarket", () => {
  let market: TestEthMarket;

  beforeEach(() => {
    market = new TestEthMarket(
      "0xmarket",
      "0xtoken1",
      ["0xtoken1", "0xtoken2"],
      { name: "test" }
    );
  });

  it("should store market address", () => {
    expect(market.marketAddress).toBe("0xmarket");
  });

  it("should store tokens", () => {
    expect(market.tokens).toEqual(["0xtoken1", "0xtoken2"]);
  });

  it("should store protocol", () => {
    expect(market.protocol).toEqual({ name: "test" });
  });

  it("should implement receiveDirectly", () => {
    expect(market.receiveDirectly()).toBe(true);
  });

  it("should implement getReserves", async () => {
    const reserves = await market.getReserves("0xtoken1");
    expect(reserves.toString()).toBe("1000000");
  });

  it("should implement getTokensOut", async () => {
    const amountIn = BigNumber.from("100");
    const amountOut = await market.getTokensOut(
      "0xtoken1",
      "0xtoken2",
      amountIn
    );
    expect(amountOut.toString()).toBe("200");
  });

  it("should implement sellTokens", async () => {
    const result = await market.sellTokens(
      "0xtoken1",
      "0xtoken2",
      BigNumber.from("100"),
      "0xrecipient"
    );
    expect(result.hash).toBe("0xhash");
  });

  it("should implement sellTokensToNextMarket", async () => {
    const nextMarket = new TestEthMarket(
      "0xnext",
      "0xtoken3",
      ["0xtoken3"],
      {}
    );
    const result = await market.sellTokensToNextMarket(
      "0xtoken1",
      "0xtoken2",
      BigNumber.from("100"),
      nextMarket
    );
    expect(result.hash).toBe("0xhash");
  });

  it("should implement getPriceImpact", async () => {
    const impact = await market.getPriceImpact(
      "0xtoken1",
      "0xtoken2",
      BigNumber.from("100")
    );
    expect(impact).toBe(0.02);
  });

  it("should implement getTradingFee", async () => {
    const fee = await market.getTradingFee();
    expect(fee).toBe(0.003);
  });

  it("should implement getBalance", async () => {
    const balance = await market.getBalance("0xtoken1");
    expect(balance.toString()).toBe("5000000");
  });
});
