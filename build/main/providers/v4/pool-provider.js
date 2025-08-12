"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.V4PoolProvider = exports.isPoolFeeDynamic = exports.sortsBefore = void 0;
const v4_sdk_1 = require("@uniswap/v4-sdk");
const async_retry_1 = __importDefault(require("async-retry"));
const StateView__factory_1 = require("../../types/other/factories/StateView__factory");
const util_1 = require("../../util");
const pool_provider_1 = require("../pool-provider");
// TODO: export sortsBefore from v4-sdk https://github.com/Uniswap/sdks/tree/main/sdks/v4-sdk/src/utils to avoid duplication
function sortsBefore(currencyA, currencyB) {
    if (currencyA.isNative)
        return true;
    if (currencyB.isNative)
        return false;
    return currencyA.wrapped.sortsBefore(currencyB.wrapped);
}
exports.sortsBefore = sortsBefore;
function isPoolFeeDynamic(tokenA, tokenB, subgraphPool) {
    return (v4_sdk_1.Pool.getPoolId(tokenA, tokenB, v4_sdk_1.DYNAMIC_FEE_FLAG, Number(subgraphPool.tickSpacing), subgraphPool.hooks).toLowerCase() === subgraphPool.id.toLowerCase());
}
exports.isPoolFeeDynamic = isPoolFeeDynamic;
class V4PoolProvider extends pool_provider_1.PoolProvider {
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
        super(chainId, multicall2Provider, retryOptions);
        // Computing pool id is slow as it requires hashing, encoding etc.
        // Addresses never change so can always be cached.
        this.POOL_ID_CACHE = {};
    }
    async getPools(currencyPairs, providerConfig) {
        return await super.getPoolsInternal(currencyPairs, providerConfig);
    }
    getPoolId(currencyA, currencyB, fee, tickSpacing, hooks) {
        const { poolIdentifier, currency0, currency1 } = this.getPoolIdentifier([
            currencyA,
            currencyB,
            fee,
            tickSpacing,
            hooks,
        ]);
        return { poolId: poolIdentifier, currency0, currency1 };
    }
    getLiquidityFunctionName() {
        return 'getLiquidity';
    }
    getSlot0FunctionName() {
        return 'getSlot0';
    }
    async getPoolsData(poolIds, functionName, providerConfig) {
        const { results, blockNumber } = await (0, async_retry_1.default)(async () => {
            // NOTE: V4 pools are a singleton living under PoolsManager.
            // We have to retrieve the pool data from the state view contract.
            // To begin with, we will be consistent with how v4 subgraph retrieves the pool state - via state view.
            return this.multicall2Provider.callSameFunctionOnContractWithMultipleParams({
                address: util_1.STATE_VIEW_ADDRESSES[this.chainId],
                contractInterface: StateView__factory_1.StateView__factory.createInterface(),
                functionName: functionName,
                functionParams: poolIds.map((poolId) => [poolId]),
                providerConfig,
            });
        }, this.retryOptions);
        util_1.log.debug(`Pool data fetched as of block ${blockNumber}`);
        return results;
    }
    getPoolIdentifier(pool) {
        const [currencyA, currencyB, fee, tickSpacing, hooks] = pool;
        const [currency0, currency1] = sortsBefore(currencyA, currencyB)
            ? [currencyA, currencyB]
            : [currencyB, currencyA];
        const currency0Addr = (0, util_1.getAddress)(currency0);
        const currency1Addr = (0, util_1.getAddress)(currency1);
        const cacheKey = `${this.chainId}/${currency0Addr}/${currency1Addr}/${fee}/${tickSpacing}/${hooks}`;
        const cachedId = this.POOL_ID_CACHE[cacheKey];
        if (cachedId) {
            return { poolIdentifier: cachedId, currency0, currency1 };
        }
        const poolId = v4_sdk_1.Pool.getPoolId(currency0, currency1, fee, tickSpacing, hooks);
        this.POOL_ID_CACHE[cacheKey] = poolId;
        return { poolIdentifier: poolId, currency0, currency1 };
    }
    instantiatePool(pool, slot0, liquidity) {
        const [currency0, currency1, fee, tickSpacing, hooks] = pool;
        return new v4_sdk_1.Pool(currency0, currency1, fee, tickSpacing, hooks, slot0.sqrtPriceX96.toString(), liquidity.toString(), slot0.tick);
    }
    instantiatePoolAccessor(poolIdentifierToPool) {
        return {
            getPool: (currencyA, currencyB, fee, tickSpacing, hooks) => {
                const { poolIdentifier } = this.getPoolIdentifier([
                    currencyA,
                    currencyB,
                    fee,
                    tickSpacing,
                    hooks,
                ]);
                return poolIdentifierToPool[poolIdentifier];
            },
            getPoolById: (poolId) => poolIdentifierToPool[poolId],
            getAllPools: () => Object.values(poolIdentifierToPool),
        };
    }
}
exports.V4PoolProvider = V4PoolProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9vbC1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9wcm92aWRlcnMvdjQvcG9vbC1wcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSw0Q0FBeUQ7QUFDekQsOERBQTZEO0FBRzdELHVGQUFvRjtBQUNwRixxQ0FBbUU7QUFFbkUsb0RBQW9FO0FBMkNwRSw0SEFBNEg7QUFDNUgsU0FBZ0IsV0FBVyxDQUFDLFNBQW1CLEVBQUUsU0FBbUI7SUFDbEUsSUFBSSxTQUFTLENBQUMsUUFBUTtRQUFFLE9BQU8sSUFBSSxDQUFDO0lBQ3BDLElBQUksU0FBUyxDQUFDLFFBQVE7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUNyQyxPQUFPLFNBQVMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMxRCxDQUFDO0FBSkQsa0NBSUM7QUFFRCxTQUFnQixnQkFBZ0IsQ0FDOUIsTUFBZ0IsRUFDaEIsTUFBZ0IsRUFDaEIsWUFBNEI7SUFFNUIsT0FBTyxDQUNMLGFBQUksQ0FBQyxTQUFTLENBQ1osTUFBTyxFQUNQLE1BQU8sRUFDUCx5QkFBZ0IsRUFDaEIsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFDaEMsWUFBWSxDQUFDLEtBQUssQ0FDbkIsQ0FBQyxXQUFXLEVBQUUsS0FBSyxZQUFZLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUNsRCxDQUFDO0FBQ0osQ0FBQztBQWRELDRDQWNDO0FBRUQsTUFBYSxjQUNYLFNBQVEsNEJBTVA7SUFNRDs7Ozs7T0FLRztJQUNILFlBQ0UsT0FBZ0IsRUFDaEIsa0JBQXNDLEVBQ3RDLGVBQW1DO1FBQ2pDLE9BQU8sRUFBRSxDQUFDO1FBQ1YsVUFBVSxFQUFFLEVBQUU7UUFDZCxVQUFVLEVBQUUsR0FBRztLQUNoQjtRQUVELEtBQUssQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxDQUFDLENB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