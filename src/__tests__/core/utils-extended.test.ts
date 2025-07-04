import { describe, it, expect } from "bun:test";
import {
  ETHER,
  now,
  bigNumberToDecimal,
  expandDecimals,
} from "../../core/utils";
import { BigNumber } from "@ethersproject/bignumber";

describe("utils - Extended Tests", () => {
  describe("bigNumberToDecimal", () => {
    it("should convert BigNumber to decimal with default decimals", () => {
      const value = BigNumber.from("1000000000000000000"); // 1 ETH
      const result = bigNumberToDecimal(value);
      expect(result).toBe(1);
    });

    it("should convert BigNumber to decimal with custom decimals", () => {
      const value = BigNumber.from("1000000"); // 1 USDC (6 decimals)
      const result = bigNumberToDecimal(value, 6);
      expect(result).toBe(1);
    });

    it("should handle zero values", () => {
      const value = BigNumber.from("0");
      const result = bigNumberToDecimal(value);
      expect(result).toBe(0);
    });

    it("should handle fractional values", () => {
      const value = BigNumber.from("500000000000000000"); // 0.5 ETH
      const result = bigNumberToDecimal(value);
      expect(result).toBe(0.5);
    });

    it("should handle very large values", () => {
      const value = BigNumber.from("1000000000000000000000"); // 1000 ETH
      const result = bigNumberToDecimal(value);
      expect(result).toBe(1000);
    });
  });

  describe("expandDecimals", () => {
    it("should expand number to 18 decimals by default", () => {
      const result = expandDecimals(1);
      expect(result.toString()).toBe("1000000000000000000");
    });

    it("should expand number with custom decimals", () => {
      const result = expandDecimals(1, 6);
      expect(result.toString()).toBe("1000000");
    });

    it("should handle decimal inputs", () => {
      const result = expandDecimals(1.5);
      expect(result.toString()).toBe("1500000000000000000");
    });

    it("should handle zero", () => {
      const result = expandDecimals(0);
      expect(result.toString()).toBe("0");
    });

    it("should handle negative numbers", () => {
      const result = expandDecimals(-1);
      expect(result.toString()).toBe("-1000000000000000000");
    });

    it("should handle very small decimals", () => {
      const result = expandDecimals(0.000001, 18);
      expect(result.toString()).toBe("1000000000000");
    });
  });

  describe("ETHER constant", () => {
    it("should have correct value", () => {
      const originalValue = ETHER.toString();
      expect(originalValue).toBe("1000000000000000000");
    });

    it("should be usable in calculations", () => {
      const twoEther = ETHER.mul(2);
      expect(twoEther.toString()).toBe("2000000000000000000");

      const halfEther = ETHER.div(2);
      expect(halfEther.toString()).toBe("500000000000000000");
    });
  });

  describe("now function", () => {
    it("should return increasing timestamps", async () => {
      const time1 = now();
      await new Promise((resolve) => setTimeout(resolve, 1100)); // Wait 1.1 seconds
      const time2 = now();

      expect(time2).toBeGreaterThan(time1);
    });

    it("should return Unix timestamp in seconds", () => {
      const timestamp = now();
      const jsTimestamp = Date.now();

      // Should be close to Date.now() / 1000
      expect(Math.abs(timestamp - jsTimestamp / 1000)).toBeLessThan(2);
    });

    it("should return integer values", () => {
      const timestamp = now();
      expect(Number.isInteger(timestamp)).toBe(true);
    });
  });
});
