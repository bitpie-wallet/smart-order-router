"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolProvider = void 0;
const bignumber_1 = require("@ethersproject/bignumber");
const lodash_1 = __importDefault(require("lodash"));
const globalChainId_1 = require("../globalChainId");
const IUniswapV3PoolState__factory_1 = require("../types/v3/factories/IUniswapV3PoolState__factory");
const util_1 = require("../util");
class PoolProvider {
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
        util_1.log.debug(`getPools called with ${poolConstructs.length} token pairs. Deduped down to ${poolIdentifierSet.size}`);
        let slot0Results;
        let liquidityResults;
        if (this.chainId === globalChainId_1.ChainId.TRON) {
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
        util_1.log.info(`Got liquidity and slot0s for ${poolIdentifierSet.size} pools ${(providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
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
        const poolStrs = lodash_1.default.map(Object.values(poolIdentifierToPool), util_1.poolToString);
        util_1.log.debug({ poolStrs }, `Found ${poolStrs.length} valid pools`);
        return this.instantiatePoolAccessor(poolIdentifierToPool);
    }
    async getPoolsDataWithIndividualCalls(poolAddresses, functionName, providerConfig) {
        util_1.log.info(`Using individual calls for Tron chain due to missing Multicall contract`);
        const contractInterface = IUniswapV3PoolState__factory_1.IUniswapV3PoolState__factory.createInterface();
        const blockNumber = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber) ? bignumber_1.BigNumber.from(await providerConfig.blockNumber) : undefined;
        const results = [];
        // 获取 provider
        const provider = this.multicall2Provider.provider;
        if (!provider) {
            util_1.log.warn(`No provider available for individual calls on Tron`);
            return poolAddresses.map(() => ({ success: false, returnData: '0x' }));
        }
        for (const poolAddress of poolAddresses) {
            try {
                const callData = contractInterface.encodeFunctionData(functionName);
                const result = await this.makeIndividualCall(provider, poolAddress, callData, contractInterface, functionName, blockNumber);
                results.push(result);
            }
            catch (error) {
                util_1.log.warn(`Failed to get pool data for ${poolAddress}:`, error);
                results.push({ success: false, returnData: '0x' });
            }
        }
        util_1.log.debug(`Pool data fetched using individual calls for ${results.length} pools`);
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
exports.PoolProvider = PoolProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9vbC1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9wcm92aWRlcnMvcG9vbC1wcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSx3REFBcUQ7QUFLckQsb0RBQXVCO0FBRXZCLG9EQUEyQztBQUMzQyxxR0FBa0c7QUFDbEcsa0NBQTRDO0FBbUI1QyxNQUFzQixZQUFZO0lBT2hDOzs7OztPQUtHO0lBQ0gsWUFDWSxPQUFnQixFQUNoQixrQkFBc0MsRUFDdEMsZUFBNkI7UUFDckMsT0FBTyxFQUFFLENBQUM7UUFDVixVQUFVLEVBQUUsRUFBRTtRQUNkLFVBQVUsRUFBRSxHQUFHO0tBQ2hCO1FBTlMsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNoQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ3RDLGlCQUFZLEdBQVosWUFBWSxDQUlyQjtJQUNDLENBQUM7SUFFSyxLQUFLLENBQUMsZ0JBQWdCLENBQzlCLGNBQWdDLEVBQ2hDLGNBQStCO1FBRS9CLE1BQU0saUJBQWlCLEdBQWdCLElBQUksR0FBRyxFQUFVLENBQUM7UUFDekQsTUFBTSxtQkFBbUIsR0FBMEIsRUFBRSxDQUFDO1FBQ3RELE1BQU0scUJBQXFCLEdBQWEsRUFBRSxDQUFDO1FBRTNDLEtBQUssTUFBTSxhQUFhLElBQUksY0FBYyxFQUFFO1lBQzFDLE1BQU0sRUFDSixjQUFjLEVBQUUsY0FBYyxFQUM5QixTQUFTLEVBQ1QsU0FBUyxHQUNWLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBRTFDLElBQUksaUJBQWlCLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFO2dCQUN6QyxTQUFTO2FBQ1Y7WUFFRCwrSEFBK0g7WUFDL0gsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQztZQUM3QixhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDO1lBQzdCLGlCQUFp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