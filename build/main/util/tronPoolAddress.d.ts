import { Token } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';
export declare function computeTronPoolAddress({ factoryAddress, tokenA, tokenB, fee, }: {
    factoryAddress: string;
    tokenA: Token;
    tokenB: Token;
    fee: FeeAmount;
}): string;
