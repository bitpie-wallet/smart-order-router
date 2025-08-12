/**
 * Provider for getting currency data from a currency List.
 *
 * @export
 * @interface IRouteCachingProvider
 */
import { Protocol } from '@uniswap/router-sdk';
import { Currency, CurrencyAmount, TradeType } from '@uniswap/sdk-core';
import { ChainId } from '../../../globalChainId';
import { AlphaRouterConfig } from '../../../routers';
import { SwapOptions } from '../../../routers/router';
import { CacheMode } from './model';
import { CachedRoutes } from './model/cached-routes';
/**
 * Abstract class for a RouteCachingProvider.
 * Defines the base methods of how to interact with this interface, but not the implementation of how to cache.
 */
export declare abstract class IRouteCachingProvider {
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
    readonly getCachedRoute: (chainId: number, amount: CurrencyAmount<Currency>, quoteCurrency: Currency, tradeType: TradeType, protocols: Protocol[], blockNumber: number, optimistic?: boolean, alphaRouterConfig?: AlphaRouterConfig, swapOptions?: SwapOptions) => Promise<CachedRoutes | undefined>;
    /**
     * Final implementation of the public `setCachedRoute` method.
     * This method will set the blockToLive in the CachedRoutes object before calling the internal method to insert in cache.
     *
     * @public
     * @readonly
     * @param cachedRoutes The route to cache.
     * @returns Promise<boolean> Indicates if the route was inserted into cache.
     */
    readonly setCachedRoute: (cachedRoutes: CachedRoutes, amount: CurrencyAmount<Currency>) => Promise<boolean>;
    /**
     * Final implementation of the public `deleteCachedRoute` method.
     * This method will delete the cached route from the cache.
     *
     * @public
     * @readonly
     * @param cachedRoutes the cached routes to delete
     */
    readonly deleteCachedRoute: (cachedRoutes: CachedRoutes) => Promise<boolean>;
    /**
     * Returns the CacheMode for the given cachedRoutes and amount
     *
     * @param cachedRoutes
     * @param amount
     */
    getCacheModeFromCachedRoutes(cachedRoutes: CachedRoutes, amount: CurrencyAmount<Currency>): Promise<CacheMode>;
    /**
     * Returns the CacheMode for the given combination of chainId, currencyIn, currencyOut and tradetype
     *
     * @public
     * @abstract
     * @param chainId
     * @param amount
     * @param tradeType
     */
    abstract getCacheMode(chainId: ChainId, amount: CurrencyAmount<Currency>, quoteCurrency: Currency, tradeType: TradeType, protocols: Protocol[]): Promise<CacheMode>;
    protected filterExpiredCachedRoutes(cachedRoutes: CachedRoutes | undefined, blockNumber: number, optimistic: boolean): CachedRoutes | undefined;
    /**
     * Internal function to fetch the CachedRoute from the cache.
     * Must be implemented.
     *
     * @param chainId
     * @param amount
     * @param quoteCurrency
     * @param tradeType
     * @param protocols
     * @param currentBlockNumber
     * @param optimistic
     * @param alphaRouterConfig
     * @param swapOptions
     * @protected
     */
    protected abstract _getCachedRoute(chainId: ChainId, amount: CurrencyAmount<Currency>, quoteCurrency: Currency, tradeType: TradeType, protocols: Protocol[], currentBlockNumber: number, optimistic: boolean, alphaRouterConfig?: AlphaRouterConfig, swapOptions?: SwapOptions): Promise<CachedRoutes | undefined>;
    /**
     * Internal function to insert the CachedRoute into cache.
     * Must be implemented.
     *
     * @param cachedRoutes
     * @param amount
     * @protected
     */
    protected abstract _setCachedRoute(cachedRoutes: CachedRoutes, amount: CurrencyAmount<Currency>): Promise<boolean>;
    /**
     * Internal function to getBlocksToLive for a given cachedRoute.
     * This function is called before attempting to insert the route into cache.
     * Must be implemented.
     *
     * @param cachedRoutes
     * @param amount
     * @protected
     */
    protected abstract _getBlocksToLive(cachedRoutes: CachedRoutes, amount: CurrencyAmount<Currency>): Promise<number>;
    /**
     * Removes or invalidates a cached route from the cache.
     * Must be implemented by subclasses.
     */
    protected abstract _deleteCachedRoute(cachedRoutes: CachedRoutes): Promise<boolean>;
}
