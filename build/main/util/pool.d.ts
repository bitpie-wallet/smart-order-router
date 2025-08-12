import { Pool as V4Pool } from '@uniswap/v4-sdk';
import { ChainId } from '../globalChainId';
export declare const V4_ETH_WETH_FAKE_POOL: {
    [chainId in ChainId]: V4Pool;
};
