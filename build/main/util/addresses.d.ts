import { Currency, Token } from '@uniswap/sdk-core';
import { ChainId } from '../globalChainId';
interface ExtendedChainAddresses {
    v3CoreFactoryAddress: string;
    multicallAddress: string;
    quoterAddress: string;
    v3MigratorAddress?: string;
    nonfungiblePositionManagerAddress?: string;
    tickLensAddress?: string;
    swapRouter02Address?: string;
    mixedRouteQuoterV1Address?: string;
    mixedRouteQuoterV2Address?: string;
    v4PoolManagerAddress?: string;
    v4PositionManagerAddress?: string;
    v4StateView?: string;
    v4QuoterAddress?: string;
}
export declare const EXTENDED_CHAIN_TO_ADDRESSES_MAP: Partial<Record<ChainId, ExtendedChainAddresses>>;
export declare const BNB_TICK_LENS_ADDRESS: string | undefined;
export declare const BNB_NONFUNGIBLE_POSITION_MANAGER_ADDRESS: string | undefined;
export declare const BNB_SWAP_ROUTER_02_ADDRESS: string;
export declare const BNB_V3_MIGRATOR_ADDRESS: string | undefined;
export declare const V3_CORE_FACTORY_ADDRESSES: AddressMap;
export declare const QUOTER_V2_ADDRESSES: AddressMap;
export declare const NEW_QUOTER_V2_ADDRESSES: AddressMap;
export declare const PROTOCOL_V4_QUOTER_ADDRESSES: AddressMap;
export declare const MIXED_ROUTE_QUOTER_V1_ADDRESSES: AddressMap;
export declare const MIXED_ROUTE_QUOTER_V2_ADDRESSES: AddressMap;
export declare const UNISWAP_MULTICALL_ADDRESSES: AddressMap;
export declare const SWAP_ROUTER_02_ADDRESSES: (chainId: number) => string;
export declare const STATE_VIEW_ADDRESSES: AddressMap;
export declare const OVM_GASPRICE_ADDRESS = "0x420000000000000000000000000000000000000F";
export declare const ARB_GASINFO_ADDRESS = "0x000000000000000000000000000000000000006C";
export declare const TICK_LENS_ADDRESS: string | undefined;
export declare const NONFUNGIBLE_POSITION_MANAGER_ADDRESS: string | undefined;
export declare const V3_MIGRATOR_ADDRESS: string | undefined;
export declare const MULTICALL2_ADDRESS = "0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696";
export declare type AddressMap = {
    [chainId: number]: string | undefined;
};
export declare function constructSameAddressMap<T extends string>(address: T, additionalNetworks?: ChainId[]): {
    [chainId: number]: T;
};
export declare const WETH9: {
    [chainId in Exclude<ChainId, ChainId.POLYGON | ChainId.POLYGON_MUMBAI | ChainId.CELO | ChainId.CELO_ALFAJORES | ChainId.GNOSIS | ChainId.MOONBEAM | ChainId.BNB | ChainId.AVALANCHE | ChainId.MONAD_TESTNET | ChainId.ROOTSTOCK | ChainId.TRON | ChainId.ZORA_SEPOLIA>]: Token;
};
export declare const BEACON_CHAIN_DEPOSIT_ADDRESS = "0x00000000219ab540356cBB839Cbe05303d7705Fa";
export declare function getAddressLowerCase(currency: Currency): string;
export declare function getAddress(currency: Currency): string;
export {};
