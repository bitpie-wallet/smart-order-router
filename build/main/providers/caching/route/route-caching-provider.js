"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IRouteCachingProvider = void 0;
const sdk_core_1 = require("@uniswap/sdk-core");
const model_1 = require("./model");
/**
 * Abstract class for a RouteCachingProvider.
 * Defines the base methods of how to interact with this interface, but not the implementation of how to cache.
 */
class IRouteCachingProvider {
    constructor() {
        /**
         * Final implementation of the public `getCachedRoute` method, this is how code will interact with the implementation
         *
         * @public
         * @readonly
         * @param chainId
         * @param amount
         * @param quoteCurrency
         * @param tradeType
         * @param protocols
         * @param blockNumber
         * @param optimistic
         * @param alphaRouterConfig
         * @param swapOptions
         */
        this.getCachedRoute = async (
        // Defined as a readonly member instead of a regular function to make it final.
        chainId, amount, quoteCurrency, tradeType, protocols, blockNumber, optimistic = false, alphaRouterConfig, swapOptions) => {
            if ((await this.getCacheMode(chainId, amount, quoteCurrency, tradeType, protocols)) == model_1.CacheMode.Darkmode) {
                return undefined;
            }
            const cachedRoute = await this._getCachedRoute(chainId, amount, quoteCurrency, tradeType, protocols, blockNumber, optimistic, alphaRouterConfig, swapOptions);
            return this.filterExpiredCachedRoutes(cachedRoute, blockNumber, optimistic);
        };
        /**
         * Final implementation of the public `setCachedRoute` method.
         * This method will set the blockToLive in the CachedRoutes object before calling the internal method to insert in cache.
         *
         * @public
         * @readonly
         * @param cachedRoutes The route to cache.
         * @returns Promise<boolean> Indicates if the route was inserted into cache.
         */
        this.setCachedRoute = async (
        // Defined as a readonly member instead of a regular function to make it final.
        cachedRoutes, amount) => {
            if ((await this.getCacheModeFromCachedRoutes(cachedRoutes, amount)) ==
                model_1.CacheMode.Darkmode) {
                return false;
            }
            cachedRoutes.blocksToLive = await this._getBlocksToLive(cachedRoutes, amount);
            return this._setCachedRoute(cachedRoutes, amount);
        };
        /**
         * Final implementation of the public `deleteCachedRoute` method.
         * This method will delete the cached route from the cache.
         *
         * @public
         * @readonly
         * @param cachedRoutes the cached routes to delete
         */
        this.deleteCachedRoute = async (cachedRoutes) => {
            return this._deleteCachedRoute(cachedRoutes);
        };
    }
    /**
     * Returns the CacheMode for the given cachedRoutes and amount
     *
     * @param cachedRoutes
     * @param amount
     */
    getCacheModeFromCachedRoutes(cachedRoutes, amount) {
        const quoteCurrency = cachedRoutes.tradeType == sdk_core_1.TradeType.EXACT_INPUT
            ? cachedRoutes.currencyOut
            : cachedRoutes.currencyIn;
        return this.getCacheMode(cachedRoutes.chainId, amount, quoteCurrency, cachedRoutes.tradeType, cachedRoutes.protocolsCovered);
    }
    filterExpiredCachedRoutes(cachedRoutes, blockNumber, optimistic) {
        return (cachedRoutes === null || cachedRoutes === void 0 ? void 0 : cachedRoutes.notExpired(blockNumber, optimistic))
            ? cachedRoutes
            : undefined;
    }
}
exports.IRouteCachingProvider = IRouteCachingProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUtY2FjaGluZy1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9wcm92aWRlcnMvY2FjaGluZy9yb3V0ZS9yb3V0ZS1jYWNoaW5nLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQU9BLGdEQUkyQjtBQU0zQixtQ0FBb0M7QUFHcEM7OztHQUdHO0FBQ0gsTUFBc0IscUJBQXFCO0lBQTNDO1FBQ0U7Ozs7Ozs7Ozs7Ozs7O1dBY0c7UUFDYSxtQkFBYyxHQUFHLEtBQUs7UUFDcEMsK0VBQStFO1FBQy9FLE9BQWUsRUFDZixNQUFnQyxFQUNoQyxhQUF1QixFQUN2QixTQUFvQixFQUNwQixTQUFxQixFQUNyQixXQUFtQixFQUNuQixVQUFVLEdBQUcsS0FBSyxFQUNsQixpQkFBcUMsRUFDckMsV0FBeUIsRUFDVSxFQUFFO1lBQ3JDLElBQ0UsQ0FBQyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQ3RCLE9BQU8sRUFDUCxNQUFNLEVBQ04sYUFBYSxFQUNiLFNBQVMsRUFDVCxTQUFTLENBQ1YsQ0FBQyxJQUFJLGlCQUFTLENBQUMsUUFBUSxFQUN4QjtnQkFDQSxPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUVELE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FDNUMsT0FBTyxFQUNQLE1BQU0sRUFDTixhQUFhLEVBQ2IsU0FBUyxFQUNULFNBQVMsRUFDVCxXQUFXLEVBQ1gsVUFBVSxFQUNWLGlCQUFpQixFQUNqQixXQUFXLENBQ1osQ0FBQztZQUVGLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDOUUsQ0FBQyxDQUFDO1FBRUY7Ozs7Ozs7O1dBUUc7UUFDYSxtQkFBYyxHQUFHLEtBQUs7UUFDcEMsK0VBQStFO1FBQy9FLFlBQTBCLEVBQzFCLE1BQWdDLEVBQ2QsRUFBRTtZQUNwQixJQUNFLENBQUMsTUFBTSxJQUFJLENBQUMsNEJBQTRCLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUMvRCxpQkFBUyxDQUFDLFFBQVEsRUFDbEI7Z0JBQ0EsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUVELFlBQVksQ0FBQyxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQ3JELFlBQVksRUFDWixNQUFNLENBQ1AsQ0FBQztZQUVGLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDcEQsQ0FBQyxDQUFDO1FBRUY7Ozs7Ozs7V0FPRztRQUNhLHNCQUFpQixHQUFHLEtBQUssRUFDdkMsWUFBMEIsRUFDUixFQUFFO1lBQ3BCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9DLENBQUMsQ0FBQztJQWtISixDQUFDO0lBaEhDOzs7OztPQUtHO0lBQ0ksNEJBQTRCLENBQ2pDLFlBQTBCLEVBQzFCLE1BQWdDO1FBRWhDLE1BQU0sYUFBYSxHQUNqQixZQUFZLENBQUMsU0FBUyxJQUFJLG9CQUFTLENBQUMsV0FBVztZQUM3QyxDQUFDLENBQUMsWUFBWSxDQUFDLFdBQVc7WUFDMUIsQ0FBQyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUM7UUFFOUIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUN0QixZQUFZLENBQUMsT0FBTyxFQUNwQixNQUFNLEVBQ04sYUFBYSxFQUNiLFlBQVksQ0FBQyxTQUFTLEVBQ3RCLFlBQVksQ0FBQyxnQkFBZ0IsQ0FDOUIsQ0FBQztJQUNKLENBQUM7SUFtQlMseUJBQXlCLENBQ2pDLFlBQXNDLEVBQ3RDLFdBQW1CLEVBQ25CLFVBQW1CO1FBRW5CLE9BQU8sQ0FBQSxZQUFZLGFBQVosWUFBWSx1QkFBWixZQUFZLENBQUUsVUFBVSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUM7WUFDdEQsQ0FBQyxDQUFDLFlBQVk7WUFDZCxDQUFDLENBQUMsU0FBUyxDQUFDO0lBQ2hCLENBQUM7Q0ErREY7QUFsTkQsc0RBa05DIn0=