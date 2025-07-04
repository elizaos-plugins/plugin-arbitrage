import { Plugin } from "@elizaos/core";
import { executeArbitrageAction } from "./actions/arbitrageAction";
import { marketProvider } from "./providers/marketProvider";
import { ArbitrageService } from "./services/ArbitrageService";

const arbitragePlugin: Plugin = {
  name: "arbitrage-plugin",
  description: "Automated arbitrage trading plugin",
  actions: [executeArbitrageAction],
  providers: [marketProvider],
  services: [ArbitrageService],
};

export default arbitragePlugin;
