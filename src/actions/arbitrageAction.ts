import { Action, IAgentRuntime, Memory } from "@elizaos/core";
import { ArbitrageService } from "../services/ArbitrageService";

const ServiceType_ARBITRAGE = "arbitrage" as const;

export const executeArbitrageAction: Action = {
  name: "EXECUTE_ARBITRAGE",
  similes: ["TRADE_ARBITRAGE", "RUN_ARBITRAGE"],
  description: "Execute arbitrage trades across markets",

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    // Validate settings are present - check for any of the required settings
    const hasPrivateKey =
      runtime.getSetting("ARBITRAGE_EVM_PRIVATE_KEY") !== undefined;
    const hasFlashbotsKey =
      runtime.getSetting("FLASHBOTS_RELAY_SIGNING_KEY") !== undefined;
    const hasBundleExecutor =
      runtime.getSetting("BUNDLE_EXECUTOR_ADDRESS") !== undefined;

    return hasPrivateKey && hasFlashbotsKey && hasBundleExecutor;
  },

  handler: async (runtime: IAgentRuntime, _message: Memory) => {
    const service = runtime.getService(
      ServiceType_ARBITRAGE
    ) as unknown as ArbitrageService;
    const markets = await service.evaluateMarkets();

    if (markets.length > 0) {
      await service.executeArbitrage(markets);
    }

    return true;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Find arbitrage opportunities",
        },
      },
      {
        name: "{{assistant}}",
        content: {
          text: "Scanning for arbitrage trades",
          action: "EXECUTE_ARBITRAGE",
        },
      },
    ],
  ],
};
