import { describe, it, expect } from "bun:test";
import { ETHER, now } from "../../core/utils";
import { BigNumber } from "@ethersproject/bignumber";

describe("utils", () => {
  describe("ETHER", () => {
    it("should equal 10^18", () => {
      expect(ETHER.toString()).toBe("1000000000000000000");
    });

    it("should be a BigNumber", () => {
      expect(ETHER._isBigNumber).toBe(true);
    });
  });

  describe("now", () => {
    it("should return current timestamp", () => {
      const timestamp = now();
      const currentTime = Math.floor(Date.now() / 1000);

      // Allow 1 second difference
      expect(Math.abs(timestamp - currentTime)).toBeLessThanOrEqual(1);
    });

    it("should return a number", () => {
      expect(typeof now()).toBe("number");
    });
  });
});
