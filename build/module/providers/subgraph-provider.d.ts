import { Protocol } from '@uniswap/router-sdk';
import { Currency, Token } from '@uniswap/sdk-core';
import { SubgraphPool } from '../routers/alpha-router/functions/get-candidate-pools';
import { ProviderConfig } from './provider';
import { ChainId } from '../globalChainId';
export interface ISubgraphProvider<TSubgraphPool extends SubgraphPool> {
    getPools(tokenIn?: Token, tokenOut?: Token, providerConfig?: ProviderConfig): Promise<TSubgraphPool[]>;
}
export declare const PAGE_SIZE = 1000;
export declare type V3V4SubgraphPool = {
    id: string;
    feeTier: string;
    liquidity: string;
    token0: {
        id: string;
    };
    token1: {
        id: string;
    };
    tvlETH: number;
    tvlUSD: number;
};
export declare type V3V4RawSubgraphPool = {
    id: string;
    feeTier: string;
    liquidity: string;
    token0: {
        symbol: string;
        id: string;
    };
    token1: {
        symbol: string;
        id: string;
    };
    totalValueLockedUSD: string;
    totalValueLockedETH: string;
    totalValueLockedUSDUntracked: string;
};
export declare abstract class SubgraphProvider<TRawSubgraphPool extends V3V4RawSubgraphPool, TSubgraphPool extends V3V4SubgraphPool> {
    private protocol;
    private chainId;
    private retries;
    private timeout;
    private rollback;
    private trackedEthThreshold;
    private untrackedUsdThreshold;
    private subgraphUrl?;
    private bearerToken?;
    private client;
    constructor(protocol: Protocol, chainId: ChainId, retries?: number, timeout?: number, rollback?: boolean, trackedEthThreshold?: number, untrackedUsdThreshold?: number, subgraphUrl?: string | undefined, bearerToken?: string | undefined);
    getPools(_currencyIn?: Currency, _currencyOut?: Currency, providerConfig?: ProviderConfig): Promise<TSubgraphPool[]>;
    protected abstract mapSubgraphPool(rawSubgraphPool: TRawSubgraphPool): TSubgraphPool;
    protected getPoolFields(): string;
}
