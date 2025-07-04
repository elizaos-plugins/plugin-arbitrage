import { describe, it, expect } from "bun:test";
import arbitragePlugin from "../index";
import { executeArbitrageAction } from "../actions/arbitrageAction";
import { marketProvider } from "../providers/marketProvider";
import { ArbitrageService } from "../services/ArbitrageService";

describe("arbitragePlugin", () => {
  it("should have correct name and description", () => {
    expect(arbitragePlugin.name).toBe("arbitrage-plugin");
    expect(arbitragePlugin.description).toBe(
      "Automated arbitrage trading plugin"
    );
  });

  it("should register the correct action", () => {
    expect(arbitragePlugin.actions).toContain(executeArbitrageAction);
  });

  it("should register the correct provider", () => {
    expect(arbitragePlugin.providers).toContain(marketProvider);
  });

  it("should register the arbitrage service", () => {
    expect(arbitragePlugin.services.length).toBe(1);
    expect(arbitragePlugin.services[0]).toBe(ArbitrageService);
  });
});
