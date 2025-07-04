import { mock } from "bun:test";
import {
  type IAgentRuntime,
  type Memory,
  type State,
  type Character,
  type UUID,
  type Content,
  type Room,
  type Entity,
  ModelType,
} from "@elizaos/core";

// Mock Runtime Type
export type MockRuntime = Partial<IAgentRuntime> & {
  agentId: UUID;
  character: Character;
  getSetting: ReturnType<typeof mock>;
  useModel: ReturnType<typeof mock>;
  composeState: ReturnType<typeof mock>;
  createMemory: ReturnType<typeof mock>;
  getMemories: ReturnType<typeof mock>;
  searchMemories: ReturnType<typeof mock>;
  updateMemory: ReturnType<typeof mock>;
  getRoom: ReturnType<typeof mock>;
  getParticipantUserState: ReturnType<typeof mock>;
  setParticipantUserState: ReturnType<typeof mock>;
  emitEvent: ReturnType<typeof mock>;
  getTasks: ReturnType<typeof mock>;
  getService: ReturnType<typeof mock>;
  providers: any[];
  actions: any[];
  evaluators: any[];
  services: any[];
};

// Create Mock Runtime
export function createMockRuntime(
  overrides: Partial<MockRuntime> = {}
): MockRuntime {
  return {
    agentId: "test-agent-id" as UUID,
    character: {
      name: "Test Agent",
      bio: "A test agent for unit testing",
      templates: {
        messageHandlerTemplate: "Test template {{recentMessages}}",
        shouldRespondTemplate: "Should respond {{recentMessages}}",
      },
    } as Character,

    // Core methods with default implementations
    useModel: mock().mockResolvedValue("Mock response"),
    composeState: mock().mockResolvedValue({
      values: {
        agentName: "Test Agent",
        recentMessages: "Test message",
      },
      data: {
        room: {
          id: "test-room-id",
          type: "DIRECT",
        },
      },
    }),
    createMemory: mock().mockResolvedValue({ id: "memory-id" }),
    getMemories: mock().mockResolvedValue([]),
    searchMemories: mock().mockResolvedValue([]),
    updateMemory: mock().mockResolvedValue(undefined),
    getSetting: mock().mockImplementation((key: string) => {
      const settings: Record<string, string> = {
        TEST_SETTING: "test-value",
        API_KEY: "test-api-key",
        ARBITRAGE_ETHEREUM_WS_URL: "wss://test.ethereum.ws",
        ARBITRAGE_EVM_PROVIDER_URL: "https://test.ethereum.rpc",
        ARBITRAGE_EVM_PRIVATE_KEY:
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        FLASHBOTS_RELAY_SIGNING_KEY:
          "0x2345678901234567890123456789012345678901234567890123456789012345",
        BUNDLE_EXECUTOR_ADDRESS: "0x1234567890123456789012345678901234567890",
      };
      return settings[key];
    }),
    getRoom: mock().mockResolvedValue({
      id: "test-room-id",
      type: "DIRECT",
      participants: ["user1", "user2"],
    }),
    getParticipantUserState: mock().mockResolvedValue({}),
    setParticipantUserState: mock().mockResolvedValue(undefined),
    emitEvent: mock().mockResolvedValue(undefined),
    getTasks: mock().mockResolvedValue([]),
    getService: mock().mockImplementation((serviceName: string) => {
      if (serviceName === "arbitrage") {
        return {
          evaluateMarkets: mock().mockResolvedValue([]),
          executeArbitrage: mock().mockResolvedValue(true),
        };
      }
      return null;
    }),

    // Arrays for providers, actions, etc.
    providers: [],
    actions: [],
    evaluators: [],
    services: [],

    // Override with custom values
    ...overrides,
  };
}

// Create Mock Memory
export function createMockMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: "test-memory-id" as UUID,
    content: {
      text: "Test message content",
      action: null,
    },
    userId: "test-user-id" as UUID,
    agentId: "test-agent-id" as UUID,
    roomId: "test-room-id" as UUID,
    embedding: Array.from({ length: 1536 }, () => 0),
    createdAt: Date.now(),
    // Override with custom values
    ...overrides,
  };
}

// Create Mock State
export function createMockState(overrides: Partial<State> = {}): State {
  return {
    text: "Test state text",
    values: {
      agentName: "Test Agent",
      recentMessages: "Recent test messages",
      // Add your plugin-specific state values
    },
    data: {
      room: {
        id: "test-room-id",
        type: "DIRECT",
      },
      entities: [],
      lastMessages: [],
      goals: [],
      facts: [],
      recentFacts: [],
    },
    ...overrides,
  };
}

// Create Mock Callback
export function createMockCallback() {
  return mock().mockImplementation((response: any) => {
    console.log("Mock callback called with:", response);
  });
}

// Helper to wait for all promises
export async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
}

// Helper to create test content
export function createTestContent(text: string, action?: string): Content {
  return {
    text,
    action: action || null,
  };
}

// Mock WebSocket for arbitrage testing
export function createMockWebSocket() {
  return {
    on: mock(),
    close: mock(),
    send: mock(),
    readyState: 1, // OPEN
  };
}

// Mock Arbitrage Service
export function createMockArbitrageService() {
  return {
    evaluateMarkets: mock().mockResolvedValue([
      {
        marketPairs: [
          { protocol: "UniswapV2", marketAddress: "0x123" },
          { protocol: "SushiSwap", marketAddress: "0x456" },
        ],
        profit: { toString: () => "1000000000000000" },
        volume: { toString: () => "10000000000000000000" },
        tokenAddress: "0xToken",
        buyFromMarket: { protocol: "UniswapV2" },
        sellToMarket: { protocol: "SushiSwap" },
      },
    ]),
    executeArbitrage: mock().mockResolvedValue(true),
    initialize: mock().mockResolvedValue(undefined),
  };
}

// Mock Provider for testing
export function createMockProvider(name: string, data: any) {
  return {
    name,
    get: mock().mockResolvedValue({ data }),
  };
}

// Mock Action for testing
export function createMockAction(name: string) {
  return {
    name,
    validate: mock().mockResolvedValue(true),
    handler: mock().mockResolvedValue(true),
    examples: [],
  };
}

// Mock for testing error scenarios
export function createFailingMockRuntime(): MockRuntime {
  const runtime = createMockRuntime();
  runtime.useModel = mock().mockRejectedValue(new Error("Model error"));
  runtime.composeState = mock().mockRejectedValue(new Error("State error"));
  return runtime;
}

// Export commonly used test data
export const TEST_ADDRESSES = {
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  UNISWAP_V2_ROUTER: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  SUSHISWAP_ROUTER: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
};

export const TEST_PRIVATE_KEY =
  "0x0000000000000000000000000000000000000000000000000000000000000001";
