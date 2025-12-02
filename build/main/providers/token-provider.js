"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WMATIC_POLYGON_MUMBAI = exports.DAI_BASE_SEPOLIA = exports.DAI_POLYGON = exports.USDC_NATIVE_POLYGON = exports.USDC_POLYGON = exports.WETH_POLYGON = exports.WMATIC_POLYGON = exports.USDC_ARBITRUM_SEPOLIA = exports.USDC_ARBITRUM_GOERLI = exports.DAI_ARBITRUM_SEPOLIA = exports.DAI_ARBITRUM_GOERLI = exports.ARB_ARBITRUM = exports.DAI_ARBITRUM = exports.WBTC_ARBITRUM = exports.USDT_ARBITRUM = exports.USDC_NATIVE_ARBITRUM = exports.USDC_ARBITRUM = exports.DAI_OPTIMISM_SEPOLIA = exports.WBTC_OPTIMISM_SEPOLIA = exports.USDT_OPTIMISM_SEPOLIA = exports.USDC_OPTIMISM_SEPOLIA = exports.DAI_OPTIMISM_GOERLI = exports.WBTC_OPTIMISM_GOERLI = exports.USDT_OPTIMISM_GOERLI = exports.USDC_OPTIMISM_GOERLI = exports.OP_OPTIMISM = exports.DAI_OPTIMISM = exports.WBTC_OPTIMISM = exports.USDT_OPTIMISM = exports.USDC_NATIVE_OPTIMISM = exports.USDC_OPTIMISM = exports.UNI_GOERLI = exports.DAI_GOERLI = exports.WBTC_GOERLI = exports.USDT_GOERLI = exports.USDC_GOERLI = exports.DAI_SEPOLIA = exports.USDC_NATIVE_SEPOLIA = exports.USDC_SEPOLIA = exports.WSTETH_MAINNET = exports.LIDO_MAINNET = exports.AAVE_MAINNET = exports.UNI_MAINNET = exports.FEI_MAINNET = exports.AMPL_MAINNET = exports.EGGS_MAINNET = exports.DAI_MAINNET = exports.WBTC_MAINNET = exports.USDT_MAINNET = exports.USDC_MAINNET = void 0;
exports.USDC_SONEIUM = exports.DAI_UNICHAIN = exports.USDC_UNICHAIN = exports.USDC_BASE_SEPOLIA = exports.USDC_UNICHAIN_SEPOLIA = exports.WBTC_WORLDCHAIN = exports.WLD_WORLDCHAIN = exports.USDT_MONAD_TESTNET = exports.USDC_WORLDCHAIN = exports.DAI_ZKSYNC = exports.USDCE_ZKSYNC = exports.USDC_ZKSYNC = exports.USDC_ZORA = exports.USDB_BLAST = exports.WBTC_MOONBEAM = exports.DAI_MOONBEAM = exports.WGLMR_MOONBEAM = exports.USDC_MOONBEAM = exports.WBTC_GNOSIS = exports.WXDAI_GNOSIS = exports.USDC_ETHEREUM_GNOSIS = exports.USDT_BASE_TRON = exports.USDC_BASE_GOERLI = exports.VIRTUAL_BASE = exports.USDC_NATIVE_BASE = exports.USDC_BASE = exports.USDC_NATIVE_AVAX = exports.USDC_BRIDGED_AVAX = exports.USDC_AVAX = exports.DAI_AVAX = exports.CEUR_CELO_ALFAJORES = exports.CUSD_CELO_ALFAJORES = exports.DAI_CELO_ALFAJORES = exports.CELO_ALFAJORES = exports.CEUR_CELO = exports.USDC_NATIVE_CELO = exports.USDC_WORMHOLE_CELO = exports.USDC_CELO = exports.CUSD_CELO = exports.DAI_CELO = exports.CELO = exports.USDT_BNB = exports.USDC_BNB = exports.ETH_BNB = exports.DAI_BNB = exports.BUSD_BNB = exports.BTC_BNB = exports.WETH_POLYGON_MUMBAI = exports.DAI_POLYGON_MUMBAI = exports.USDC_POLYGON_MUMBAI = void 0;
exports.V4_SEPOLIA_TEST_B = exports.V4_SEPOLIA_TEST_A = exports.WNATIVE_ON = exports.USDC_ON = exports.USDT_ON = exports.DAI_ON = exports.TokenProvider = void 0;
const abi_1 = require("@ethersproject/abi");
const bignumber_1 = require("@ethersproject/bignumber");
const strings_1 = require("@ethersproject/strings");
const sdk_core_1 = require("@uniswap/sdk-core");
const lodash_1 = __importDefault(require("lodash"));
const globalChainId_1 = require("../globalChainId");
const IERC20Metadata__factory_1 = require("../types/v3/factories/IERC20Metadata__factory");
const util_1 = require("../util");
// Some well known tokens on each chain for seeding cache / testing.
exports.USDC_MAINNET = new sdk_core_1.Token(globalChainId_1.ChainId.MAINNET, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC', 'USD//C');
exports.USDT_MAINNET = new sdk_core_1.Token(globalChainId_1.ChainId.MAINNET, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6, 'USDT', 'Tether USD');
exports.WBTC_MAINNET = new sdk_core_1.Token(globalChainId_1.ChainId.MAINNET, '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 8, 'WBTC', 'Wrapped BTC');
exports.DAI_MAINNET = new sdk_core_1.Token(globalChainId_1.ChainId.MAINNET, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin');
exports.EGGS_MAINNET = new sdk_core_1.Token(globalChainId_1.ChainId.MAINNET, '0x2e516BA5Bf3b7eE47fb99B09eaDb60BDE80a82e0', 18, 'EGGS', 'EGGS');
exports.AMPL_MAINNET = new sdk_core_1.Token(globalChainId_1.ChainId.MAINNET, '0xD46bA6D942050d489DBd938a2C909A5d5039A161', 9, 'AMPL', 'AMPL');
exports.FEI_MAINNET = new sdk_core_1.Token(globalChainId_1.ChainId.MAINNET, '0x956F47F50A910163D8BF957Cf5846D573E7f87CA', 18, 'FEI', 'Fei USD');
exports.UNI_MAINNET = new sdk_core_1.Token(globalChainId_1.ChainId.MAINNET, '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', 18, 'UNI', 'Uniswap');
exports.AAVE_MAINNET = new sdk_core_1.Token(globalChainId_1.ChainId.MAINNET, '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', 18, 'AAVE', 'Aave Token');
exports.LIDO_MAINNET = new sdk_core_1.Token(globalChainId_1.ChainId.MAINNET, '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', 18, 'LDO', 'Lido DAO Token');
exports.WSTETH_MAINNET = new sdk_core_1.Token(globalChainId_1.ChainId.MAINNET, '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', 18, 'wstETH', 'Wrapped liquid staked Ether');
exports.USDC_SEPOLIA = new sdk_core_1.Token(globalChainId_1.ChainId.SEPOLIA, '0x6f14C02Fc1F78322cFd7d707aB90f18baD3B54f5', 18, 'USDC', 'USDC Token');
exports.USDC_NATIVE_SEPOLIA = new sdk_core_1.Token(globalChainId_1.ChainId.SEPOLIA, '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238', 6, 'USDC', 'USDC Token');
exports.DAI_SEPOLIA = new sdk_core_1.Token(globalChainId_1.ChainId.SEPOLIA, '0x7AF17A48a6336F7dc1beF9D485139f7B6f4FB5C8', 18, 'DAI', 'DAI Token');
exports.USDC_GOERLI = new sdk_core_1.Token(globalChainId_1.ChainId.GOERLI, '0x07865c6e87b9f70255377e024ace6630c1eaa37f', 6, 'USDC', 'USD//C');
exports.USDT_GOERLI = new sdk_core_1.Token(globalChainId_1.ChainId.GOERLI, '0xe583769738b6dd4e7caf8451050d1948be717679', 18, 'USDT', 'Tether USD');
exports.WBTC_GOERLI = new sdk_core_1.Token(globalChainId_1.ChainId.GOERLI, '0xa0a5ad2296b38bd3e3eb59aaeaf1589e8d9a29a9', 8, 'WBTC', 'Wrapped BTC');
exports.DAI_GOERLI = new sdk_core_1.Token(globalChainId_1.ChainId.GOERLI, '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844', 18, 'DAI', 'Dai Stablecoin');
exports.UNI_GOERLI = new sdk_core_1.Token(globalChainId_1.ChainId.GOERLI, '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 18, 'UNI', 'Uni token');
exports.USDC_OPTIMISM = new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM, '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', 6, 'USDC', 'USD//C.e');
exports.USDC_NATIVE_OPTIMISM = new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM, '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 6, 'USDC', 'USD//C');
exports.USDT_OPTIMISM = new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM, '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', 6, 'USDT', 'Tether USD');
exports.WBTC_OPTIMISM = new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM, '0x68f180fcCe6836688e9084f035309E29Bf0A2095', 8, 'WBTC', 'Wrapped BTC');
exports.DAI_OPTIMISM = new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM, '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', 18, 'DAI', 'Dai Stablecoin');
exports.OP_OPTIMISM = new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM, '0x4200000000000000000000000000000000000042', 18, 'OP', 'Optimism');
exports.USDC_OPTIMISM_GOERLI = new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM_GOERLI, '0x7E07E15D2a87A24492740D16f5bdF58c16db0c4E', 6, 'USDC', 'USD//C');
exports.USDT_OPTIMISM_GOERLI = new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM_GOERLI, '0x853eb4bA5D0Ba2B77a0A5329Fd2110d5CE149ECE', 6, 'USDT', 'Tether USD');
exports.WBTC_OPTIMISM_GOERLI = new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM_GOERLI, '0xe0a592353e81a94Db6E3226fD4A99F881751776a', 8, 'WBTC', 'Wrapped BTC');
exports.DAI_OPTIMISM_GOERLI = new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM_GOERLI, '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', 18, 'DAI', 'Dai Stablecoin');
exports.USDC_OPTIMISM_SEPOLIA = new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM_SEPOLIA, '0x7E07E15D2a87A24492740D16f5bdF58c16db0c4E', 6, 'USDC', 'USD//C');
exports.USDT_OPTIMISM_SEPOLIA = new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM_SEPOLIA, '0x853eb4bA5D0Ba2B77a0A5329Fd2110d5CE149ECE', 6, 'USDT', 'Tether USD');
exports.WBTC_OPTIMISM_SEPOLIA = new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM_SEPOLIA, '0xe0a592353e81a94Db6E3226fD4A99F881751776a', 8, 'WBTC', 'Wrapped BTC');
exports.DAI_OPTIMISM_SEPOLIA = new sdk_core_1.Token(globalChainId_1.ChainId.OPTIMISM_SEPOLIA, '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', 18, 'DAI', 'Dai Stablecoin');
exports.USDC_ARBITRUM = new sdk_core_1.Token(globalChainId_1.ChainId.ARBITRUM_ONE, '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', 6, 'USDC', 'USD//C.e');
exports.USDC_NATIVE_ARBITRUM = new sdk_core_1.Token(globalChainId_1.ChainId.ARBITRUM_ONE, '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 6, 'USDC', 'USD//C');
exports.USDT_ARBITRUM = new sdk_core_1.Token(globalChainId_1.ChainId.ARBITRUM_ONE, '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 6, 'USDT', 'Tether USD');
exports.WBTC_ARBITRUM = new sdk_core_1.Token(globalChainId_1.ChainId.ARBITRUM_ONE, '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', 8, 'WBTC', 'Wrapped BTC');
exports.DAI_ARBITRUM = new sdk_core_1.Token(globalChainId_1.ChainId.ARBITRUM_ONE, '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', 18, 'DAI', 'Dai Stablecoin');
exports.ARB_ARBITRUM = new sdk_core_1.Token(globalChainId_1.ChainId.ARBITRUM_ONE, '0x912CE59144191C1204E64559FE8253a0e49E6548', 18, 'ARB', 'Arbitrum');
exports.DAI_ARBITRUM_GOERLI = new sdk_core_1.Token(globalChainId_1.ChainId.ARBITRUM_GOERLI, '0x0000000000000000000000000000000000000000', // TODO: add address
18, 'DAI', 'Dai Stablecoin');
exports.DAI_ARBITRUM_SEPOLIA = new sdk_core_1.Token(globalChainId_1.ChainId.ARBITRUM_SEPOLIA, '0xc3826E277485c33F3D99C9e0CBbf8449513210EE', 18, 'DAI', 'Dai Stablecoin');
// Bridged version of official Goerli USDC
exports.USDC_ARBITRUM_GOERLI = new sdk_core_1.Token(globalChainId_1.ChainId.ARBITRUM_GOERLI, '0x8FB1E3fC51F3b789dED7557E680551d93Ea9d892', 6, 'USDC', 'USD//C');
// Bridged version of official Sepolia USDC
exports.USDC_ARBITRUM_SEPOLIA = new sdk_core_1.Token(globalChainId_1.ChainId.ARBITRUM_SEPOLIA, '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', 6, 'USDC', 'USD//C');
//polygon tokens
exports.WMATIC_POLYGON = new sdk_core_1.Token(globalChainId_1.ChainId.POLYGON, '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', 18, 'WMATIC', 'Wrapped MATIC');
exports.WETH_POLYGON = new sdk_core_1.Token(globalChainId_1.ChainId.POLYGON, '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', 18, 'WETH', 'Wrapped Ether');
exports.USDC_POLYGON = new sdk_core_1.Token(globalChainId_1.ChainId.POLYGON, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', 6, 'USDC', 'USD//C.e');
exports.USDC_NATIVE_POLYGON = new sdk_core_1.Token(globalChainId_1.ChainId.POLYGON, '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', 6, 'USDC', 'USD//C');
exports.DAI_POLYGON = new sdk_core_1.Token(globalChainId_1.ChainId.POLYGON, '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', 18, 'DAI', 'Dai Stablecoin');
exports.DAI_BASE_SEPOLIA = new sdk_core_1.Token(globalChainId_1.ChainId.SEPOLIA, '0xE6F6e27c0BF1a4841E3F09d03D7D31Da8eAd0a27', 18, 'DAI', 'Dai Stablecoin');
//polygon mumbai tokens
exports.WMATIC_POLYGON_MUMBAI = new sdk_core_1.Token(globalChainId_1.ChainId.POLYGON_MUMBAI, '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889', 18, 'WMATIC', 'Wrapped MATIC');
exports.USDC_POLYGON_MUMBAI = new sdk_core_1.Token(globalChainId_1.ChainId.POLYGON_MUMBAI, '0xe11a86849d99f524cac3e7a0ec1241828e332c62', 6, 'USDC', 'USD//C');
exports.DAI_POLYGON_MUMBAI = new sdk_core_1.Token(globalChainId_1.ChainId.POLYGON_MUMBAI, '0x001b3b4d0f3714ca98ba10f6042daebf0b1b7b6f', 18, 'DAI', 'Dai Stablecoin');
exports.WETH_POLYGON_MUMBAI = new sdk_core_1.Token(globalChainId_1.ChainId.POLYGON_MUMBAI, '0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa', 18, 'WETH', 'Wrapped Ether');
// BNB chain Tokens
exports.BTC_BNB = new sdk_core_1.Token(globalChainId_1.ChainId.BNB, '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', 18, 'BTCB', 'Binance BTC');
exports.BUSD_BNB = new sdk_core_1.Token(globalChainId_1.ChainId.BNB, '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 18, 'BUSD', 'BUSD');
exports.DAI_BNB = new sdk_core_1.Token(globalChainId_1.ChainId.BNB, '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', 18, 'DAI', 'DAI');
exports.ETH_BNB = new sdk_core_1.Token(globalChainId_1.ChainId.BNB, '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', 18, 'ETH', 'ETH');
exports.USDC_BNB = new sdk_core_1.Token(globalChainId_1.ChainId.BNB, '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', 18, 'USDC', 'USDC');
exports.USDT_BNB = new sdk_core_1.Token(globalChainId_1.ChainId.BNB, '0x55d398326f99059fF775485246999027B3197955', 18, 'USDT', 'USDT');
// Celo Tokens
exports.CELO = new sdk_core_1.Token(globalChainId_1.ChainId.CELO, '0x471EcE3750Da237f93B8E339c536989b8978a438', 18, 'CELO', 'Celo native asset');
exports.DAI_CELO = new sdk_core_1.Token(globalChainId_1.ChainId.CELO, '0xE4fE50cdD716522A56204352f00AA110F731932d', 18, 'DAI', 'Dai Stablecoin');
exports.CUSD_CELO = new sdk_core_1.Token(globalChainId_1.ChainId.CELO, '0x765DE816845861e75A25fCA122bb6898B8B1282a', 18, 'CUSD', 'Celo Dollar Stablecoin');
exports.USDC_CELO = new sdk_core_1.Token(globalChainId_1.ChainId.CELO, '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664', 18, 'USDC', 'USD//C.e');
exports.USDC_WORMHOLE_CELO = new sdk_core_1.Token(globalChainId_1.ChainId.CELO, '0x37f750B7cC259A2f741AF45294f6a16572CF5cAd', 18, 'USDC', 'USD//C.e');
exports.USDC_NATIVE_CELO = new sdk_core_1.Token(globalChainId_1.ChainId.CELO, '0x765DE816845861e75A25fCA122bb6898B8B1282a', 18, 'USDC', 'USD//C');
exports.CEUR_CELO = new sdk_core_1.Token(globalChainId_1.ChainId.CELO, '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73', 18, 'CEUR', 'Celo Euro Stablecoin');
// Celo Alfajores Tokens
exports.CELO_ALFAJORES = new sdk_core_1.Token(globalChainId_1.ChainId.CELO_ALFAJORES, '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9', 18, 'CELO', 'Celo native asset');
exports.DAI_CELO_ALFAJORES = new sdk_core_1.Token(globalChainId_1.ChainId.CELO_ALFAJORES, '0x7d91E51C8F218f7140188A155f5C75388630B6a8', 18, 'DAI', 'Dai Stablecoin');
exports.CUSD_CELO_ALFAJORES = new sdk_core_1.Token(globalChainId_1.ChainId.CELO_ALFAJORES, '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1', 18, 'CUSD', 'Celo Dollar Stablecoin');
exports.CEUR_CELO_ALFAJORES = new sdk_core_1.Token(globalChainId_1.ChainId.CELO_ALFAJORES, '0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F', 18, 'CEUR', 'Celo Euro Stablecoin');
// Avalanche Tokens
exports.DAI_AVAX = new sdk_core_1.Token(globalChainId_1.ChainId.AVALANCHE, '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', 18, 'DAI.e', 'DAI.e Token');
exports.USDC_AVAX = new sdk_core_1.Token(globalChainId_1.ChainId.AVALANCHE, '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', 6, 'USDC', 'USDC Token');
exports.USDC_BRIDGED_AVAX = new sdk_core_1.Token(globalChainId_1.ChainId.AVALANCHE, '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664', 6, 'USDC', 'USDC Token');
exports.USDC_NATIVE_AVAX = new sdk_core_1.Token(globalChainId_1.ChainId.AVALANCHE, '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e', 6, 'USDC', 'USDC Token');
// Base Tokens
exports.USDC_BASE = new sdk_core_1.Token(globalChainId_1.ChainId.BASE, '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', 6, 'USDbC', 'USD Base Coin');
exports.USDC_NATIVE_BASE = new sdk_core_1.Token(globalChainId_1.ChainId.BASE, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 6, 'USDbC', 'USD Base Coin');
exports.VIRTUAL_BASE = new sdk_core_1.Token(globalChainId_1.ChainId.BASE, '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b', 18, 'VIRTUAL', 'Virtual Protocol');
// Base Goerli Tokens
exports.USDC_BASE_GOERLI = new sdk_core_1.Token(globalChainId_1.ChainId.BASE_GOERLI, '0x853154e2A5604E5C74a2546E2871Ad44932eB92C', 6, 'USDbC', 'USD Base Coin');
exports.USDT_BASE_TRON = new sdk_core_1.Token(globalChainId_1.ChainId.TRON, '0xA614F803B6FD780986A42C78EC9C7F77E6DED13C', 6, 'USDT', 'TRC20 USDT');
// Gnosis Tokens
exports.USDC_ETHEREUM_GNOSIS = new sdk_core_1.Token(globalChainId_1.ChainId.GNOSIS, '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83', 6, 'USDC', 'USDC from Ethereum on Gnosis');
exports.WXDAI_GNOSIS = new sdk_core_1.Token(globalChainId_1.ChainId.GNOSIS, '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d', 18, 'WXDAI', 'Wrapped XDAI on Gnosis');
exports.WBTC_GNOSIS = new sdk_core_1.Token(globalChainId_1.ChainId.GNOSIS, '0x8e5bbbb09ed1ebde8674cda39a0c169401db4252', 8, 'WBTC', 'Wrapped BTC from Ethereum on Gnosis');
// Moonbeam Tokens
exports.USDC_MOONBEAM = new sdk_core_1.Token(globalChainId_1.ChainId.MOONBEAM, '0x818ec0A7Fe18Ff94269904fCED6AE3DaE6d6dC0b', 6, 'USDC', 'USD Coin bridged using Multichain');
exports.WGLMR_MOONBEAM = new sdk_core_1.Token(globalChainId_1.ChainId.MOONBEAM, '0xAcc15dC74880C9944775448304B263D191c6077F', 18, 'WGLMR', 'Wrapped GLMR');
exports.DAI_MOONBEAM = new sdk_core_1.Token(globalChainId_1.ChainId.MOONBEAM, '0x818ec0A7Fe18Ff94269904fCED6AE3DaE6d6dC0b', 6, 'DAI', 'Dai on moonbeam bridged using Multichain');
exports.WBTC_MOONBEAM = new sdk_core_1.Token(globalChainId_1.ChainId.MOONBEAM, '0x922D641a426DcFFaeF11680e5358F34d97d112E1', 8, 'WBTC', 'Wrapped BTC bridged using Multichain');
// Blast Tokens
exports.USDB_BLAST = new sdk_core_1.Token(globalChainId_1.ChainId.BLAST, '0x4300000000000000000000000000000000000003', 18, 'USDB', 'USD Blast');
exports.USDC_ZORA = new sdk_core_1.Token(globalChainId_1.ChainId.ZORA, '0xCccCCccc7021b32EBb4e8C08314bD62F7c653EC4', 6, 'USDzC', 'USD Coin (Bridged from Ethereum)');
exports.USDC_ZKSYNC = new sdk_core_1.Token(globalChainId_1.ChainId.ZKSYNC, '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4', 6, 'USDC', 'USDC');
exports.USDCE_ZKSYNC = new sdk_core_1.Token(globalChainId_1.ChainId.ZKSYNC, '0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4', 6, 'USDC.e', 'Bridged USDC (zkSync)');
exports.DAI_ZKSYNC = new sdk_core_1.Token(globalChainId_1.ChainId.ZKSYNC, '0x4B9eb6c0b6ea15176BBF62841C6B2A8a398cb656', 18, 'DAI', 'Dai Stablecoin');
exports.USDC_WORLDCHAIN = new sdk_core_1.Token(globalChainId_1.ChainId.WORLDCHAIN, '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1', 6, 'USDC.e', 'Bridged USDC (world-chain-mainnet)');
exports.USDT_MONAD_TESTNET = new sdk_core_1.Token(globalChainId_1.ChainId.MONAD_TESTNET, '0xfBC2D240A5eD44231AcA3A9e9066bc4b33f01149', 6, 'USDT', 'USDT');
exports.WLD_WORLDCHAIN = new sdk_core_1.Token(globalChainId_1.ChainId.WORLDCHAIN, '0x2cFc85d8E48F8EAB294be644d9E25C3030863003', 18, 'WLD', 'Worldcoin');
exports.WBTC_WORLDCHAIN = new sdk_core_1.Token(globalChainId_1.ChainId.WORLDCHAIN, '0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3', 8, 'WBTC', 'Wrapped BTC');
exports.USDC_UNICHAIN_SEPOLIA = new sdk_core_1.Token(globalChainId_1.ChainId.UNICHAIN_SEPOLIA, '0x31d0220469e10c4E71834a79b1f276d740d3768F', 6, 'USDC', 'USDC Token');
exports.USDC_BASE_SEPOLIA = new sdk_core_1.Token(globalChainId_1.ChainId.BASE_SEPOLIA, '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 6, 'USDC', 'USDC Token');
exports.USDC_UNICHAIN = new sdk_core_1.Token(globalChainId_1.ChainId.UNICHAIN, 
// TODO: validate USDC address is final / validated
'0x078D782b760474a361dDA0AF3839290b0EF57AD6', 6, 'USDC', 'USD Token');
exports.DAI_UNICHAIN = new sdk_core_1.Token(globalChainId_1.ChainId.UNICHAIN, '0x20CAb320A855b39F724131C69424240519573f81', 18, 'DAI', 'Dai Stablecoin');
exports.USDC_SONEIUM = new sdk_core_1.Token(globalChainId_1.ChainId.SONEIUM, '0xbA9986D2381edf1DA03B0B9c1f8b00dc4AacC369', 6, 'USDCE', 'Soneium Bridged USDC Soneium');
class TokenProvider {
    constructor(chainId, multicall2Provider) {
        this.chainId = chainId;
        this.multicall2Provider = multicall2Provider;
    }
    async getTokenSymbol(addresses, providerConfig) {
        let result;
        let isBytes32 = false;
        try {
            result =
                await this.multicall2Provider.callSameFunctionOnMultipleContracts({
                    addresses,
                    contractInterface: IERC20Metadata__factory_1.IERC20Metadata__factory.createInterface(),
                    functionName: 'symbol',
                    providerConfig,
                });
        }
        catch (error) {
            util_1.log.error({ addresses }, `TokenProvider.getTokenSymbol[string] failed with error ${error}. Trying with bytes32.`);
            const bytes32Interface = new abi_1.Interface([
                {
                    inputs: [],
                    name: 'symbol',
                    outputs: [
                        {
                            internalType: 'bytes32',
                            name: '',
                            type: 'bytes32',
                        },
                    ],
                    stateMutability: 'view',
                    type: 'function',
                },
            ]);
            try {
                result =
                    await this.multicall2Provider.callSameFunctionOnMultipleContracts({
                        addresses,
                        contractInterface: bytes32Interface,
                        functionName: 'symbol',
                        providerConfig,
                    });
                isBytes32 = true;
            }
            catch (error) {
                util_1.log.fatal({ addresses }, `TokenProvider.getTokenSymbol[bytes32] failed with error ${error}.`);
                throw new Error('[TokenProvider.getTokenSymbol] Impossible to fetch token symbol.');
            }
        }
        return { result, isBytes32 };
    }
    async getTokenDecimals(addresses, providerConfig) {
        return this.multicall2Provider.callSameFunctionOnMultipleContracts({
            addresses,
            contractInterface: IERC20Metadata__factory_1.IERC20Metadata__factory.createInterface(),
            functionName: 'decimals',
            providerConfig,
        });
    }
    async getTokens(_addresses, providerConfig) {
        const addressToToken = {};
        const symbolToToken = {};
        const addresses = (0, lodash_1.default)(_addresses)
            .map((address) => address.toLowerCase())
            .uniq()
            .value();
        if (addresses.length > 0) {
            if (this.chainId === globalChainId_1.ChainId.TRON) {
                await this.getTokensWithIndividualCalls(addresses, addressToToken, symbolToToken, providerConfig);
            }
            else {
                await this.getTokensWithMulticall(addresses, addressToToken, symbolToToken, providerConfig);
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
    async getTokensWithMulticall(addresses, addressToToken, symbolToToken, providerConfig) {
        const [symbolsResult, decimalsResult] = await Promise.all([
            this.getTokenSymbol(addresses, providerConfig),
            this.getTokenDecimals(addresses, providerConfig),
        ]);
        const isBytes32 = symbolsResult.isBytes32;
        const { results: symbols } = symbolsResult.result;
        const { results: decimals } = decimalsResult;
        for (let i = 0; i < addresses.length; i++) {
            const address = addresses[i];
            const symbolResult = symbols[i];
            const decimalResult = decimals[i];
            if (!(symbolResult === null || symbolResult === void 0 ? void 0 : symbolResult.success) || !(decimalResult === null || decimalResult === void 0 ? void 0 : decimalResult.success)) {
                util_1.log.info({
                    symbolResult,
                    decimalResult,
                }, `Dropping token with address ${address} as symbol or decimal are invalid`);
                continue;
            }
            let symbol;
            try {
                symbol = isBytes32
                    ? (0, strings_1.parseBytes32String)(symbolResult.result[0])
                    : symbolResult.result[0];
            }
            catch (error) {
                if (error instanceof Error &&
                    error.message.includes('invalid bytes32 string - no null terminator')) {
                    util_1.log.error({
                        symbolResult,
                        error,
                        address,
                    }, `invalid bytes32 string - no null terminator`);
                }
                throw error;
            }
            const decimal = decimalResult.result[0];
            addressToToken[address.toLowerCase()] = new sdk_core_1.Token(this.chainId, address, decimal, symbol);
            symbolToToken[symbol.toLowerCase()] =
                addressToToken[address.toLowerCase()];
        }
        util_1.log.info(`Got token symbol and decimals for ${Object.values(addressToToken).length} out of ${addresses.length} tokens on-chain ${providerConfig ? `as of: ${providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber}` : ''}`);
    }
    async getTokensWithIndividualCalls(addresses, addressToToken, symbolToToken, providerConfig) {
        util_1.log.info(`Using individual calls for Tron chain due to missing Multicall contract`);
        const contractInterface = IERC20Metadata__factory_1.IERC20Metadata__factory.createInterface();
        const blockNumber = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber) ? bignumber_1.BigNumber.from(providerConfig.blockNumber) : undefined;
        for (const address of addresses) {
            try {
                const symbolData = contractInterface.encodeFunctionData('symbol');
                const decimalsData = contractInterface.encodeFunctionData('decimals');
                // 使用 provider 直接调用
                const provider = this.multicall2Provider.provider;
                if (!provider) {
                    util_1.log.warn(`No provider available for individual calls on Tron`);
                    continue;
                }
                const symbolResult = await this.makeIndividualCall(provider, address, symbolData, contractInterface, 'symbol', blockNumber);
                const decimalsResult = await this.makeIndividualCall(provider, address, decimalsData, contractInterface, 'decimals', blockNumber);
                if (!symbolResult.success || !decimalsResult.success) {
                    util_1.log.info({
                        symbolResult,
                        decimalsResult,
                    }, `Dropping token with address ${address} as symbol or decimal are invalid`);
                    continue;
                }
                const symbol = symbolResult.result[0];
                const decimal = decimalsResult.result[0];
                addressToToken[address.toLowerCase()] = new sdk_core_1.Token(this.chainId, address, decimal, symbol);
                symbolToToken[symbol.toLowerCase()] =
                    addressToToken[address.toLowerCase()];
            }
            catch (error) {
                util_1.log.warn(`Failed to get token info for ${address}:`, error);
                continue;
            }
        }
        util_1.log.info(`Got token symbol and decimals for ${Object.values(addressToToken).length} out of ${addresses.length} tokens on-chain using individual calls ${providerConfig ? `as of: ${providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber}` : ''}`);
    }
    async makeIndividualCall(provider, address, callData, contractInterface, functionName, blockNumber) {
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
                result: decoded,
            };
        }
        catch (error) {
            return {
                success: false,
                returnData: '0x',
            };
        }
    }
}
exports.TokenProvider = TokenProvider;
const DAI_ON = (chainId) => {
    switch (chainId) {
        case globalChainId_1.ChainId.MAINNET:
            return exports.DAI_MAINNET;
        case globalChainId_1.ChainId.GOERLI:
            return exports.DAI_GOERLI;
        case globalChainId_1.ChainId.SEPOLIA:
            return exports.DAI_SEPOLIA;
        case globalChainId_1.ChainId.OPTIMISM:
            return exports.DAI_OPTIMISM;
        case globalChainId_1.ChainId.OPTIMISM_GOERLI:
            return exports.DAI_OPTIMISM_GOERLI;
        case globalChainId_1.ChainId.OPTIMISM_SEPOLIA:
            return exports.DAI_OPTIMISM_SEPOLIA;
        case globalChainId_1.ChainId.ARBITRUM_ONE:
            return exports.DAI_ARBITRUM;
        case globalChainId_1.ChainId.ARBITRUM_GOERLI:
            return exports.DAI_ARBITRUM_GOERLI;
        case globalChainId_1.ChainId.ARBITRUM_SEPOLIA:
            return exports.DAI_ARBITRUM_SEPOLIA;
        case globalChainId_1.ChainId.POLYGON:
            return exports.DAI_POLYGON;
        case globalChainId_1.ChainId.POLYGON_MUMBAI:
            return exports.DAI_POLYGON_MUMBAI;
        case globalChainId_1.ChainId.CELO:
            return exports.DAI_CELO;
        case globalChainId_1.ChainId.CELO_ALFAJORES:
            return exports.DAI_CELO_ALFAJORES;
        case globalChainId_1.ChainId.MOONBEAM:
            return exports.DAI_MOONBEAM;
        case globalChainId_1.ChainId.BNB:
            return exports.DAI_BNB;
        case globalChainId_1.ChainId.AVALANCHE:
            return exports.DAI_AVAX;
        case globalChainId_1.ChainId.ZKSYNC:
            return exports.DAI_ZKSYNC;
        case globalChainId_1.ChainId.UNICHAIN:
            return exports.DAI_UNICHAIN;
        case globalChainId_1.ChainId.BASE_SEPOLIA:
            return exports.DAI_BASE_SEPOLIA;
        default:
            throw new Error(`Chain id: ${chainId} not supported`);
    }
};
exports.DAI_ON = DAI_ON;
const USDT_ON = (chainId) => {
    switch (chainId) {
        case globalChainId_1.ChainId.MAINNET:
            return exports.USDT_MAINNET;
        case globalChainId_1.ChainId.GOERLI:
            return exports.USDT_GOERLI;
        case globalChainId_1.ChainId.OPTIMISM:
            return exports.USDT_OPTIMISM;
        case globalChainId_1.ChainId.OPTIMISM_GOERLI:
            return exports.USDT_OPTIMISM_GOERLI;
        case globalChainId_1.ChainId.OPTIMISM_SEPOLIA:
            return exports.USDT_OPTIMISM_SEPOLIA;
        case globalChainId_1.ChainId.ARBITRUM_ONE:
            return exports.USDT_ARBITRUM;
        case globalChainId_1.ChainId.BNB:
            return exports.USDT_BNB;
        case globalChainId_1.ChainId.MONAD_TESTNET:
            return exports.USDT_MONAD_TESTNET;
        default:
            throw new Error(`Chain id: ${chainId} not supported`);
    }
};
exports.USDT_ON = USDT_ON;
const USDC_ON = (chainId) => {
    switch (chainId) {
        case globalChainId_1.ChainId.MAINNET:
            return exports.USDC_MAINNET;
        case globalChainId_1.ChainId.GOERLI:
            return exports.USDC_GOERLI;
        case globalChainId_1.ChainId.SEPOLIA:
            return exports.USDC_SEPOLIA;
        case globalChainId_1.ChainId.OPTIMISM:
            return exports.USDC_OPTIMISM;
        case globalChainId_1.ChainId.OPTIMISM_GOERLI:
            return exports.USDC_OPTIMISM_GOERLI;
        case globalChainId_1.ChainId.OPTIMISM_SEPOLIA:
            return exports.USDC_OPTIMISM_SEPOLIA;
        case globalChainId_1.ChainId.ARBITRUM_ONE:
            return exports.USDC_ARBITRUM;
        case globalChainId_1.ChainId.ARBITRUM_GOERLI:
            return exports.USDC_ARBITRUM_GOERLI;
        case globalChainId_1.ChainId.ARBITRUM_SEPOLIA:
            return exports.USDC_ARBITRUM_SEPOLIA;
        case globalChainId_1.ChainId.POLYGON:
            return exports.USDC_POLYGON;
        case globalChainId_1.ChainId.POLYGON_MUMBAI:
            return exports.USDC_POLYGON_MUMBAI;
        case globalChainId_1.ChainId.GNOSIS:
            return exports.USDC_ETHEREUM_GNOSIS;
        case globalChainId_1.ChainId.MOONBEAM:
            return exports.USDC_MOONBEAM;
        case globalChainId_1.ChainId.BNB:
            return exports.USDC_BNB;
        case globalChainId_1.ChainId.AVALANCHE:
            return exports.USDC_AVAX;
        case globalChainId_1.ChainId.BASE:
            return exports.USDC_BASE;
        case globalChainId_1.ChainId.BASE_GOERLI:
            return exports.USDC_BASE_GOERLI;
        case globalChainId_1.ChainId.ZORA:
            return exports.USDC_ZORA;
        case globalChainId_1.ChainId.ZKSYNC:
            return exports.USDCE_ZKSYNC;
        case globalChainId_1.ChainId.WORLDCHAIN:
            return exports.USDC_WORLDCHAIN;
        case globalChainId_1.ChainId.UNICHAIN_SEPOLIA:
            return exports.USDC_UNICHAIN_SEPOLIA;
        case globalChainId_1.ChainId.BASE_SEPOLIA:
            return exports.USDC_BASE_SEPOLIA;
        case globalChainId_1.ChainId.UNICHAIN:
            return exports.USDC_UNICHAIN;
        case globalChainId_1.ChainId.SONEIUM:
            return exports.USDC_SONEIUM;
        default:
            throw new Error(`Chain id: ${chainId} not supported`);
    }
};
exports.USDC_ON = USDC_ON;
const WNATIVE_ON = (chainId) => {
    return util_1.WRAPPED_NATIVE_CURRENCY[chainId];
};
exports.WNATIVE_ON = WNATIVE_ON;
exports.V4_SEPOLIA_TEST_A = new sdk_core_1.Token(globalChainId_1.ChainId.SEPOLIA, '0x0275C79896215a790dD57F436E1103D4179213be', 18, 'A', 'MockA');
exports.V4_SEPOLIA_TEST_B = new sdk_core_1.Token(globalChainId_1.ChainId.SEPOLIA, '0x1a6990c77cfbba398beb230dd918e28aab71eec2', 18, 'B', 'MockB');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW4tcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvcHJvdmlkZXJzL3Rva2VuLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUEsNENBQStDO0FBQy9DLHdEQUFxRDtBQUNyRCxvREFBNEQ7QUFDNUQsZ0RBQTBDO0FBQzFDLG9EQUF1QjtBQUV2QixvREFBMkM7QUFDM0MsMkZBQXdGO0FBQ3hGLGtDQUF1RDtBQStCdkQsb0VBQW9FO0FBQ3ZELFFBQUEsWUFBWSxHQUFHLElBQUksZ0JBQUssQ0FDbkMsdUJBQU8sQ0FBQyxPQUFPLEVBQ2YsNENBQTRDLEVBQzVDLENBQUMsRUFDRCxNQUFNLEVBQ04sUUFBUSxDQUNULENBQUM7QUFDVyxRQUFBLFlBQVksR0FBRyxJQUFJLGdCQUFLLENBQ25DLHVCQUFPLENBQUMsT0FBTyxFQUNmLDRDQUE0QyxFQUM1QyxDQUFDLEVBQ0QsTUFBTSxFQUNOLFlBQVksQ0FDYixDQUFDO0FBQ1csUUFBQSxZQUFZLEdBQUcsSUFBSSxnQkFBSyxDQUNuQyx1QkFBTyxDQUFDLE9BQU8sRUFDZiw0Q0FBNEMsRUFDNUMsQ0FBQyxFQUNELE1BQU0sRUFDTixhQUFhLENBQ2QsQ0FBQztBQUNXLFFBQUEsV0FBVyxHQUFHLElBQUksZ0JBQUssQ0FDbEMsdUJBQU8sQ0FBQyxPQUFPLEVBQ2YsNENBQTRDLEVBQzVDLEVBQUUsRUFDRixLQUFLLEVBQ0wsZ0JBQWdCLENBQ2pCLENBQUM7QUFDVyxRQUFBLFlBQVksR0FBRyxJQUFJLGdCQUFLLENBQ25DLHVCQUFPLENBQUMsT0FBTyxFQUNmLDRDQUE0QyxFQUM1QyxFQUFFLEVBQ0YsTUFBTSxFQUNOLE1BQU0sQ0FDUCxDQUFDO0FBQ1csUUFBQSxZQUFZLEdBQUcsSUFBSSxnQkFBSyxDQUNuQyx1QkFBTyxDQUFDLE9BQU8sRUFDZiw0Q0FBNEMsRUFDNUMsQ0FBQyxFQUNELE1BQU0sRUFDTixNQUFNLENBQ1AsQ0FBQztB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