import { defaultAbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/keccak256';
import { pack } from '@ethersproject/solidity';
import { Token } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';

const TRON_POOL_INIT_CODE_HASH = '0xba928a717d71946d75999ef1adef801a79cd34a20efecea8b2876b85f5f49580';

export function computeTronPoolAddress({
  factoryAddress,
  tokenA,
  tokenB,
  fee,
}: {
  factoryAddress: string;
  tokenA: Token;
  tokenB: Token;
  fee: FeeAmount;
}): string {
  const [token0, token1] = tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
    ? [tokenA.address, tokenB.address]
    : [tokenB.address, tokenA.address];

  const poolKeyHash = keccak256(
    defaultAbiCoder.encode(
      ['address', 'address', 'uint24'],
      [token0, token1, fee]
    )
  );

  const packedData = pack(
    ['bytes1', 'address', 'bytes32', 'bytes32'],
    ['0x41', factoryAddress, poolKeyHash, TRON_POOL_INIT_CODE_HASH]
  );

  const fullHash = keccak256(packedData);
  const poolAddress = '0x' + fullHash.slice(-40);

  return poolAddress;
}