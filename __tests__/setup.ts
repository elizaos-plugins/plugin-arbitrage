import { mock } from 'bun:test';
import { WebSocket } from 'ws';
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';

// Mock WebSocket
mock.module('ws', () => ({
    WebSocket: mock(() => ({
        on: mock(),
        close: mock(),
        send: mock()
    }))
}));

// Mock ethers providers
mock.module('@ethersproject/providers', () => ({
    WebSocketProvider: mock(() => ({
        on: mock(),
        getGasPrice: mock(() => Promise.resolve('1000000000')),
        getBlock: mock(() => Promise.resolve({ number: 1 }))
    }))
}));

// Mock Flashbots provider
mock.module('@flashbots/ethers-provider-bundle', () => ({
    FlashbotsBundleProvider: {
        create: mock(() => Promise.resolve({
            sendBundle: mock(() => Promise.resolve({
                wait: mock(() => Promise.resolve(true))
            })),
            simulate: mock(() => Promise.resolve({
                success: true,
                profit: '1000000000000000'
            }))
        }))
    }
}));

// Mock @elizaos/core
mock.module('@elizaos/core', () => ({
    Service: class {},
    ServiceType: {
        ARBITRAGE: 'arbitrage'
    },
    logger: {
        info: mock(),
        error: mock(),
        log: mock()
    }
}));