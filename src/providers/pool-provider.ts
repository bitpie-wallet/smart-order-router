import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { Currency } from '@uniswap/sdk-core';
import { Pool as V3Pool } from '@uniswap/v3-sdk';
import { Pool as V4Pool } from '@uniswap/v4-sdk';
import { Options as RetryOptions } from 'async-retry';
import _ from 'lodash';

import { ChainId } from '../globalChainId';
import { IUniswapV3PoolState__factory } from '../types/v3/factories/IUniswapV3PoolState__factory';
import { log, poolToString } from '../util';

import { IMulticallProvider, Result } from './multicall-provider';
import { ProviderConfig } from './provider';

export type PoolConstruct<TCurrency extends Currency> = [
  TCurrency,
  TCurrency,
  ...Array<string | number>
];
export type Pool = V3Pool | V4Pool;

export type ISlot0 = {
  sqrtPriceX96: BigNumber;
  tick: number;
};

export type ILiquidity = { liquidity: BigNumber };

export abstract class PoolProvider<
  TCurrency extends Currency,
  TPoolConstruct extends PoolConstruct<TCurrency>,
  TISlot0 extends ISlot0,
  TILiquidity extends ILiquidity,
  TPoolAccessor
  > {
  /**
   * Creates an instance of V4PoolProvider.
   * @param chainId The chain id to use.
   * @param multicall2Provider The multicall provider to use to get the pools.
   * @param retryOptions The retry options for each call to the multicall.
   */
  constructor(
    protected chainId: ChainId,
    protected multicall2Provider: IMulticallProvider,
    protected retryOptions: RetryOptions = {
      retries: 2,
      minTimeout: 50,
      maxTimeout: 500,
    }
  ) { }

  protected async getPoolsInternal(
    poolConstructs: TPoolConstruct[],
    providerConfig?: ProviderConfig
  ): Promise<TPoolAccessor> {
    const poolIdentifierSet: Set<string> = new Set<string>();
    const sortedCurrencyPairs: Array<TPoolConstruct> = [];
    const sortedPoolIdentifiers: string[] = [];

    for (const poolConstruct of poolConstructs) {
      const {
        poolIdentifier: poolIdentifier,
        currency0,
        currency1,
      } = this.getPoolIdentifier(poolConstruct);

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

    log.debug(
      `getPools called with ${poolConstructs.length} token pairs. Deduped down to ${poolIdentifierSet.size}`
    );

    let slot0Results: Result<ISlot0>[];
    let liquidityResults: Result<[ILiquidity]>[];

    if (this.chainId === ChainId.TRON) {
      [slot0Results, liquidityResults] = await Promise.all([
        this.getPoolsDataWithIndividualCalls<ISlot0>(sortedPoolIdentifiers, this.getSlot0FunctionName(), providerConfig),
        this.getPoolsDataWithIndividualCalls<[ILiquidity]>(sortedPoolIdentifiers, this.getLiquidityFunctionName(), providerConfig),
      ]);
    } else {
      [slot0Results, liquidityResults] = await Promise.all([
        this.getPoolsData<TISlot0>(
          sortedPoolIdentifiers,
          this.getSlot0FunctionName(),
          providerConfig
        ),
        this.getPoolsData<[TILiquidity]>(
          sortedPoolIdentifiers,
          this.getLiquidityFunctionName(),
          providerConfig
        ),
      ]);
    }



    log.info(
      `Got liquidity and slot0s for ${poolIdentifierSet.size} pools ${providerConfig?.blockNumber
        ? `as of block: ${providerConfig?.blockNumber}.`
        : ``
      }`
    );

    const poolIdentifierToPool: { [poolIdentifier: string]: Pool } = {};

    const invalidPools: TPoolConstruct[] = [];

    for (let i = 0; i < sortedPoolIdentifiers.length; i++) {
      const slot0Result = slot0Results[i];
      const liquidityResult = liquidityResults[i];

      // These properties tell us if a pool is valid and initialized or not.
      if (
        !slot0Result?.success ||
        !liquidityResult?.success ||
        slot0Result.result.sqrtPriceX96.eq(0)
      ) {
        invalidPools.push(sortedCurrencyPairs[i]!);

        continue;
      }

      const slot0 = slot0Result.result;
      const liquidity = liquidityResult.result[0];

      const pool = this.instantiatePool(
        sortedCurrencyPairs[i]!,
        slot0 as unknown as TISlot0,
        liquidity as unknown as TILiquidity
      );

      const poolIdentifier = sortedPoolIdentifiers[i]!;
      poolIdentifierToPool[poolIdentifier] = pool;
    }

    const poolStrs = _.map(Object.values(poolIdentifierToPool), poolToString);

    log.debug({ poolStrs }, `Found ${poolStrs.length} valid pools`);

    return this.instantiatePoolAccessor(poolIdentifierToPool);
  }

  protected abstract getLiquidityFunctionName(): string;

  protected abstract getSlot0FunctionName(): string;

  protected abstract getPoolsData<TReturn>(
    poolIdentifiers: string[],
    functionName: string,
    providerConfig?: ProviderConfig
  ): Promise<Result<TReturn>[]>;

  protected abstract getPoolIdentifier(pool: TPoolConstruct): {
    poolIdentifier: string;
    currency0: TCurrency;
    currency1: TCurrency;
  };

  protected abstract instantiatePool(
    pool: TPoolConstruct,
    slot0: TISlot0,
    liquidity: TILiquidity
  ): Pool;

  protected abstract instantiatePoolAccessor(poolIdentifierToPool: {
    [poolId: string]: Pool;
  }): TPoolAccessor;

  private async getPoolsDataWithIndividualCalls<TReturn>(
    poolAddresses: string[],
    functionName: string,
    providerConfig?: ProviderConfig
  ): Promise<Result<TReturn>[]> {
    log.info(`Using individual calls for Tron chain due to missing Multicall contract`);

    const contractInterface = IUniswapV3PoolState__factory.createInterface();
    const blockNumber = providerConfig?.blockNumber ? BigNumber.from(await providerConfig.blockNumber) : undefined;
    const results: Result<TReturn>[] = [];

    // 获取 provider
    const provider = (this.multicall2Provider as any).provider;
    if (!provider) {
      log.warn(`No provider available for individual calls on Tron`);
      return poolAddresses.map(() => ({ success: false, returnData: '0x' }));
    }

    for (const poolAddress of poolAddresses) {
      try {
        const callData = contractInterface.encodeFunctionData(functionName as any);

        const result = await this.makeIndividualCall<TReturn>(
          provider,
          poolAddress,
          callData,
          contractInterface,
          functionName,
          blockNumber
        );

        results.push(result);
      } catch (error) {
        log.warn(`Failed to get pool data for ${poolAddress}:`, error);
        results.push({ success: false, returnData: '0x' });
      }
    }

    log.debug(`Pool data fetched using individual calls for ${results.length} pools`);
    return results;
  }


  private async makeIndividualCall<T>(
    provider: any,
    address: string,
    callData: string,
    contractInterface: Interface,
    functionName: string,
    blockNumber?: BigNumber
  ): Promise<Result<T>> {
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
        result: decoded as unknown as T,
      };
    } catch (error) {
      return {
        success: false,
        returnData: '0x',
      };
    }
  }
}
