import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { marketProvider } from '../../src/providers/marketProvider';
import { AgentRuntime, Memory, ServiceType } from '@elizaos/core';
import { ArbitrageService } from '../../src/services/ArbitrageService';

describe('marketProvider', () => {
    let mockRuntime: AgentRuntime;
    let mockMemory: Memory;
    let mockArbitrageService: ArbitrageService;

    beforeEach(() => {
        mockArbitrageService = {
            evaluateMarkets: mock().mockResolvedValue([
                { profit: '1000', tokenAddress: '0xtoken1' },
                { profit: '2000', tokenAddress: '0xtoken2' }
            ])
        } as any;

        mockRuntime = {
            getService: mock().mockReturnValue(mockArbitrageService)
        } as any;

        mockMemory = {} as Memory;
    });

    it('should have correct name', () => {
        expect(marketProvider.name).toBe('MARKET_PROVIDER');
    });

    it('should return market state with opportunities', async () => {
        const result = await marketProvider.get(mockRuntime, mockMemory, {});
        
        expect(result.data).toBeDefined();
        expect(result.data.opportunities).toBe(2);
        expect(result.data.totalProfit).toBe('0');
        expect(result.data.lastUpdate).toBeDefined();
        expect(result.data.markets).toEqual({});
    });

    it('should handle empty opportunities', async () => {
        mockArbitrageService.evaluateMarkets = mock().mockResolvedValue([]);
        
        const result = await marketProvider.get(mockRuntime, mockMemory, {});
        
        expect(result.data.opportunities).toBe(0);
    });

    it('should call getService with correct ServiceType', async () => {
        await marketProvider.get(mockRuntime, mockMemory, {});
        
        expect(mockRuntime.getService).toHaveBeenCalledWith(ServiceType.ARBITRAGE);
    });
});