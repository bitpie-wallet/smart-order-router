import { TradeType, } from '@uniswap/sdk-core';
import { CacheMode } from './model';
/**
 * Abstract class for a RouteCachingProvider.
 * Defines the base methods of how to interact with this interface, but not the implementation of how to cache.
 */
export class IRouteCachingProvider {
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
            if ((await this.getCacheMode(chainId, amount, quoteCurrency, tradeType, protocols)) == CacheMode.Darkmode) {
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
                CacheMode.Darkmode) {
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
        const quoteCurrency = cachedRoutes.tradeType == TradeType.EXACT_INPUT
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUtY2FjaGluZy1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9wcm92aWRlcnMvY2FjaGluZy9yb3V0ZS9yb3V0ZS1jYWNoaW5nLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU9BLE9BQU8sRUFHTCxTQUFTLEdBQ1YsTUFBTSxtQkFBbUIsQ0FBQztBQU0zQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBR3BDOzs7R0FHRztBQUNILE1BQU0sT0FBZ0IscUJBQXFCO0lBQTNDO1FBQ0U7Ozs7Ozs7Ozs7Ozs7O1dBY0c7UUFDYSxtQkFBYyxHQUFHLEtBQUs7UUFDcEMsK0VBQStFO1FBQy9FLE9BQWUsRUFDZixNQUFnQyxFQUNoQyxhQUF1QixFQUN2QixTQUFvQixFQUNwQixTQUFxQixFQUNyQixXQUFtQixFQUNuQixVQUFVLEdBQUcsS0FBSyxFQUNsQixpQkFBcUMsRUFDckMsV0FBeUIsRUFDVSxFQUFFO1lBQ3JDLElBQ0UsQ0FBQyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQ3RCLE9BQU8sRUFDUCxNQUFNLEVBQ04sYUFBYSxFQUNiLFNBQVMsRUFDVCxTQUFTLENBQ1YsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQ3hCO2dCQUNBLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUQsTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUM1QyxPQUFPLEVBQ1AsTUFBTSxFQUNOLGFBQWEsRUFDYixTQUFTLEVBQ1QsU0FBUyxFQUNULFdBQVcsRUFDWCxVQUFVLEVBQ1YsaUJBQWlCLEVBQ2pCLFdBQVcsQ0FDWixDQUFDO1lBRUYsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM5RSxDQUFDLENBQUM7UUFFRjs7Ozs7Ozs7V0FRRztRQUNhLG1CQUFjLEdBQUcsS0FBSztRQUNwQywrRUFBK0U7UUFDL0UsWUFBMEIsRUFDMUIsTUFBZ0MsRUFDZCxFQUFFO1lBQ3BCLElBQ0UsQ0FBQyxNQUFNLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQy9ELFNBQVMsQ0FBQyxRQUFRLEVBQ2xCO2dCQUNBLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFFRCxZQUFZLENBQUMsWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUNyRCxZQUFZLEVBQ1osTUFBTSxDQUNQLENBQUM7WUFFRixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FBQztRQUVGOzs7Ozs7O1dBT0c7UUFDYSxzQkFBaUIsR0FBRyxLQUFLLEVBQ3ZDLFlBQTBCLEVBQ1IsRUFBRTtZQUNwQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMvQyxDQUFDLENBQUM7SUFrSEosQ0FBQztJQWhIQzs7Ozs7T0FLRztJQUNJLDRCQUE0QixDQUNqQyxZQUEwQixFQUMxQixNQUFnQztRQUVoQyxNQUFNLGFBQWEsR0FDakIsWUFBWSxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsV0FBVztZQUM3QyxDQUFDLENBQUMsWUFBWSxDQUFDLFdBQVc7WUFDMUIsQ0FBQyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUM7UUFFOUIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUN0QixZQUFZLENBQUMsT0FBTyxFQUNwQixNQUFNLEVBQ04sYUFBYSxFQUNiLFlBQVksQ0FBQyxTQUFTLEVBQ3RCLFlBQVksQ0FBQyxnQkFBZ0IsQ0FDOUIsQ0FBQztJQUNKLENBQUM7SUFtQlMseUJBQXlCLENBQ2pDLFlBQXNDLEVBQ3RDLFdBQW1CLEVBQ25CLFVBQW1CO1FBRW5CLE9BQU8sQ0FBQSxZQUFZLGFBQVosWUFBWSx1QkFBWixZQUFZLENBQUUsVUFBVSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUM7WUFDdEQsQ0FBQyxDQUFDLFlBQVk7WUFDZCxDQUFDLENBQUMsU0FBUyxDQUFDO0lBQ2hCLENBQUM7Q0ErREYifQ==