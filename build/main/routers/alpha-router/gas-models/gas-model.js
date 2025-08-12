"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuoteThroughNativePool = exports.IOnChainGasModelFactory = exports.IV2GasModelFactory = exports.usdGasTokensByChain = void 0;
const globalChainId_1 = require("../../../globalChainId");
const token_provider_1 = require("../../../providers/token-provider");
const util_1 = require("../../../util");
// When adding new usd gas tokens, ensure the tokens are ordered
// from tokens with highest decimals to lowest decimals. For example,
// DAI_AVAX has 18 decimals and comes before USDC_AVAX which has 6 decimals.
exports.usdGasTokensByChain = {
    [globalChainId_1.ChainId.MAINNET]: [token_provider_1.DAI_MAINNET, token_provider_1.USDC_MAINNET, token_provider_1.USDT_MAINNET],
    [globalChainId_1.ChainId.ARBITRUM_ONE]: [
        token_provider_1.DAI_ARBITRUM,
        token_provider_1.USDC_ARBITRUM,
        token_provider_1.USDC_NATIVE_ARBITRUM,
        token_provider_1.USDT_ARBITRUM,
    ],
    [globalChainId_1.ChainId.OPTIMISM]: [
        token_provider_1.DAI_OPTIMISM,
        token_provider_1.USDC_OPTIMISM,
        token_provider_1.USDC_NATIVE_OPTIMISM,
        token_provider_1.USDT_OPTIMISM,
    ],
    [globalChainId_1.ChainId.OPTIMISM_GOERLI]: [
        token_provider_1.DAI_OPTIMISM_GOERLI,
        token_provider_1.USDC_OPTIMISM_GOERLI,
        token_provider_1.USDT_OPTIMISM_GOERLI,
    ],
    [globalChainId_1.ChainId.OPTIMISM_SEPOLIA]: [
        token_provider_1.DAI_OPTIMISM_SEPOLIA,
        token_provider_1.USDC_OPTIMISM_SEPOLIA,
        token_provider_1.USDT_OPTIMISM_SEPOLIA,
    ],
    [globalChainId_1.ChainId.ARBITRUM_GOERLI]: [token_provider_1.USDC_ARBITRUM_GOERLI],
    [globalChainId_1.ChainId.ARBITRUM_SEPOLIA]: [token_provider_1.USDC_ARBITRUM_SEPOLIA],
    [globalChainId_1.ChainId.GOERLI]: [token_provider_1.DAI_GOERLI, token_provider_1.USDC_GOERLI, token_provider_1.USDT_GOERLI, token_provider_1.WBTC_GOERLI],
    [globalChainId_1.ChainId.SEPOLIA]: [token_provider_1.USDC_SEPOLIA, token_provider_1.DAI_SEPOLIA],
    [globalChainId_1.ChainId.POLYGON]: [token_provider_1.USDC_POLYGON, token_provider_1.USDC_NATIVE_POLYGON],
    [globalChainId_1.ChainId.POLYGON_MUMBAI]: [token_provider_1.DAI_POLYGON_MUMBAI],
    [globalChainId_1.ChainId.CELO]: [token_provider_1.CUSD_CELO, token_provider_1.USDC_CELO, token_provider_1.USDC_NATIVE_CELO, token_provider_1.USDC_WORMHOLE_CELO],
    [globalChainId_1.ChainId.CELO_ALFAJORES]: [token_provider_1.CUSD_CELO_ALFAJORES],
    [globalChainId_1.ChainId.GNOSIS]: [token_provider_1.USDC_ETHEREUM_GNOSIS],
    [globalChainId_1.ChainId.MOONBEAM]: [token_provider_1.USDC_MOONBEAM],
    [globalChainId_1.ChainId.BNB]: [token_provider_1.USDT_BNB, token_provider_1.USDC_BNB, token_provider_1.DAI_BNB],
    [globalChainId_1.ChainId.AVALANCHE]: [
        token_provider_1.DAI_AVAX,
        token_provider_1.USDC_AVAX,
        token_provider_1.USDC_NATIVE_AVAX,
        token_provider_1.USDC_BRIDGED_AVAX,
    ],
    [globalChainId_1.ChainId.BASE]: [token_provider_1.USDC_BASE, token_provider_1.USDC_NATIVE_BASE],
    [globalChainId_1.ChainId.BLAST]: [token_provider_1.USDB_BLAST],
    [globalChainId_1.ChainId.ZORA]: [token_provider_1.USDC_ZORA],
    [globalChainId_1.ChainId.ZKSYNC]: [token_provider_1.DAI_ZKSYNC, token_provider_1.USDCE_ZKSYNC, token_provider_1.USDC_ZKSYNC],
    [globalChainId_1.ChainId.WORLDCHAIN]: [token_provider_1.USDC_WORLDCHAIN],
    [globalChainId_1.ChainId.UNICHAIN_SEPOLIA]: [token_provider_1.USDC_UNICHAIN_SEPOLIA],
    [globalChainId_1.ChainId.MONAD_TESTNET]: [token_provider_1.USDT_MONAD_TESTNET],
    [globalChainId_1.ChainId.BASE_SEPOLIA]: [token_provider_1.USDC_BASE_SEPOLIA],
    [globalChainId_1.ChainId.UNICHAIN]: [token_provider_1.DAI_UNICHAIN, token_provider_1.USDC_UNICHAIN],
    [globalChainId_1.ChainId.SONEIUM]: [token_provider_1.USDC_SONEIUM],
    [globalChainId_1.ChainId.TRON]: [token_provider_1.USDT_BASE_TRON],
};
/**
 * Factory for building gas models that can be used with any route to generate
 * gas estimates.
 *
 * Factory model is used so that any supporting data can be fetched once and
 * returned as part of the model.
 *
 * @export
 * @abstract
 * @class IV2GasModelFactory
 */
class IV2GasModelFactory {
}
exports.IV2GasModelFactory = IV2GasModelFactory;
/**
 * Factory for building gas models that can be used with any route to generate
 * gas estimates.
 *
 * Factory model is used so that any supporting data can be fetched once and
 * returned as part of the model.
 *
 * @export
 * @abstract
 * @class IOnChainGasModelFactory
 */
class IOnChainGasModelFactory {
    totalInitializedTicksCrossed(initializedTicksCrossedList) {
        let ticksCrossed = 0;
        for (let i = 0; i < initializedTicksCrossedList.length; i++) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            if (initializedTicksCrossedList[i] > 0) {
                // Quoter returns Array<number of calls to crossTick + 1>, so we need to subtract 1 here.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                ticksCrossed += initializedTicksCrossedList[i] - 1;
            }
        }
        return ticksCrossed;
    }
}
exports.IOnChainGasModelFactory = IOnChainGasModelFactory;
// Determines if native currency is token0
// Gets the native price of the pool, dependent on 0 or 1
// quotes across the pool
const getQuoteThroughNativePool = (chainId, nativeTokenAmount, nativeTokenPool) => {
    const nativeCurrency = util_1.WRAPPED_NATIVE_CURRENCY[chainId];
    const isToken0 = nativeTokenPool.token0.equals(nativeCurrency);
    // returns mid price in terms of the native currency (the ratio of token/nativeToken)
    const nativeTokenPrice = isToken0
        ? nativeTokenPool.token0Price
        : nativeTokenPool.token1Price;
    // return gas cost in terms of the non native currency
    return nativeTokenPrice.quote(nativeTokenAmount);
};
exports.getQuoteThroughNativePool = getQuoteThroughNativePool;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FzLW1vZGVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3JvdXRlcnMvYWxwaGEtcm91dGVyL2dhcy1tb2RlbHMvZ2FzLW1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQVFBLDBEQUFpRDtBQUVqRCxzRUEwRDJDO0FBTTNDLHdDQUF3RDtBQVV4RCxnRUFBZ0U7QUFDaEUscUVBQXFFO0FBQ3JFLDRFQUE0RTtBQUMvRCxRQUFBLG1CQUFtQixHQUF1QztJQUNyRSxDQUFDLHVCQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyw0QkFBVyxFQUFFLDZCQUFZLEVBQUUsNkJBQVksQ0FBQztJQUM1RCxDQUFDLHVCQUFPLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDdEIsNkJBQVk7UUFDWiw4QkFBYTtRQUNiLHFDQUFvQjtRQUNwQiw4QkFBYTtLQUNkO0lBQ0QsQ0FBQyx1QkFBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQ2xCLDZCQUFZO1FBQ1osOEJBQWE7UUFDYixxQ0FBb0I7UUFDcEIsOEJBQWE7S0FDZDtJQUNELENBQUMsdUJBQU8sQ0FBQyxlQUFlLENBQUMsRUFBRTtRQUN6QixvQ0FBbUI7UUFDbkIscUNBQW9CO1FBQ3BCLHFDQUFvQjtLQUNyQjtJQUNELENBQUMsdUJBQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1FBQzFCLHFDQUFvQjtRQUNwQixzQ0FBcUI7UUFDckIsc0NBQXFCO0tBQ3RCO0lBQ0QsQ0FBQyx1QkFBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMscUNBQW9CLENBQUM7SUFDakQsQ0FBQyx1QkFBTyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxzQ0FBcUIsQ0FBQztJQUNuRCxDQUFDLHVCQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQywyQkFBVSxFQUFFLDRCQUFXLEVBQUUsNEJBQVcsRUFBRSw0QkFBVyxDQUFDO0lBQ3JFLENBQUMsdUJBQU8sQ0FBQyxPQUFPLENBQUMs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