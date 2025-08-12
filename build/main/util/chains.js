"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nativeOnChain = exports.ExtendedEther = exports.WRAPPED_NATIVE_CURRENCY = exports.ID_TO_PROVIDER = exports.CHAIN_IDS_LIST = exports.ID_TO_NETWORK_NAME = exports.NATIVE_CURRENCY = exports.NATIVE_NAMES_BY_ID = exports.NativeCurrencyName = exports.ChainName = exports.ID_TO_CHAIN_ID = exports.NETWORKS_WITH_SAME_UNISWAP_ADDRESSES = exports.HAS_L1_FEE = exports.MIXED_SUPPORTED = exports.V4_SUPPORTED = exports.V2_SUPPORTED = exports.SUPPORTED_CHAINS = void 0;
const sdk_core_1 = require("@uniswap/sdk-core");
const globalChainId_1 = require("../globalChainId");
// WIP: Gnosis, Moonbeam
exports.SUPPORTED_CHAINS = [
    globalChainId_1.ChainId.MAINNET,
    globalChainId_1.ChainId.OPTIMISM,
    globalChainId_1.ChainId.OPTIMISM_GOERLI,
    globalChainId_1.ChainId.OPTIMISM_SEPOLIA,
    globalChainId_1.ChainId.ARBITRUM_ONE,
    globalChainId_1.ChainId.ARBITRUM_GOERLI,
    globalChainId_1.ChainId.ARBITRUM_SEPOLIA,
    globalChainId_1.ChainId.POLYGON,
    globalChainId_1.ChainId.POLYGON_MUMBAI,
    globalChainId_1.ChainId.SEPOLIA,
    globalChainId_1.ChainId.CELO_ALFAJORES,
    globalChainId_1.ChainId.CELO,
    globalChainId_1.ChainId.BNB,
    globalChainId_1.ChainId.AVALANCHE,
    globalChainId_1.ChainId.BASE,
    globalChainId_1.ChainId.BLAST,
    globalChainId_1.ChainId.ZORA,
    globalChainId_1.ChainId.ZKSYNC,
    globalChainId_1.ChainId.WORLDCHAIN,
    globalChainId_1.ChainId.UNICHAIN,
    globalChainId_1.ChainId.UNICHAIN_SEPOLIA,
    globalChainId_1.ChainId.MONAD_TESTNET,
    globalChainId_1.ChainId.BASE_SEPOLIA,
    globalChainId_1.ChainId.SONEIUM,
    globalChainId_1.ChainId.TRON,
    // Gnosis and Moonbeam don't yet have contracts deployed yet
];
exports.V2_SUPPORTED = [
    globalChainId_1.ChainId.MAINNET,
    globalChainId_1.ChainId.SEPOLIA,
    globalChainId_1.ChainId.ARBITRUM_ONE,
    globalChainId_1.ChainId.OPTIMISM,
    globalChainId_1.ChainId.POLYGON,
    globalChainId_1.ChainId.BASE,
    globalChainId_1.ChainId.BNB,
    globalChainId_1.ChainId.AVALANCHE,
    globalChainId_1.ChainId.MONAD_TESTNET,
    globalChainId_1.ChainId.UNICHAIN_SEPOLIA,
    globalChainId_1.ChainId.UNICHAIN,
    globalChainId_1.ChainId.SONEIUM,
    globalChainId_1.ChainId.TRON,
];
exports.V4_SUPPORTED = [
    globalChainId_1.ChainId.MAINNET,
    globalChainId_1.ChainId.SEPOLIA,
    globalChainId_1.ChainId.ARBITRUM_ONE,
    globalChainId_1.ChainId.OPTIMISM,
    globalChainId_1.ChainId.POLYGON,
    globalChainId_1.ChainId.BASE,
    globalChainId_1.ChainId.BNB,
    globalChainId_1.ChainId.AVALANCHE,
    globalChainId_1.ChainId.MONAD_TESTNET,
    globalChainId_1.ChainId.UNICHAIN_SEPOLIA,
    globalChainId_1.ChainId.UNICHAIN,
    globalChainId_1.ChainId.SONEIUM,
];
exports.MIXED_SUPPORTED = [
    globalChainId_1.ChainId.MAINNET,
    globalChainId_1.ChainId.SEPOLIA,
    globalChainId_1.ChainId.GOERLI,
    globalChainId_1.ChainId.BASE,
    globalChainId_1.ChainId.UNICHAIN,
    globalChainId_1.ChainId.BASE,
    globalChainId_1.ChainId.ARBITRUM_ONE,
    globalChainId_1.ChainId.POLYGON,
    globalChainId_1.ChainId.OPTIMISM,
    globalChainId_1.ChainId.AVALANCHE,
    globalChainId_1.ChainId.BNB,
    globalChainId_1.ChainId.WORLDCHAIN,
    globalChainId_1.ChainId.ZORA,
    globalChainId_1.ChainId.SONEIUM,
    globalChainId_1.ChainId.TRON,
];
exports.HAS_L1_FEE = [
    globalChainId_1.ChainId.OPTIMISM,
    globalChainId_1.ChainId.OPTIMISM_GOERLI,
    globalChainId_1.ChainId.OPTIMISM_SEPOLIA,
    globalChainId_1.ChainId.ARBITRUM_ONE,
    globalChainId_1.ChainId.ARBITRUM_GOERLI,
    globalChainId_1.ChainId.ARBITRUM_SEPOLIA,
    globalChainId_1.ChainId.BASE,
    globalChainId_1.ChainId.BASE_GOERLI,
    globalChainId_1.ChainId.BLAST,
    globalChainId_1.ChainId.ZORA,
    globalChainId_1.ChainId.WORLDCHAIN,
    globalChainId_1.ChainId.UNICHAIN_SEPOLIA,
    globalChainId_1.ChainId.MONAD_TESTNET,
    globalChainId_1.ChainId.UNICHAIN,
    globalChainId_1.ChainId.SONEIUM,
    globalChainId_1.ChainId.TRON,
];
exports.NETWORKS_WITH_SAME_UNISWAP_ADDRESSES = [
    globalChainId_1.ChainId.MAINNET,
    globalChainId_1.ChainId.GOERLI,
    globalChainId_1.ChainId.OPTIMISM,
    globalChainId_1.ChainId.ARBITRUM_ONE,
    globalChainId_1.ChainId.POLYGON,
    globalChainId_1.ChainId.POLYGON_MUMBAI,
];
const ID_TO_CHAIN_ID = (id) => {
    switch (id) {
        case 1:
            return globalChainId_1.ChainId.MAINNET;
        case 5:
            return globalChainId_1.ChainId.GOERLI;
        case 11155111:
            return globalChainId_1.ChainId.SEPOLIA;
        case 56:
            return globalChainId_1.ChainId.BNB;
        case 10:
            return globalChainId_1.ChainId.OPTIMISM;
        case 420:
            return globalChainId_1.ChainId.OPTIMISM_GOERLI;
        case 11155420:
            return globalChainId_1.ChainId.OPTIMISM_SEPOLIA;
        case 42161:
            return globalChainId_1.ChainId.ARBITRUM_ONE;
        case 421613:
            return globalChainId_1.ChainId.ARBITRUM_GOERLI;
        case 421614:
            return globalChainId_1.ChainId.ARBITRUM_SEPOLIA;
        case 137:
            return globalChainId_1.ChainId.POLYGON;
        case 80001:
            return globalChainId_1.ChainId.POLYGON_MUMBAI;
        case 42220:
            return globalChainId_1.ChainId.CELO;
        case 44787:
            return globalChainId_1.ChainId.CELO_ALFAJORES;
        case 100:
            return globalChainId_1.ChainId.GNOSIS;
        case 1284:
            return globalChainId_1.ChainId.MOONBEAM;
        case 43114:
            return globalChainId_1.ChainId.AVALANCHE;
        case 8453:
            return globalChainId_1.ChainId.BASE;
        case 84531:
            return globalChainId_1.ChainId.BASE_GOERLI;
        case 84532:
            return globalChainId_1.ChainId.BASE_SEPOLIA;
        case 81457:
            return globalChainId_1.ChainId.BLAST;
        case 7777777:
            return globalChainId_1.ChainId.ZORA;
        case 324:
            return globalChainId_1.ChainId.ZKSYNC;
        case 480:
            return globalChainId_1.ChainId.WORLDCHAIN;
        case 1301:
            return globalChainId_1.ChainId.UNICHAIN_SEPOLIA;
        case 10143:
            return globalChainId_1.ChainId.MONAD_TESTNET;
        case 130:
            return globalChainId_1.ChainId.UNICHAIN;
        case 1868:
            return globalChainId_1.ChainId.SONEIUM;
        case 728126428:
            return globalChainId_1.ChainId.TRON;
        default:
            throw new Error(`Unknown chain id: ${id}`);
    }
};
exports.ID_TO_CHAIN_ID = ID_TO_CHAIN_ID;
var ChainName;
(function (ChainName) {
    ChainName["MAINNET"] = "mainnet";
    ChainName["GOERLI"] = "goerli";
    ChainName["SEPOLIA"] = "sepolia";
    ChainName["OPTIMISM"] = "optimism-mainnet";
    ChainName["OPTIMISM_GOERLI"] = "optimism-goerli";
    ChainName["OPTIMISM_SEPOLIA"] = "optimism-sepolia";
    ChainName["ARBITRUM_ONE"] = "arbitrum-mainnet";
    ChainName["ARBITRUM_GOERLI"] = "arbitrum-goerli";
    ChainName["ARBITRUM_SEPOLIA"] = "arbitrum-sepolia";
    ChainName["POLYGON"] = "polygon-mainnet";
    ChainName["POLYGON_MUMBAI"] = "polygon-mumbai";
    ChainName["CELO"] = "celo-mainnet";
    ChainName["CELO_ALFAJORES"] = "celo-alfajores";
    ChainName["GNOSIS"] = "gnosis-mainnet";
    ChainName["MOONBEAM"] = "moonbeam-mainnet";
    ChainName["BNB"] = "bnb-mainnet";
    ChainName["AVALANCHE"] = "avalanche-mainnet";
    ChainName["BASE"] = "base-mainnet";
    ChainName["BASE_GOERLI"] = "base-goerli";
    ChainName["BASE_SEPOLIA"] = "base-sepolia";
    ChainName["BLAST"] = "blast-mainnet";
    ChainName["ZORA"] = "zora-mainnet";
    ChainName["ZKSYNC"] = "zksync-mainnet";
    ChainName["WORLDCHAIN"] = "worldchain-mainnet";
    ChainName["UNICHAIN_SEPOLIA"] = "unichain-sepolia";
    ChainName["UNICHAIN"] = "unichain-mainnet";
    ChainName["MONAD_TESTNET"] = "monad-testnet";
    ChainName["SONEIUM"] = "soneium-mainnet";
    ChainName["TRON"] = "tron-mainnet";
})(ChainName = exports.ChainName || (exports.ChainName = {}));
var NativeCurrencyName;
(function (NativeCurrencyName) {
    // Strings match input for CLI
    NativeCurrencyName["ETHER"] = "ETH";
    NativeCurrencyName["MATIC"] = "MATIC";
    NativeCurrencyName["CELO"] = "CELO";
    NativeCurrencyName["GNOSIS"] = "XDAI";
    NativeCurrencyName["MOONBEAM"] = "GLMR";
    NativeCurrencyName["BNB"] = "BNB";
    NativeCurrencyName["AVALANCHE"] = "AVAX";
    NativeCurrencyName["MONAD"] = "MON";
    NativeCurrencyName["TRX"] = "TRX";
})(NativeCurrencyName = exports.NativeCurrencyName || (exports.NativeCurrencyName = {}));
exports.NATIVE_NAMES_BY_ID = {
    [globalChainId_1.ChainId.MAINNET]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.GOERLI]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.SEPOLIA]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.OPTIMISM]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.OPTIMISM_GOERLI]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.OPTIMISM_SEPOLIA]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.ARBITRUM_ONE]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.ARBITRUM_GOERLI]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.ARBITRUM_SEPOLIA]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.POLYGON]: ['MATIC', '0x0000000000000000000000000000000000001010'],
    [globalChainId_1.ChainId.POLYGON_MUMBAI]: [
        'MATIC',
        '0x0000000000000000000000000000000000001010',
    ],
    [globalChainId_1.ChainId.CELO]: ['CELO'],
    [globalChainId_1.ChainId.CELO_ALFAJORES]: ['CELO'],
    [globalChainId_1.ChainId.GNOSIS]: ['XDAI'],
    [globalChainId_1.ChainId.MOONBEAM]: ['GLMR'],
    [globalChainId_1.ChainId.BNB]: ['BNB', 'BNB', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'],
    [globalChainId_1.ChainId.AVALANCHE]: [
        'AVAX',
        'AVALANCHE',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.BASE]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.BLAST]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.ZORA]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.ZKSYNC]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.WORLDCHAIN]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.UNICHAIN_SEPOLIA]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.MONAD_TESTNET]: [
        'MON',
        'MONAD',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.BASE_SEPOLIA]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.UNICHAIN]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.SONEIUM]: [
        'ETH',
        'ETHER',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
    [globalChainId_1.ChainId.TRON]: [
        'TRX',
        'TRON',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ],
};
exports.NATIVE_CURRENCY = {
    [globalChainId_1.ChainId.MAINNET]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.GOERLI]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.SEPOLIA]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.OPTIMISM]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.OPTIMISM_GOERLI]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.OPTIMISM_SEPOLIA]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.ARBITRUM_ONE]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.ARBITRUM_GOERLI]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.ARBITRUM_SEPOLIA]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.POLYGON]: NativeCurrencyName.MATIC,
    [globalChainId_1.ChainId.POLYGON_MUMBAI]: NativeCurrencyName.MATIC,
    [globalChainId_1.ChainId.CELO]: NativeCurrencyName.CELO,
    [globalChainId_1.ChainId.CELO_ALFAJORES]: NativeCurrencyName.CELO,
    [globalChainId_1.ChainId.GNOSIS]: NativeCurrencyName.GNOSIS,
    [globalChainId_1.ChainId.MOONBEAM]: NativeCurrencyName.MOONBEAM,
    [globalChainId_1.ChainId.BNB]: NativeCurrencyName.BNB,
    [globalChainId_1.ChainId.AVALANCHE]: NativeCurrencyName.AVALANCHE,
    [globalChainId_1.ChainId.BASE]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.BLAST]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.ZORA]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.ZKSYNC]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.WORLDCHAIN]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.UNICHAIN_SEPOLIA]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.MONAD_TESTNET]: NativeCurrencyName.MONAD,
    [globalChainId_1.ChainId.BASE_SEPOLIA]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.UNICHAIN]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.SONEIUM]: NativeCurrencyName.ETHER,
    [globalChainId_1.ChainId.TRON]: NativeCurrencyName.TRX,
};
const ID_TO_NETWORK_NAME = (id) => {
    switch (id) {
        case 1:
            return ChainName.MAINNET;
        case 5:
            return ChainName.GOERLI;
        case 11155111:
            return ChainName.SEPOLIA;
        case 56:
            return ChainName.BNB;
        case 10:
            return ChainName.OPTIMISM;
        case 420:
            return ChainName.OPTIMISM_GOERLI;
        case 11155420:
            return ChainName.OPTIMISM_SEPOLIA;
        case 42161:
            return ChainName.ARBITRUM_ONE;
        case 421613:
            return ChainName.ARBITRUM_GOERLI;
        case 421614:
            return ChainName.ARBITRUM_SEPOLIA;
        case 137:
            return ChainName.POLYGON;
        case 80001:
            return ChainName.POLYGON_MUMBAI;
        case 42220:
            return ChainName.CELO;
        case 44787:
            return ChainName.CELO_ALFAJORES;
        case 100:
            return ChainName.GNOSIS;
        case 1284:
            return ChainName.MOONBEAM;
        case 43114:
            return ChainName.AVALANCHE;
        case 8453:
            return ChainName.BASE;
        case 84531:
            return ChainName.BASE_GOERLI;
        case 84532:
            return ChainName.BASE_SEPOLIA;
        case 81457:
            return ChainName.BLAST;
        case 7777777:
            return ChainName.ZORA;
        case 324:
            return ChainName.ZKSYNC;
        case 480:
            return ChainName.WORLDCHAIN;
        case 1301:
            return ChainName.UNICHAIN_SEPOLIA;
        case 130:
            return ChainName.UNICHAIN;
        case 10143:
            return ChainName.MONAD_TESTNET;
        case 1868:
            return ChainName.SONEIUM;
        case 728126428:
            return ChainName.TRON;
        default:
            throw new Error(`Unknown chain id: ${id}`);
    }
};
exports.ID_TO_NETWORK_NAME = ID_TO_NETWORK_NAME;
exports.CHAIN_IDS_LIST = Object.values(globalChainId_1.ChainId).map((c) => c.toString());
const ID_TO_PROVIDER = (id) => {
    switch (id) {
        case globalChainId_1.ChainId.MAINNET:
            return process.env.JSON_RPC_PROVIDER;
        case globalChainId_1.ChainId.GOERLI:
            return process.env.JSON_RPC_PROVIDER_GORLI;
        case globalChainId_1.ChainId.SEPOLIA:
            return process.env.JSON_RPC_PROVIDER_SEPOLIA;
        case globalChainId_1.ChainId.OPTIMISM:
            return process.env.JSON_RPC_PROVIDER_OPTIMISM;
        case globalChainId_1.ChainId.OPTIMISM_GOERLI:
            return process.env.JSON_RPC_PROVIDER_OPTIMISM_GOERLI;
        case globalChainId_1.ChainId.OPTIMISM_SEPOLIA:
            return process.env.JSON_RPC_PROVIDER_OPTIMISM_SEPOLIA;
        case globalChainId_1.ChainId.ARBITRUM_ONE:
            return process.env.JSON_RPC_PROVIDER_ARBITRUM_ONE;
        case globalChainId_1.ChainId.ARBITRUM_GOERLI:
            return process.env.JSON_RPC_PROVIDER_ARBITRUM_GOERLI;
        case globalChainId_1.ChainId.ARBITRUM_SEPOLIA:
            return process.env.JSON_RPC_PROVIDER_ARBITRUM_SEPOLIA;
        case globalChainId_1.ChainId.POLYGON:
            return process.env.JSON_RPC_PROVIDER_POLYGON;
        case globalChainId_1.ChainId.POLYGON_MUMBAI:
            return process.env.JSON_RPC_PROVIDER_POLYGON_MUMBAI;
        case globalChainId_1.ChainId.CELO:
            return process.env.JSON_RPC_PROVIDER_CELO;
        case globalChainId_1.ChainId.CELO_ALFAJORES:
            return process.env.JSON_RPC_PROVIDER_CELO_ALFAJORES;
        case globalChainId_1.ChainId.BNB:
            return process.env.JSON_RPC_PROVIDER_BNB;
        case globalChainId_1.ChainId.AVALANCHE:
            return process.env.JSON_RPC_PROVIDER_AVALANCHE;
        case globalChainId_1.ChainId.BASE:
            return process.env.JSON_RPC_PROVIDER_BASE;
        case globalChainId_1.ChainId.BLAST:
            return process.env.JSON_RPC_PROVIDER_BLAST;
        case globalChainId_1.ChainId.ZORA:
            return process.env.JSON_RPC_PROVIDER_ZORA;
        case globalChainId_1.ChainId.ZKSYNC:
            return process.env.JSON_RPC_PROVIDER_ZKSYNC;
        case globalChainId_1.ChainId.WORLDCHAIN:
            return process.env.JSON_RPC_PROVIDER_WORLDCHAIN;
        case globalChainId_1.ChainId.UNICHAIN_SEPOLIA:
            return process.env.JSON_RPC_PROVIDER_UNICHAIN_SEPOLIA;
        case globalChainId_1.ChainId.MONAD_TESTNET:
            return process.env.JSON_RPC_PROVIDER_MONAD_TESTNET;
        case globalChainId_1.ChainId.BASE_SEPOLIA:
            return process.env.JSON_RPC_PROVIDER_BASE_SEPOLIA;
        case globalChainId_1.ChainId.UNICHAIN:
            return process.env.JSON_RPC_PROVIDER_UNICHAIN;
        case globalChainId_1.ChainId.SONEIUM:
            return process.env.JSON_RPC_PROVIDER_SONEIUM;
        case globalChainId_1.ChainId.TRON:
            return process.env.JSON_RPC_PROVIDER_TRON;
        default:
            throw new Error(`Chain id: ${id} not supported`);
    }
};
exports.ID_TO_PROVIDER = ID_TO_PROVIDER;
exports.WRAPPED_NATIVE_CURRENCY = {
    [globalChainId_1.ChainId.MAINNET]: new sdk_core_1.Token(1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.GOERLI]: new sdk_core_1.Token(5, '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.SEPOLIA]: new sdk_core_1.Token(11155111, '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.BNB]: new sdk_core_1.Token(56, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 18, 'WBNB', 'Wrapped BNB'),
    [globalChainId_1.ChainId.OPTIMISM]: new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.OPTIMISM_GOERLI]: new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM_GOERLI, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.OPTIMISM_SEPOLIA]: new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM_SEPOLIA, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.ARBITRUM_ONE]: new sdk_core_1.Token(globalChainId_1.ChainId.ARBITRUM_ONE, '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.ARBITRUM_GOERLI]: new sdk_core_1.Token(globalChainId_1.ChainId.ARBITRUM_GOERLI, '0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.ARBITRUM_SEPOLIA]: new sdk_core_1.Token(globalChainId_1.ChainId.ARBITRUM_SEPOLIA, '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.POLYGON]: new sdk_core_1.Token(globalChainId_1.ChainId.POLYGON, '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', 18, 'WMATIC', 'Wrapped MATIC'),
    [globalChainId_1.ChainId.POLYGON_MUMBAI]: new sdk_core_1.Token(globalChainId_1.ChainId.POLYGON_MUMBAI, '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889', 18, 'WMATIC', 'Wrapped MATIC'),
    // The Celo native currency 'CELO' implements the erc-20 token standard
    [globalChainId_1.ChainId.CELO]: new sdk_core_1.Token(globalChainId_1.ChainId.CELO, '0x471EcE3750Da237f93B8E339c536989b8978a438', 18, 'CELO', 'Celo native asset'),
    [globalChainId_1.ChainId.CELO_ALFAJORES]: new sdk_core_1.Token(globalChainId_1.ChainId.CELO_ALFAJORES, '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9', 18, 'CELO', 'Celo native asset'),
    [globalChainId_1.ChainId.GNOSIS]: new sdk_core_1.Token(globalChainId_1.ChainId.GNOSIS, '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d', 18, 'WXDAI', 'Wrapped XDAI on Gnosis'),
    [globalChainId_1.ChainId.MOONBEAM]: new sdk_core_1.Token(globalChainId_1.ChainId.MOONBEAM, '0xAcc15dC74880C9944775448304B263D191c6077F', 18, 'WGLMR', 'Wrapped GLMR'),
    [globalChainId_1.ChainId.AVALANCHE]: new sdk_core_1.Token(globalChainId_1.ChainId.AVALANCHE, '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', 18, 'WAVAX', 'Wrapped AVAX'),
    [globalChainId_1.ChainId.BASE]: new sdk_core_1.Token(globalChainId_1.ChainId.BASE, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.BASE_GOERLI]: new sdk_core_1.Token(globalChainId_1.ChainId.BASE_GOERLI, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.ROOTSTOCK]: new sdk_core_1.Token(globalChainId_1.ChainId.ROOTSTOCK, '0x542fDA317318eBF1d3DEAf76E0b632741A7e677d', 18, 'WRBTC', 'Wrapped BTC'),
    [globalChainId_1.ChainId.ZORA]: new sdk_core_1.Token(globalChainId_1.ChainId.ZORA, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.BLAST]: new sdk_core_1.Token(globalChainId_1.ChainId.BLAST, '0x4300000000000000000000000000000000000004', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.ZKSYNC]: new sdk_core_1.Token(globalChainId_1.ChainId.ZKSYNC, '0x5aea5775959fbc2557cc8789bc1bf90a239d9a91', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.WORLDCHAIN]: new sdk_core_1.Token(globalChainId_1.ChainId.WORLDCHAIN, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.UNICHAIN_SEPOLIA]: new sdk_core_1.Token(globalChainId_1.ChainId.UNICHAIN_SEPOLIA, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.UNICHAIN]: new sdk_core_1.Token(globalChainId_1.ChainId.UNICHAIN, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.MONAD_TESTNET]: new sdk_core_1.Token(globalChainId_1.ChainId.MONAD_TESTNET, '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701', 18, 'WMON', 'Wrapped Monad'),
    [globalChainId_1.ChainId.BASE_SEPOLIA]: new sdk_core_1.Token(globalChainId_1.ChainId.BASE_SEPOLIA, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.SONEIUM]: new sdk_core_1.Token(globalChainId_1.ChainId.SONEIUM, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.ZORA_SEPOLIA]: new sdk_core_1.Token(globalChainId_1.ChainId.ZORA_SEPOLIA, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
    [globalChainId_1.ChainId.TRON]: new sdk_core_1.Token(globalChainId_1.ChainId.TRON, '0x891CDB91D149F23B1A45D9C5CA78A88D0CB44C18', 6, 'WTRX', 'Wrapped TRX'),
};
function isMatic(chainId) {
    return chainId === globalChainId_1.ChainId.POLYGON_MUMBAI || chainId === globalChainId_1.ChainId.POLYGON;
}
class MaticNativeCurrency extends sdk_core_1.NativeCurrency {
    equals(other) {
        return other.isNative && other.chainId === this.chainId;
    }
    get wrapped() {
        if (!isMatic(this.chainId))
            throw new Error('Not matic');
        const nativeCurrency = exports.WRAPPED_NATIVE_CURRENCY[this.chainId];
        if (nativeCurrency) {
            return nativeCurrency;
        }
        throw new Error(`Does not support this chain ${this.chainId}`);
    }
    constructor(chainId) {
        if (!isMatic(chainId))
            throw new Error('Not matic');
        super(chainId, 18, 'MATIC', 'Polygon Matic');
    }
}
function isCelo(chainId) {
    return chainId === globalChainId_1.ChainId.CELO_ALFAJORES || chainId === globalChainId_1.ChainId.CELO;
}
class CeloNativeCurrency extends sdk_core_1.NativeCurrency {
    equals(other) {
        return other.isNative && other.chainId === this.chainId;
    }
    get wrapped() {
        if (!isCelo(this.chainId))
            throw new Error('Not celo');
        const nativeCurrency = exports.WRAPPED_NATIVE_CURRENCY[this.chainId];
        if (nativeCurrency) {
            return nativeCurrency;
        }
        throw new Error(`Does not support this chain ${this.chainId}`);
    }
    constructor(chainId) {
        if (!isCelo(chainId))
            throw new Error('Not celo');
        super(chainId, 18, 'CELO', 'Celo');
    }
}
function isGnosis(chainId) {
    return chainId === globalChainId_1.ChainId.GNOSIS;
}
class GnosisNativeCurrency extends sdk_core_1.NativeCurrency {
    equals(other) {
        return other.isNative && other.chainId === this.chainId;
    }
    get wrapped() {
        if (!isGnosis(this.chainId))
            throw new Error('Not gnosis');
        const nativeCurrency = exports.WRAPPED_NATIVE_CURRENCY[this.chainId];
        if (nativeCurrency) {
            return nativeCurrency;
        }
        throw new Error(`Does not support this chain ${this.chainId}`);
    }
    constructor(chainId) {
        if (!isGnosis(chainId))
            throw new Error('Not gnosis');
        super(chainId, 18, 'XDAI', 'xDai');
    }
}
function isBnb(chainId) {
    return chainId === globalChainId_1.ChainId.BNB;
}
class BnbNativeCurrency extends sdk_core_1.NativeCurrency {
    equals(other) {
        return other.isNative && other.chainId === this.chainId;
    }
    get wrapped() {
        if (!isBnb(this.chainId))
            throw new Error('Not bnb');
        const nativeCurrency = exports.WRAPPED_NATIVE_CURRENCY[this.chainId];
        if (nativeCurrency) {
            return nativeCurrency;
        }
        throw new Error(`Does not support this chain ${this.chainId}`);
    }
    constructor(chainId) {
        if (!isBnb(chainId))
            throw new Error('Not bnb');
        super(chainId, 18, 'BNB', 'BNB');
    }
}
function isMoonbeam(chainId) {
    return chainId === globalChainId_1.ChainId.MOONBEAM;
}
class MoonbeamNativeCurrency extends sdk_core_1.NativeCurrency {
    equals(other) {
        return other.isNative && other.chainId === this.chainId;
    }
    get wrapped() {
        if (!isMoonbeam(this.chainId))
            throw new Error('Not moonbeam');
        const nativeCurrency = exports.WRAPPED_NATIVE_CURRENCY[this.chainId];
        if (nativeCurrency) {
            return nativeCurrency;
        }
        throw new Error(`Does not support this chain ${this.chainId}`);
    }
    constructor(chainId) {
        if (!isMoonbeam(chainId))
            throw new Error('Not moonbeam');
        super(chainId, 18, 'GLMR', 'Glimmer');
    }
}
function isAvax(chainId) {
    return chainId === globalChainId_1.ChainId.AVALANCHE;
}
class AvalancheNativeCurrency extends sdk_core_1.NativeCurrency {
    equals(other) {
        return other.isNative && other.chainId === this.chainId;
    }
    get wrapped() {
        if (!isAvax(this.chainId))
            throw new Error('Not avalanche');
        const nativeCurrency = exports.WRAPPED_NATIVE_CURRENCY[this.chainId];
        if (nativeCurrency) {
            return nativeCurrency;
        }
        throw new Error(`Does not support this chain ${this.chainId}`);
    }
    constructor(chainId) {
        if (!isAvax(chainId))
            throw new Error('Not avalanche');
        super(chainId, 18, 'AVAX', 'Avalanche');
    }
}
class ExtendedEther extends sdk_core_1.Ether {
    get wrapped() {
        if (this.chainId in exports.WRAPPED_NATIVE_CURRENCY) {
            return exports.WRAPPED_NATIVE_CURRENCY[this.chainId];
        }
        throw new Error('Unsupported chain ID');
    }
    static onChain(chainId) {
        var _a;
        return ((_a = this._cachedExtendedEther[chainId]) !== null && _a !== void 0 ? _a : (this._cachedExtendedEther[chainId] = new ExtendedEther(chainId)));
    }
}
exports.ExtendedEther = ExtendedEther;
ExtendedEther._cachedExtendedEther = {};
const cachedNativeCurrency = {};
function nativeOnChain(chainId) {
    if (cachedNativeCurrency[chainId] != undefined) {
        return cachedNativeCurrency[chainId];
    }
    if (isMatic(chainId)) {
        cachedNativeCurrency[chainId] = new MaticNativeCurrency(chainId);
    }
    else if (isCelo(chainId)) {
        cachedNativeCurrency[chainId] = new CeloNativeCurrency(chainId);
    }
    else if (isGnosis(chainId)) {
        cachedNativeCurrency[chainId] = new GnosisNativeCurrency(chainId);
    }
    else if (isMoonbeam(chainId)) {
        cachedNativeCurrency[chainId] = new MoonbeamNativeCurrency(chainId);
    }
    else if (isBnb(chainId)) {
        cachedNativeCurrency[chainId] = new BnbNativeCurrency(chainId);
    }
    else if (isAvax(chainId)) {
        cachedNativeCurrency[chainId] = new AvalancheNativeCurrency(chainId);
    }
    else {
        cachedNativeCurrency[chainId] = ExtendedEther.onChain(chainId);
    }
    return cachedNativeCurrency[chainId];
}
exports.nativeOnChain = nativeOnChain;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhaW5zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3V0aWwvY2hhaW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGdEQUsyQjtBQUUzQixvREFBMkM7QUFJM0Msd0JBQXdCO0FBQ1gsUUFBQSxnQkFBZ0IsR0FBYztJQUN6Qyx1QkFBTyxDQUFDLE9BQU87SUFDZix1QkFBTyxDQUFDLFFBQVE7SUFDaEIsdUJBQU8sQ0FBQyxlQUFlO0lBQ3ZCLHVCQUFPLENBQUMsZ0JBQWdCO0lBQ3hCLHVCQUFPLENBQUMsWUFBWTtJQUNwQix1QkFBTyxDQUFDLGVBQWU7SUFDdkIsdUJBQU8sQ0FBQyxnQkFBZ0I7SUFDeEIsdUJBQU8sQ0FBQyxPQUFPO0lBQ2YsdUJBQU8sQ0FBQyxjQUFjO0lBQ3RCLHVCQUFPLENBQUMsT0FBTztJQUNmLHVCQUFPLENBQUMsY0FBYztJQUN0Qix1QkFBTyxDQUFDLElBQUk7SUFDWix1QkFBTyxDQUFDLEdBQUc7SUFDWCx1QkFBTyxDQUFDLFNBQVM7SUFDakIsdUJBQU8sQ0FBQyxJQUFJO0lBQ1osdUJBQU8sQ0FBQyxLQUFLO0lBQ2IsdUJBQU8sQ0FBQyxJQUFJO0lBQ1osdUJBQU8sQ0FBQyxNQUFNO0lBQ2QsdUJBQU8sQ0FBQyxVQUFVO0lBQ2xCLHVCQUFPLENBQUMsUUFBUTtJQUNoQix1QkFBTyxDQUFDLGdCQUFnQjtJQUN4Qix1QkFBTyxDQUFDLGFBQWE7SUFDckIsdUJBQU8sQ0FBQyxZQUFZO0lBQ3BCLHVCQUFPLENBQUMsT0FBTztJQUNmLHVCQUFPLENBQUMsSUFBSTtJQUNaLDREQUE0RDtDQUM3RCxDQUFDO0FBRVcsUUFBQSxZQUFZLEdBQUc7SUFDMUIsdUJBQU8sQ0FBQyxPQUFPO0lBQ2YsdUJBQU8sQ0FBQyxPQUFPO0lBQ2YsdUJBQU8sQ0FBQyxZQUFZO0lBQ3BCLHVCQUFPLENBQUMsUUFBUTtJQUNoQix1QkFBTyxDQUFDLE9BQU87SUFDZix1QkFBTyxDQUFDLElBQUk7SUFDWix1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