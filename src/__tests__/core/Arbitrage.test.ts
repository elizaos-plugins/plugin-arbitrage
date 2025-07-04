import { describe, it, expect, mock, beforeEach, spyOn } from "bun:test";
import { Arbitrage } from "../../core/Arbitrage";
import { BigNumber } from "@ethersproject/bignumber";
import { TestMarket } from "../utils/TestMarket";
import { CrossedMarketDetails } from "../../type";

describe("Arbitrage", () => {
  let arbitrage: Arbitrage;
  let mockProvider: any;
  let mockWallet: any;
  let mockBundleExecutorContract: any;

  beforeEach(() => {
    mockProvider = {
      getGasPrice: mock().mockResolvedValue(BigNumber.from("50000000000")),
      getBlock: mock().mockResolvedValue({ number: 1 }),
      getFeeData: mock().mockResolvedValue({
        gasPrice: BigNumber.from("50000000000"),
        maxFeePerGas: BigNumber.from("60000000000"),
        maxPriorityFeePerGas: BigNumber.from("2000000000"),
      }),
    };

    mockWallet = {
      provider: mockProvider,
      address: "0xmockaddress",
      signTransaction: mock().mockResolvedValue("0xsignedtx"),
    };

    mockBundleExecutorContract = {
      address: "0xbundleexecutor",
      estimateGas: {
        flashArbitrage: mock().mockResolvedValue(BigNumber.from("200000")),
        uniswapWeth: mock().mockResolvedValue(BigNumber.from("200000")),
      },
      populateTransaction: {
        uniswapWeth: mock().mockResolvedValue({
          to: "0xbundleexecutor",
          data: "0x123456",
          value: BigNumber.from("0"),
        }),
      },
    };

    arbitrage = new Arbitrage(
      mockWallet,
      mockProvider as any,
      mockBundleExecutorContract
    );
  });

  describe("market evaluation", () => {
    it("should filter out markets with insufficient liquidity", async () => {
      const mockMarkets = {
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": [
          new TestMarket(
            "0xmarket1",
            "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
          ),
          new TestMarket(
            "0xmarket2",
            "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
          ),
        ],
      };

      // Mock insufficient liquidity
      spyOn(
        mockMarkets["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"][0],
        "getReserves"
      ).mockResolvedValue(BigNumber.from("100"));
      spyOn(
        mockMarkets["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"][1],
        "getReserves"
      ).mockResolvedValue(BigNumber.from("100"));

      const opportunities = await arbitrage.evaluateMarkets(mockMarkets);
      expect(opportunities.length).toBe(0);
    });
  });

  describe("bundle execution", () => {
    it("should create arbitrage instance", () => {
      expect(arbitrage).toBeDefined();
      expect(arbitrage).toBeInstanceOf(Arbitrage);
    });

    it("should have expected methods", () => {
      expect(typeof arbitrage.evaluateMarkets).toBe("function");
      expect(typeof arbitrage.takeCrossedMarkets).toBe("function");
    });
  });
});
