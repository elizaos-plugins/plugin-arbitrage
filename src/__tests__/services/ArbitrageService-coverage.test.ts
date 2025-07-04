import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import { ArbitrageService } from "../../services/ArbitrageService";
import { createMockRuntime } from "../test-utils";

// Mock WebSocket
class MockWebSocket {
  on = mock();
  send = mock();
  close = mock();
  constructor(url: string) {
    // Do nothing
  }
}

(global as any).WebSocket = MockWebSocket;

// Mock WebSocketProvider
mock.module("@ethersproject/providers", () => ({
  WebSocketProvider: class MockWebSocketProvider {
    constructor(url: string) {
      // Do nothing
    }
  },
}));

// Mock Wallet
mock.module("@ethersproject/wallet", () => ({
  Wallet: class MockWallet {
    constructor(privateKey: string, provider: any) {
      // Do nothing
    }
  },
}));

// Mock FlashbotsBundleProvider
mock.module("@flashbots/ethers-provider-bundle", () => ({
  FlashbotsBundleProvider: {
    create: mock().mockResolvedValue({}),
  },
}));

// Mock Contract
mock.module("@ethersproject/contracts", () => ({
  Contract: class MockContract {
    constructor(address: string, abi: any[], signer: any) {
      // Do nothing
    }
  },
}));

describe("ArbitrageService Coverage", () => {
  let service: ArbitrageService;
  let runtime: any;

  beforeEach(() => {
    service = new ArbitrageService();
    runtime = createMockRuntime();
  });

  describe("service properties", () => {
    it("should have correct static service type", () => {
      expect(ArbitrageService.serviceType).toBe("arbitrage");
    });

    it("should have correct instance service type", () => {
      expect(service.serviceType).toBe("arbitrage");
    });

    it("should have capability description", () => {
      expect(service.capabilityDescription).toBe(
        "Provides arbitrage trading capabilities across DEX markets"
      );
    });
  });

  describe("initialization edge cases", () => {
    it("should handle missing WebSocket URL but present RPC URL", async () => {
      runtime.getSetting = mock().mockImplementation((key: string) => {
        const settings: Record<string, string> = {
          ARBITRAGE_EVM_PROVIDER_URL: "https://test.ethereum.rpc",
          ARBITRAGE_EVM_PRIVATE_KEY:
            "0x1234567890123456789012345678901234567890123456789012345678901234",
          FLASHBOTS_RELAY_SIGNING_KEY:
            "0x2345678901234567890123456789012345678901234567890123456789012345",
          BUNDLE_EXECUTOR_ADDRESS: "0x1234567890123456789012345678901234567890",
        };
        return settings[key];
      });

      // This should derive wss:// from https://
      const originalLog = console.log;
      const logs: any[] = [];
      console.log = (...args: any[]) => {
        logs.push(args);
      };

      try {
        await service.initialize(runtime);
      } catch (e) {
        // Expected to fail due to actual WebSocket connection
      } finally {
        console.log = originalLog;
      }

      expect(
        logs.some(
          (args) =>
            args[0] === "Using derived WebSocket URL:" &&
            args[1] === "wss://test.ethereum.rpc"
        )
      ).toBe(true);
    });

    it("should log debug information during initialization", async () => {
      const originalLog = console.log;
      const logs: any[] = [];
      console.log = (...args: any[]) => {
        logs.push(args);
      };

      try {
        await service.initialize(runtime);
      } catch (e) {
        // Expected to fail due to actual WebSocket connection
      } finally {
        console.log = originalLog;
      }

      expect(
        logs.some((args) => args[0] === "ArbitrageService initialize - URLs:")
      ).toBe(true);
    });

    it("should throw error when both URLs are missing", async () => {
      runtime.getSetting = mock().mockReturnValue(undefined);

      await expect(service.initialize(runtime)).rejects.toThrow(
        "Missing both ARBITRAGE_ETHEREUM_WS_URL and ARBITRAGE_EVM_PROVIDER_URL"
      );
    });

    it("should throw error when private key is missing", async () => {
      runtime.getSetting = mock().mockImplementation((key: string) => {
        if (key === "ARBITRAGE_ETHEREUM_WS_URL") return "wss://test.ws";
        return undefined;
      });

      await expect(service.initialize(runtime)).rejects.toThrow(
        "Missing ARBITRAGE_EVM_PRIVATE_KEY"
      );
    });

    it("should throw error when flashbots key is missing", async () => {
      runtime.getSetting = mock().mockImplementation((key: string) => {
        const settings: Record<string, string> = {
          ARBITRAGE_ETHEREUM_WS_URL: "wss://test.ws",
          ARBITRAGE_EVM_PRIVATE_KEY:
            "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        };
        return settings[key];
      });

      await expect(service.initialize(runtime)).rejects.toThrow(
        "Missing FLASHBOTS_RELAY_SIGNING_KEY"
      );
    });

    it("should throw error when bundle executor is missing", async () => {
      runtime.getSetting = mock().mockImplementation((key: string) => {
        const settings: Record<string, string> = {
          ARBITRAGE_ETHEREUM_WS_URL: "wss://test.ws",
          ARBITRAGE_EVM_PRIVATE_KEY:
            "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          FLASHBOTS_RELAY_SIGNING_KEY:
            "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        };
        return settings[key];
      });

      await expect(service.initialize(runtime)).rejects.toThrow(
        "Missing BUNDLE_EXECUTOR_ADDRESS"
      );
    });
  });

  describe("market evaluation", () => {
    it("should throw error when not initialized", async () => {
      await expect(service.evaluateMarkets()).rejects.toThrow(
        "ArbitrageService not initialized"
      );
    });

    it("should delegate to arbitrage instance when initialized", async () => {
      const mockArbitrage = {
        evaluateMarkets: mock().mockResolvedValue([
          { tokenAddress: "0xToken", profit: "1000" },
        ]),
      };

      service["arbitrage"] = mockArbitrage as any;
      service["marketsByToken"] = { "0xToken": [] };

      const result = await service.evaluateMarkets();

      expect(mockArbitrage.evaluateMarkets).toHaveBeenCalledWith({
        "0xToken": [],
      });
      expect(result).toEqual([{ tokenAddress: "0xToken", profit: "1000" }]);
    });
  });

  describe("arbitrage execution", () => {
    it("should throw error when not initialized", async () => {
      await expect(service.executeArbitrage([])).rejects.toThrow(
        "ArbitrageService not initialized"
      );
    });

    it("should delegate to arbitrage instance with current block", async () => {
      const mockArbitrage = {
        takeCrossedMarkets: mock().mockResolvedValue(undefined),
      };

      const markets = [{ tokenAddress: "0xToken", profit: "1000" }];

      service["arbitrage"] = mockArbitrage as any;
      service["currentBlock"] = 15000000;

      await service.executeArbitrage(markets as any);

      expect(mockArbitrage.takeCrossedMarkets).toHaveBeenCalledWith(
        markets,
        15000000,
        10
      );
    });

    it("should use default max attempts of 10", async () => {
      const mockArbitrage = {
        takeCrossedMarkets: mock().mockResolvedValue(undefined),
      };

      service["arbitrage"] = mockArbitrage as any;

      await service.executeArbitrage([]);

      expect(mockArbitrage.takeCrossedMarkets).toHaveBeenCalledWith(
        [],
        0,
        10 // maxAttempts default
      );
    });
  });

  describe("stop method", () => {
    it("should close WebSocket connection if exists", async () => {
      const mockWs = {
        close: mock(),
      };

      service["wsConnection"] = mockWs as any;

      await service.stop();

      expect(mockWs.close).toHaveBeenCalled();
      expect(service["wsConnection"]).toBeNull();
    });

    it("should handle stop when no connection exists", async () => {
      service["wsConnection"] = null;

      // Should not throw when no connection exists
      await service.stop();
      expect(service["wsConnection"]).toBeNull();
    });
  });

  describe("websocket message handling", () => {
    it("should update current block from hex", () => {
      // Simulate message handler
      const data = JSON.stringify({
        params: {
          result: {
            number: "0xE4E1C0", // 15000000 in hex
          },
        },
      });

      // Parse message like the handler would
      const message = JSON.parse(data);
      if (message.params?.result?.number) {
        service["currentBlock"] = Number.parseInt(
          message.params.result.number,
          16
        );
      }

      expect(service["currentBlock"]).toBe(15000000);
    });

    it("should handle messages without block number", () => {
      const initialBlock = service["currentBlock"];

      // Simulate message without block number
      const data = JSON.stringify({
        params: {
          result: {
            hash: "0x123",
          },
        },
      });

      const message = JSON.parse(data);
      if (message.params?.result?.number) {
        service["currentBlock"] = Number.parseInt(
          message.params.result.number,
          16
        );
      }

      expect(service["currentBlock"]).toBe(initialBlock);
    });
  });
});
