import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { executeArbitrageAction } from '../../src/actions/arbitrageAction';
import { ServiceType } from '@elizaos/core';
import { ArbitrageService } from '../../src/services/ArbitrageService';

describe('executeArbitrageAction', () => {
    const mockRuntime = {
        getSetting: mock(),
        getService: mock()
    };

    const mockMessage = {
        userId: 'test-user',
        content: {
            text: 'Execute arbitrage'
        }
    };

    const mockArbitrageService = {
        evaluateMarkets: mock(),
        executeArbitrage: mock()
    };

    beforeEach(() => {
        // Reset all mocks
        mockArbitrageService.evaluateMarkets.mockReset?.();
        mockArbitrageService.executeArbitrage.mockReset?.();
        mockRuntime.getSetting.mockReset?.();
        mockRuntime.getService.mockReset?.();
        
        (mockRuntime.getService as any).mockReturnValue(mockArbitrageService);
    });

    describe('metadata', () => {
        it('should have correct name and description', () => {
            expect(executeArbitrageAction.name).toBe('EXECUTE_ARBITRAGE');
            expect(executeArbitrageAction.description).toContain('Execute arbitrage trades');
        });

        it('should have valid examples', () => {
            expect(Array.isArray(executeArbitrageAction.examples)).toBe(true);
            executeArbitrageAction.examples.forEach(example => {
                expect(Array.isArray(example)).toBe(true);
                expect(example.length).toBe(2);
                expect(example[1].content.action).toBe('EXECUTE_ARBITRAGE');
            });
        });
    });

    describe('validation', () => {
        it('should validate required settings', async () => {
            (mockRuntime.getSetting as any).mockReturnValue('test-key');
            const isValid = await executeArbitrageAction.validate(mockRuntime, mockMessage);
            expect(isValid).toBe(true);
        });

        it('should fail validation when settings are missing', async () => {
            (mockRuntime.getSetting as any).mockReturnValue(undefined);
            const isValid = await executeArbitrageAction.validate(mockRuntime, mockMessage);
            expect(isValid).toBe(false);
        });
    });

    describe('handler', () => {
        it('should execute arbitrage when opportunities exist', async () => {
            const mockOpportunities = [
                {
                    buyFromMarket: { id: 'market1' },
                    sellToMarket: { id: 'market2' },
                    profit: '100'
                }
            ];

            (mockArbitrageService.evaluateMarkets as any).mockResolvedValue(mockOpportunities);
            (mockArbitrageService.executeArbitrage as any).mockResolvedValue(true);

            const result = await executeArbitrageAction.handler(mockRuntime, mockMessage);
            expect(result).toBe(true);
            expect(mockArbitrageService.evaluateMarkets).toHaveBeenCalled();
            expect(mockArbitrageService.executeArbitrage).toHaveBeenCalledWith(mockOpportunities);
        });

        it('should handle case when no opportunities exist', async () => {
            (mockArbitrageService.evaluateMarkets as any).mockResolvedValue([]);

            const result = await executeArbitrageAction.handler(mockRuntime, mockMessage);
            expect(result).toBe(true);
            expect(mockArbitrageService.evaluateMarkets).toHaveBeenCalled();
            expect(mockArbitrageService.executeArbitrage).not.toHaveBeenCalled();
        });

        it('should handle evaluation errors', async () => {
            (mockArbitrageService.evaluateMarkets as any).mockRejectedValue(new Error('Evaluation failed'));

            await expect(executeArbitrageAction.handler(mockRuntime, mockMessage))
                .rejects.toThrow('Evaluation failed');
        });

        it('should handle execution errors', async () => {
            const mockOpportunities = [
                {
                    buyFromMarket: { id: 'market1' },
                    sellToMarket: { id: 'market2' },
                    profit: '100'
                }
            ];

            (mockArbitrageService.evaluateMarkets as any).mockResolvedValue(mockOpportunities);
            (mockArbitrageService.executeArbitrage as any).mockRejectedValue(new Error('Execution failed'));

            await expect(executeArbitrageAction.handler(mockRuntime, mockMessage))
                .rejects.toThrow('Execution failed');
        });
    });
});
