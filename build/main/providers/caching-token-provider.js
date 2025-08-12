"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachingTokenProviderWithFallback = exports.CACHE_SEED_TOKENS = void 0;
const sdk_core_1 = require("@uniswap/sdk-core");
const lodash_1 = __importDefault(require("lodash"));
const globalChainId_1 = require("../globalChainId");
const util_1 = require("../util");
const token_provider_1 = require("./token-provider");
// These tokens will added to the Token cache on initialization.
exports.CACHE_SEED_TOKENS = {
    [globalChainId_1.ChainId.MAINNET]: {
        WETH: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.MAINNET],
        USDC: token_provider_1.USDC_MAINNET,
        USDT: token_provider_1.USDT_MAINNET,
        WBTC: token_provider_1.WBTC_MAINNET,
        DAI: token_provider_1.DAI_MAINNET,
        // This token stores its symbol as bytes32, therefore can not be fetched on-chain using
        // our token providers.
        // This workaround adds it to the cache, so we won't try to fetch it on-chain.
        RING: new sdk_core_1.Token(globalChainId_1.ChainId.MAINNET, '0x9469D013805bFfB7D3DEBe5E7839237e535ec483', 18, 'RING', 'RING'),
    },
    [globalChainId_1.ChainId.SEPOLIA]: {
        USDC: token_provider_1.USDC_SEPOLIA,
    },
    [globalChainId_1.ChainId.OPTIMISM]: {
        USDC: token_provider_1.USDC_OPTIMISM,
        USDT: token_provider_1.USDT_OPTIMISM,
        WBTC: token_provider_1.WBTC_OPTIMISM,
        DAI: token_provider_1.DAI_OPTIMISM,
    },
    [globalChainId_1.ChainId.OPTIMISM_GOERLI]: {
        USDC: token_provider_1.USDC_OPTIMISM_GOERLI,
        USDT: token_provider_1.USDT_OPTIMISM_GOERLI,
        WBTC: token_provider_1.WBTC_OPTIMISM_GOERLI,
        DAI: token_provider_1.DAI_OPTIMISM_GOERLI,
    },
    [globalChainId_1.ChainId.OPTIMISM_SEPOLIA]: {
        USDC: token_provider_1.USDC_OPTIMISM_SEPOLIA,
        USDT: token_provider_1.USDT_OPTIMISM_SEPOLIA,
        WBTC: token_provider_1.WBTC_OPTIMISM_SEPOLIA,
        DAI: token_provider_1.DAI_OPTIMISM_SEPOLIA,
    },
    [globalChainId_1.ChainId.ARBITRUM_ONE]: {
        USDC: token_provider_1.USDC_ARBITRUM,
        USDT: token_provider_1.USDT_ARBITRUM,
        WBTC: token_provider_1.WBTC_ARBITRUM,
        DAI: token_provider_1.DAI_ARBITRUM,
    },
    [globalChainId_1.ChainId.ARBITRUM_GOERLI]: {
        USDC: token_provider_1.USDC_ARBITRUM_GOERLI,
    },
    [globalChainId_1.ChainId.ARBITRUM_SEPOLIA]: {
        USDC: token_provider_1.USDC_ARBITRUM_SEPOLIA,
        DAI: token_provider_1.DAI_ARBITRUM_SEPOLIA,
    },
    [globalChainId_1.ChainId.POLYGON]: {
        WMATIC: token_provider_1.WMATIC_POLYGON,
        USDC: token_provider_1.USDC_POLYGON,
    },
    [globalChainId_1.ChainId.POLYGON_MUMBAI]: {
        WMATIC: token_provider_1.WMATIC_POLYGON_MUMBAI,
        DAI: token_provider_1.DAI_POLYGON_MUMBAI,
    },
    [globalChainId_1.ChainId.CELO]: {
        CELO: token_provider_1.CELO,
        CUSD: token_provider_1.CUSD_CELO,
        CEUR: token_provider_1.CEUR_CELO,
        DAI: token_provider_1.DAI_CELO,
    },
    [globalChainId_1.ChainId.CELO_ALFAJORES]: {
        CELO: token_provider_1.CELO_ALFAJORES,
        CUSD: token_provider_1.CUSD_CELO_ALFAJORES,
        CEUR: token_provider_1.CUSD_CELO_ALFAJORES,
        DAI: token_provider_1.DAI_CELO_ALFAJORES,
    },
    [globalChainId_1.ChainId.GNOSIS]: {
        WXDAI: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.GNOSIS],
        USDC_ETHEREUM_GNOSIS: token_provider_1.USDC_ETHEREUM_GNOSIS,
    },
    [globalChainId_1.ChainId.MOONBEAM]: {
        USDC: token_provider_1.USDC_MOONBEAM,
        DAI: token_provider_1.DAI_MOONBEAM,
        WBTC: token_provider_1.WBTC_MOONBEAM,
        WGLMR: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.MOONBEAM],
    },
    [globalChainId_1.ChainId.BNB]: {
        USDC: token_provider_1.USDC_BNB,
        USDT: token_provider_1.USDT_BNB,
        BUSD: token_provider_1.BUSD_BNB,
        ETH: token_provider_1.ETH_BNB,
        DAI: token_provider_1.DAI_BNB,
        BTC: token_provider_1.BTC_BNB,
        WBNB: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.BNB],
    },
    [globalChainId_1.ChainId.AVALANCHE]: {
        USDC: token_provider_1.USDC_AVAX,
        DAI: token_provider_1.DAI_AVAX,
        WAVAX: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.AVALANCHE],
    },
    [globalChainId_1.ChainId.BASE]: {
        USDC: token_provider_1.USDC_BASE,
        WETH: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.BASE],
    },
    [globalChainId_1.ChainId.BLAST]: {
        USDB: token_provider_1.USDB_BLAST,
        WETH: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.BLAST],
    },
    [globalChainId_1.ChainId.ZORA]: {
        WETH: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.ZORA],
    },
    [globalChainId_1.ChainId.ZKSYNC]: {
        WETH: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.ZKSYNC],
    },
    [globalChainId_1.ChainId.WORLDCHAIN]: {
        USDC: token_provider_1.USDC_WORLDCHAIN,
        WLD: token_provider_1.WLD_WORLDCHAIN,
        WBTC: token_provider_1.WBTC_WORLDCHAIN,
        WETH: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.WORLDCHAIN],
    },
    [globalChainId_1.ChainId.UNICHAIN_SEPOLIA]: {
        USDC: token_provider_1.USDC_SEPOLIA,
        WETH: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.UNICHAIN_SEPOLIA],
    },
    [globalChainId_1.ChainId.MONAD_TESTNET]: {
        USDT: token_provider_1.USDT_MONAD_TESTNET,
        WMON: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.MONAD_TESTNET],
    },
    [globalChainId_1.ChainId.BASE_SEPOLIA]: {
        USDC: token_provider_1.USDC_BASE_SEPOLIA,
        WETH: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.BASE_SEPOLIA],
    },
    [globalChainId_1.ChainId.UNICHAIN]: {
        DAI: token_provider_1.DAI_UNICHAIN,
        USDC: token_provider_1.USDC_UNICHAIN,
        WETH: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.UNICHAIN],
    },
    [globalChainId_1.ChainId.SONEIUM]: {
        USDC: token_provider_1.USDC_SONEIUM,
        WETH: util_1.WRAPPED_NATIVE_CURRENCY[globalChainId_1.ChainId.SONEIUM],
    },
    // Currently we do not have providers for Moonbeam mainnet or Gnosis testnet
};
/**
 * Provider for getting token metadata that falls back to a different provider
 * in the event of failure.
 *
 * @export
 * @class CachingTokenProviderWithFallback
 */
class CachingTokenProviderWithFallback {
    constructor(chainId, 
    // Token metadata (e.g. symbol and decimals) don't change so can be cached indefinitely.
    // Constructing a new token object is slow as sdk-core does checksumming.
    tokenCache, primaryTokenProvider, fallbackTokenProvider) {
        this.chainId = chainId;
        this.tokenCache = tokenCache;
        this.primaryTokenProvider = primaryTokenProvider;
        this.fallbackTokenProvider = fallbackTokenProvider;
        this.CACHE_KEY = (chainId, address) => `token-${chainId}-${address}`;
    }
    async getTokens(_addresses) {
        const seedTokens = exports.CACHE_SEED_TOKENS[this.chainId];
        if (seedTokens) {
            for (const token of Object.values(seedTokens)) {
                await this.tokenCache.set(this.CACHE_KEY(this.chainId, token.address.toLowerCase()), token);
            }
        }
        const addressToToken = {};
        const symbolToToken = {};
        const addresses = (0, lodash_1.default)(_addresses)
            .map((address) => address.toLowerCase())
            .uniq()
            .value();
        const addressesToFindInPrimary = [];
        const addressesToFindInSecondary = [];
        for (const address of addresses) {
            if (await this.tokenCache.has(this.CACHE_KEY(this.chainId, address))) {
                addressToToken[address.toLowerCase()] = (await this.tokenCache.get(this.CACHE_KEY(this.chainId, address)));
                symbolToToken[addressToToken[address].symbol] =
                    (await this.tokenCache.get(this.CACHE_KEY(this.chainId, address)));
            }
            else {
                addressesToFindInPrimary.push(address);
            }
        }
        util_1.log.info({ addressesToFindInPrimary }, `Found ${addresses.length - addressesToFindInPrimary.length} out of ${addresses.length} tokens in local cache. ${addressesToFindInPrimary.length > 0
            ? `Checking primary token provider for ${addressesToFindInPrimary.length} tokens`
            : ``}
      `);
        if (addressesToFindInPrimary.length > 0) {
            const primaryTokenAccessor = await this.primaryTokenProvider.getTokens(addressesToFindInPrimary);
            for (const address of addressesToFindInPrimary) {
                const token = primaryTokenAccessor.getTokenByAddress(address);
                if (token) {
                    addressToToken[address.toLowerCase()] = token;
                    symbolToToken[addressToToken[address].symbol] = token;
                    await this.tokenCache.set(this.CACHE_KEY(this.chainId, address.toLowerCase()), addressToToken[address]);
                }
                else {
                    addressesToFindInSecondary.push(address);
                }
            }
            util_1.log.info({ addressesToFindInSecondary }, `Found ${addressesToFindInPrimary.length - addressesToFindInSecondary.length} tokens in primary. ${this.fallbackTokenProvider
                ? `Checking secondary token provider for ${addressesToFindInSecondary.length} tokens`
                : `No fallback token provider specified. About to return.`}`);
        }
        if (this.fallbackTokenProvider && addressesToFindInSecondary.length > 0) {
            const secondaryTokenAccessor = await this.fallbackTokenProvider.getTokens(addressesToFindInSecondary);
            for (const address of addressesToFindInSecondary) {
                const token = secondaryTokenAccessor.getTokenByAddress(address);
                if (token) {
                    addressToToken[address.toLowerCase()] = token;
                    symbolToToken[addressToToken[address].symbol] = token;
                    await this.tokenCache.set(this.CACHE_KEY(this.chainId, address.toLowerCase()), addressToToken[address]);
                }
            }
        }
        return {
            getTokenByAddress: (address) => {
                return addressToToken[address.toLowerCase()];
            },
            getTokenBySymbol: (symbol) => {
                return symbolToToken[symbol.toLowerCase()];
            },
            getAllTokens: () => {
                return Object.values(addressToToken);
            },
        };
    }
}
exports.CachingTokenProviderWithFallback = CachingTokenProviderWithFallback;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGluZy10b2tlbi1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9wcm92aWRlcnMvY2FjaGluZy10b2tlbi1wcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnREFBMEM7QUFDMUMsb0RBQXVCO0FBRXZCLG9EQUEyQztBQUMzQyxrQ0FBdUQ7QUFHdkQscURBNEQwQjtBQUUxQixnRUFBZ0U7QUFDbkQsUUFBQSxpQkFBaUIsR0FFMUI7SUFDRixDQUFDLHVCQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDakIsSUFBSSxFQUFFLDhCQUF1QixDQUFDLHVCQUFPLENBQUMsT0FBTyxDQUFFO1FBQy9DLElBQUksRUFBRSw2QkFBWTtRQUNsQixJQUFJLEVBQUUsNkJBQVk7UUFDbEIsSUFBSSxFQUFFLDZCQUFZO1FBQ2xCLEdBQUcsRUFBRSw0QkFBVztRQUNoQix1RkFBdUY7UUFDdkYsdUJBQXVCO1FBQ3ZCLDhFQUE4RTtRQUM5RSxJQUFJLEVBQUUsSUFBSSxnQkFBSyxDQUNiLHVCQUFPLENBQUMsT0FBTyxFQUNmLDRDQUE0QyxFQUM1QyxFQUFFLEVBQ0YsTUFBTSxFQUNOLE1BQU0sQ0FDUDtLQUNGO0lBQ0QsQ0FBQyx1QkFBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ2pCLElBQUksRUFBRSw2QkFBWTtLQUNuQjtJQUNELENBQUMsdUJBQU8sQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUNsQixJQUFJLEVBQUUsOEJBQWE7UUFDbkIsSUFBSSxFQUFFLDhCQUFhO1FBQ25CLElBQUksRUFBRSw4QkFBYTtRQUNuQixHQUFHLEVBQUUsNkJBQVk7S0FDbEI7SUFDRCxDQUFDLHVCQUFPLENBQUMsZUFBZSxDQUFDLEVBQUU7UUFDekIsSUFBSSxFQUFFLHFDQUFvQjtRQUMxQixJQUFJLEVBQUUscUNBQW9CO1FBQzFCLElBQUksRUFBRSxxQ0FBb0I7UUFDMUIsR0FBRyxFQUFFLG9DQUFtQjtLQUN6QjtJ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