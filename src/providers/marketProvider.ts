import { Provider, AgentRuntime, Memory, ProviderResult, State } from "@elizaos/core";
import { ArbitrageService } from "../services/ArbitrageService";
import { ArbitrageState } from "../type";

const ServiceType_ARBITRAGE = "arbitrage" as const;

export const marketProvider: Provider = {
    name: "MARKET_PROVIDER",
    get: async (runtime: AgentRuntime, _message: Memory, state?: State): Promise<ProviderResult> => {
        const service = runtime.getService(ServiceType_ARBITRAGE) as unknown as ArbitrageService;
        const markets = await service.evaluateMarkets();

        const arbitrageState: ArbitrageState = {
            opportunities: markets.length,
            totalProfit: "0", // Calculate total profit
            lastUpdate: new Date().toISOString(),
            markets: {}  // This will be populated by the service
        };

        return {
            data: arbitrageState
        };
    }
};