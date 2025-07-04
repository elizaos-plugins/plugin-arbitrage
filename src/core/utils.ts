import { BigNumber, Wallet } from "ethers";

// Constants
export const ETHER = BigNumber.from(10).pow(18);
export const DEFAULT_GAS_LIMIT = 250000;

// Math utilities
export function bigNumberToDecimal(value: BigNumber, base = 18): number {
  const divisor = BigNumber.from(10).pow(base);
  return value.mul(10000).div(divisor).toNumber() / 10000;
}

export function expandDecimals(value: number, decimals = 18): BigNumber {
  const factor = BigNumber.from(10).pow(decimals);
  // Handle negative numbers and decimals properly
  const strValue = value.toString();
  const parts = strValue.split(".");
  if (parts.length === 1) {
    return BigNumber.from(value).mul(factor);
  }
  // Handle decimal values
  const integerPart = parts[0];
  const decimalPart = parts[1] || "0";
  const decimalPlaces = decimalPart.length;
  const scaledValue = integerPart + decimalPart;
  const scaleFactor = BigNumber.from(10).pow(decimals - decimalPlaces);
  return BigNumber.from(scaledValue).mul(scaleFactor);
}

// Authentication utilities
export const getDefaultRelaySigningKey = (): string => {
  console.warn(
    "No FLASHBOTS_RELAY_SIGNING_KEY specified. Creating temporary key..."
  );
  return Wallet.createRandom().privateKey;
};

// Add error handling utilities
export const handleArbitrageError = (error: Error): void => {
  console.error(`Arbitrage Error: ${error.message}`);
  // Add any specific error handling logic
};

// Time utilities
export const now = (): number => {
  return Math.floor(Date.now() / 1000);
};
