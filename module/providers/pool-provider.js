import { BigNumber } from '@ethersproject/bignumber';
import _ from 'lodash';
import { ChainId } from '../globalChainId';
import { IUniswapV3PoolState__factory } from '../types/v3/factories/IUniswapV3PoolState__factory';
import { log, poolToString } from '../util';
export class PoolProvider {
    /**
     * Creates an instance of V4PoolProvider.
     * @param chainId The chain id to use.
     * @param multicall2Provider The multicall provider to use to get the pools.
     * @param retryOptions The retry options for each call to the multicall.
     */
    constructor(chainId, multicall2Provider, retryOptions = {
        retries: 2,
        minTimeout: 50,
        maxTimeout: 500,
    }) {
        this.chainId = chainId;
        this.multicall2Provider = multicall2Provider;
        this.retryOptions = retryOptions;
    }
    async getPoolsInternal(poolConstructs, providerConfig) {
        const poolIdentifierSet = new Set();
        const sortedCurrencyPairs = [];
        const sortedPoolIdentifiers = [];
        for (const poolConstruct of poolConstructs) {
            const { poolIdentifier: poolIdentifier, currency0, currency1, } = this.getPoolIdentifier(poolConstruct);
            if (poolIdentifierSet.has(poolIdentifier)) {
                continue;
            }
            // It's the easiest way to change the pool construct in place, since we don't know the entire pool construct at compiling time.
            poolConstruct[0] = currency0;
            poolConstruct[1] = currency1;
            poolIdentifierSet.add(poolIdentifier);
            sortedCurrencyPairs.push(poolConstruct);
            sortedPoolIdentifiers.push(poolIdentifier);
        }
        log.debug(`getPools called with ${poolConstructs.length} token pairs. Deduped down to ${poolIdentifierSet.size}`);
        let slot0Results;
        let liquidityResults;
        if (this.chainId === ChainId.TRON) {
            [slot0Results, liquidityResults] = await Promise.all([
                this.getPoolsDataWithIndividualCalls(sortedPoolIdentifiers, this.getSlot0FunctionName(), providerConfig),
                this.getPoolsDataWithIndividualCalls(sortedPoolIdentifiers, this.getLiquidityFunctionName(), providerConfig),
            ]);
        }
        else {
            [slot0Results, liquidityResults] = await Promise.all([
                this.getPoolsData(sortedPoolIdentifiers, this.getSlot0FunctionName(), providerConfig),
                this.getPoolsData(sortedPoolIdentifiers, this.getLiquidityFunctionName(), providerConfig),
            ]);
        }
        log.info(`Got liquidity and slot0s for ${poolIdentifierSet.size} pools ${(providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? `as of block: ${providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber}.`
            : ``}`);
        const poolIdentifierToPool = {};
        const invalidPools = [];
        for (let i = 0; i < sortedPoolIdentifiers.length; i++) {
            const slot0Result = slot0Results[i];
            const liquidityResult = liquidityResults[i];
            // These properties tell us if a pool is valid and initialized or not.
            if (!(slot0Result === null || slot0Result === void 0 ? void 0 : slot0Result.success) ||
                !(liquidityResult === null || liquidityResult === void 0 ? void 0 : liquidityResult.success) ||
                slot0Result.result.sqrtPriceX96.eq(0)) {
                invalidPools.push(sortedCurrencyPairs[i]);
                continue;
            }
            const slot0 = slot0Result.result;
            const liquidity = liquidityResult.result[0];
            const pool = this.instantiatePool(sortedCurrencyPairs[i], slot0, liquidity);
            const poolIdentifier = sortedPoolIdentifiers[i];
            poolIdentifierToPool[poolIdentifier] = pool;
        }
        const poolStrs = _.map(Object.values(poolIdentifierToPool), poolToString);
        log.debug({ poolStrs }, `Found ${poolStrs.length} valid pools`);
        return this.instantiatePoolAccessor(poolIdentifierToPool);
    }
    async getPoolsDataWithIndividualCalls(poolAddresses, functionName, providerConfig) {
        log.info(`Using individual calls for Tron chain due to missing Multicall contract`);
        const contractInterface = IUniswapV3PoolState__factory.createInterface();
        const blockNumber = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber) ? BigNumber.from(await providerConfig.blockNumber) : undefined;
        const results = [];
        // 获取 provider
        const provider = this.multicall2Provider.provider;
        if (!provider) {
            log.warn(`No provider available for individual calls on Tron`);
            return poolAddresses.map(() => ({ success: false, returnData: '0x' }));
        }
        for (const poolAddress of poolAddresses) {
            try {
                const callData = contractInterface.encodeFunctionData(functionName);
                const result = await this.makeIndividualCall(provider, poolAddress, callData, contractInterface, functionName, blockNumber);
                results.push(result);
            }
            catch (error) {
                log.warn(`Failed to get pool data for ${poolAddress}:`, error);
                results.push({ success: false, returnData: '0x' });
            }
        }
        log.debug(`Pool data fetched using individual calls for ${results.length} pools`);
        return results;
    }
    async makeIndividualCall(provider, address, callData, contractInterface, functionName, blockNumber) {
        try {
            const result = await provider.call({
                to: address,
                data: callData,
                blockTag: blockNumber,
            });
            if (result === '0x' || result.length <= 2) {
                return {
                    success: false,
                    returnData: result,
                };
            }
            const decoded = contractInterface.decodeFunctionResult(functionName, result);
            return {
                success: true,
                result: decoded,
            };
        }
        catch (error) {
            return {
                success: false,
                returnData: '0x',
            };
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9vbC1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9wcm92aWRlcnMvcG9vbC1wcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFLckQsT0FBTyxDQUFDLE1BQU0sUUFBUSxDQUFDO0FBRXZCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMzQyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxNQUFNLFNBQVMsQ0FBQztBQW1CNUMsTUFBTSxPQUFnQixZQUFZO0lBT2hDOzs7OztPQUtHO0lBQ0gsWUFDWSxPQUFnQixFQUNoQixrQkFBc0MsRUFDdEMsZUFBNkI7UUFDckMsT0FBTyxFQUFFLENBQUM7UUFDVixVQUFVLEVBQUUsRUFBRTtRQUNkLFVBQVUsRUFBRSxHQUFHO0tBQ2hCO1FBTlMsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNoQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ3RDLGlCQUFZLEdBQVosWUFBWSxDQUlyQjtJQUNDLENBQUM7SUFFSyxLQUFLLENBQUMsZ0JBQWdCLENBQzlCLGNBQWdDLEVBQ2hDLGNBQStCO1FBRS9CLE1BQU0saUJBQWlCLEdBQWdCLElBQUksR0FBRyxFQUFVLENBQUM7UUFDekQsTUFBTSxtQkFBbUIsR0FBMEIsRUFBRSxDQUFDO1FBQ3RELE1BQU0scUJBQXFCLEdBQWEsRUFBRSxDQUFDO1FBRTNDLEtBQUssTUFBTSxhQUFhLElBQUksY0FBYyxFQUFFO1lBQzFDLE1BQU0sRUFDSixjQUFjLEVBQUUsY0FBYyxFQUM5QixTQUFTLEVBQ1QsU0FBUyxHQUNWLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBRTFDLElBQUksaUJBQWlCLENBQUMs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