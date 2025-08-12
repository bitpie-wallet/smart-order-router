import { ChainId } from '../../globalChainId';
import { ProviderConfig } from '../provider';
import { V4SubgraphPool } from './subgraph-provider';
export interface EulerSwapHooks {
    id: string;
    hook: string;
    asset0: string;
    asset1: string;
    eulerAccount: string;
}
export interface ISubgraphProvider {
    getHooks(providerConfig?: ProviderConfig): Promise<EulerSwapHooks[]>;
    getPoolByHook(hook: string, providerConfig?: ProviderConfig): Promise<V4SubgraphPool | undefined>;
}
export declare class EulerSwapHooksSubgraphProvider implements ISubgraphProvider {
    private chainId;
    private retries;
    private timeout;
    private rollback;
    private client;
    private protocol;
    constructor(chainId: ChainId, retries?: number, timeout?: number, rollback?: boolean, subgraphUrlOverride?: string | undefined);
    getHooks(providerConfig?: ProviderConfig): Promise<EulerSwapHooks[]>;
    getPoolByHook(hook: string, providerConfig?: ProviderConfig): Promise<V4SubgraphPool | undefined>;
}
