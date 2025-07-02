import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { ArbitrageService } from '../../src/services/ArbitrageService';
import { ServiceType, AgentRuntime } from '@elizaos/core';

describe('ArbitrageService', () => {
    let arbitrageService: ArbitrageService;
    let mockRuntime: AgentRuntime;

    beforeEach(() => {
        mockRuntime = {
            getSetting: mock((key: string) => {
                switch (key) {
                    case 'ARBITRAGE_ETHEREUM_WS_URL':
                        return 'ws://test.com';
                    case 'ARBITRAGE_EVM_PROVIDER_URL':
                        return 'http://test.com';
                    case 'ARBITRAGE_EVM_PRIVATE_KEY':
                        return '0x1234567890123456789012345678901234567890123456789012345678901234';
                    case 'FLASHBOTS_RELAY_SIGNING_KEY':
                        return '0x1234567890123456789012345678901234567890123456789012345678901234';
                    default:
                        return undefined;
                }
            }),
            getLogger: mock().mockReturnValue({
                log: mock(),
                error: mock(),
                warn: mock()
            }),
            getBlocksApi: mock().mockReturnValue({
                getRecentBlocks: mock().mockResolvedValue([])
            })
        } as unknown as AgentRuntime;

        arbitrageService = new ArbitrageService();
    });

    describe('basic functionality', () => {
        it('should have correct service type', () => {
            expect(arbitrageService.serviceType).toBe(ServiceType.ARBITRAGE);
        });

        it('should throw error if required settings are missing', async () => {
            mockRuntime.getSetting = mock().mockReturnValue(undefined);
            await expect(arbitrageService.initialize(mockRuntime)).rejects.toThrow();
        });
    });
});
