import { Action, AgentRuntime, Memory } from "@elizaos/core";
import { ArbitrageService } from "../services/ArbitrageService";

const ServiceType_ARBITRAGE = "arbitrage" as const;

export const executeArbitrageAction: Action = {
    name: "EXECUTE_ARBITRAGE",
    similes: ["TRADE_ARBITRAGE", "RUN_ARBITRAGE"],
    description: "Execute arbitrage trades across markets",

    validate: async (runtime: AgentRuntime, _message: Memory) => {
        // Validate settings are present
        return runtime.getSetting("arbitrage.walletPrivateKey") !== undefined;
    },

    handler: async (runtime: AgentRuntime, _message: Memory) => {
        const service = runtime.getService(ServiceType_ARBITRAGE) as unknown as ArbitrageService;
        const markets = await service.evaluateMarkets();

        if (markets.length > 0) {
            await service.executeArbitrage(markets);
        }

        return true;
    },

    examples: [
        {
            input: "Find arbitrage opportunities",
            output: "Scanning for arbitrage trades",
            description: "Execute arbitrage trades when opportunities are found"
        }
    ]
};