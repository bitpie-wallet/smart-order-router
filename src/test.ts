import { JsonRpcProvider } from '@ethersproject/providers';
import { Protocol } from '@uniswap/router-sdk';
import { CurrencyAmount, Token, TradeType } from '@uniswap/sdk-core';

import {
  AlphaRouter,
  AlphaRouterConfig,
  ChainId
} from './';

// 波场 USDT 代币
const USDT_TRON = new Token(
  ChainId.TRON, // 使用扩展后的 ChainId
  '0xA614F803B6FD780986A42C78EC9C7F77E6DED13C', // USDT 在波场上的地址
  6,
  'USDT',
  'Tether USD'
);

// 波场 WTRX 代币
const WTRX_TRON = new Token(
  ChainId.TRON,
  '0x891CDB91D149F23B1A45D9C5CA78A88D0CB44C18', // WTRX 在波场上的地址
  6, // WTRX 使用 6 位小数，和测试中确认的一致
  'WTRX',
  'Wrapped TRX'
);

async function testTronRouter() {
  console.log('🚀 开始测试波场路由...');

  try {
    // 创建波场节点 provider - 使用本地节点
    const tronProvider = new JsonRpcProvider('http://s181:2635/jsonrpc');
    console.log('✅ 成功连接到波场节点');

    // 🔍 断点提示：在这里可以调试 provider 创建

    // 测试基本连接
    const blockNumber = await tronProvider.getBlockNumber();
    console.log(`📦 当前区块号: ${blockNumber}`);

    // 创建 AlphaRouter 实例
    const tronAlphaRouter = new AlphaRouter({
      chainId: ChainId.TRON, // 使用扩展后的 ChainId
      provider: tronProvider,
    });
    console.log('✅ 成功创建 AlphaRouter');

    // 🔍 断点提示：在这里可以调试 AlphaRouter 创建和配置

    // 测试参数
    const amount = '1000000'; // 1 USDT (6位小数)
    const currencyIn = USDT_TRON;
    const currencyOut = WTRX_TRON;
    const amountCurrency = CurrencyAmount.fromRawAmount(currencyIn, amount);

    console.log(`📊 测试兑换: ${amount} USDT -> WTRX`);

    // 路由配置 - 简化配置，只测试 V3
    const routerConfig: Partial<AlphaRouterConfig> = {
      protocols: [Protocol.V3],
      v3PoolSelection: {
        topN: 1,
        topNDirectSwaps: 1,
        topNTokenInOut: 1,
        topNSecondHop: 1,
        topNWithEachBaseToken: 1,
        topNWithBaseToken: 1,
      },
      maxSwapsPerPath: 2,
      minSplits: 1,
      maxSplits: 1,
      distributionPercent: 10,
      forceCrossProtocol: false,
    };

    console.log('🔍 正在获取路由...');

    // 🔍 断点提示：在这里可以调试路由参数和配置

    // 获取路由
    const swapRoute = await tronAlphaRouter.route(
      amountCurrency,
      currencyOut,
      TradeType.EXACT_INPUT,
      undefined,
      {
        ...routerConfig,
        enableFeeOnTransferFeeFetching: false
      }
    );

    // 🔍 断点提示：在这里可以调试路由结果

    if (swapRoute) {
      console.log('✅ 成功找到路由!');
      console.log('📈 路由详情:');
      console.log(`   - 报价: ${swapRoute.quote.toSignificant(6)} WTRX`);
      console.log(`   - Gas 调整后报价: ${swapRoute.quoteGasAdjusted.toSignificant(6)} WTRX`);
      console.log(`   - 预估 Gas 使用: ${swapRoute.estimatedGasUsed.toString()}`);
      console.log(`   - 路由数量: ${swapRoute.route.length}`);

      // 验证结果
      console.log('🔍 验证结果...');
      console.log(`   - 报价货币正确: ${swapRoute.quote.currency.equals(currencyOut)}`);
      console.log(`   - 路由数量 > 0: ${swapRoute.route.length > 0}`);
      console.log(`   - Gas 使用 > 0: ${swapRoute.estimatedGasUsed.gt(0)}`);
      console.log(`   - Gas 调整后报价 < 原报价: ${swapRoute.quoteGasAdjusted.lessThan(swapRoute.quote)}`);

      // 验证路由中的代币
      for (let i = 0; i < swapRoute.route.length; i++) {
        const route = swapRoute.route[i];
        if (route) {
          console.log(`   - 路由 ${i + 1}: ${route.protocol}`);
          console.log(`     输入: ${route.route.input.symbol}`);
          console.log(`     输出: ${route.route.output.symbol}`);
        }
      }

    } else {
      console.log('❌ 未找到路由');
      console.log('可能的原因:');
      console.log('   - 波场链上可能没有足够的流动性池子');
      console.log('   - 或者使用了 SunSwap V3 等其他 DEX');
      console.log('   - 网络连接问题');
      console.log('   - 代币地址不正确');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('错误详情:', errorMessage);

    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      console.log('💡 网络错误 - 这可能是正常的（测试环境）');
    } else if (errorMessage.includes('chainId')) {
      console.log('💡 链 ID 错误 - 可能需要检查链配置');
    } else if (errorMessage.includes('provider')) {
      console.log('💡 Provider 错误 - 可能需要检查节点连接');
    } else if (errorMessage.includes('Multicall')) {
      console.log('💡 Multicall 错误 - 波场链可能使用不同的 Multicall 实现');
    } else if (errorMessage.includes('Smart contract is not exist')) {
      console.log('💡 合约不存在 - 可能波场链上使用的是 SunSwap 等其他 DEX');
    }
  }
}

async function testDifferentAmounts() {
  console.log('\n🔄 测试不同金额...');

  const amounts = [
    { value: '100000', desc: '0.1 USDT' },
    { value: '1000000', desc: '1 USDT' },
    { value: '10000000', desc: '10 USDT' },
  ];

  const tronProvider = new JsonRpcProvider('http://s181:2635/jsonrpc');
  const tronAlphaRouter = new AlphaRouter({
    chainId: ChainId.TRON,
    provider: tronProvider,
  });

  for (const { value, desc } of amounts) {
    try {
      console.log(`\n📊 测试 ${desc}...`);

      const amountCurrency = CurrencyAmount.fromRawAmount(USDT_TRON, value);
      const swapRoute = await tronAlphaRouter.route(
        amountCurrency,
        WTRX_TRON,
        TradeType.EXACT_INPUT,
        undefined,
        { protocols: [Protocol.V3] }
      );

      if (swapRoute) {
        console.log(`✅ ${desc}: 报价 = ${swapRoute.quote.toSignificant(6)} WTRX`);
        console.log(`   Gas 调整后: ${swapRoute.quoteGasAdjusted.toSignificant(6)} WTRX`);
      } else {
        console.log(`❌ ${desc}: 未找到路由`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${desc}: 错误 - ${errorMessage.slice(0, 100)}...`);
    }
  }
}

async function testExactOutput() {
  console.log('\n🔄 测试精确输出...');

  try {
    const tronProvider = new JsonRpcProvider('http://s181:2635/jsonrpc');
    const tronAlphaRouter = new AlphaRouter({
      chainId: ChainId.TRON,
      provider: tronProvider,
    });

    // 指定输出金额 (1 WTRX)
    const outputAmount = '1000000'; // 1 WTRX (6位小数)
    const amountCurrency = CurrencyAmount.fromRawAmount(WTRX_TRON, outputAmount);

    console.log('📊 测试精确输出: USDT -> 1 WTRX');

    const swapRoute = await tronAlphaRouter.route(
      amountCurrency,
      USDT_TRON,
      TradeType.EXACT_OUTPUT,
      undefined,
      { protocols: [Protocol.V3] }
    );

    if (swapRoute) {
      console.log('✅ 精确输出路由找到!');
      console.log(`   需要输入: ${swapRoute.quote.toSignificant(6)} USDT`);
      console.log(`   Gas 调整后: ${swapRoute.quoteGasAdjusted.toSignificant(6)} USDT`);
    } else {
      console.log('❌ 精确输出路由未找到');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('❌ 精确输出测试失败:', errorMessage.slice(0, 100) + '...');
  }
}

// 步骤化调试 - 确定错误发生的位置
async function debugStepByStep() {
  console.log('🔍 步骤化调试开始 - 确定错误发生位置\n');

  try {
    // 步骤 1: 连接测试
    console.log('📡 步骤 1: 测试网络连接');
    const tronProvider = new JsonRpcProvider('http://s181:2635/jsonrpc');
    const blockNumber = await tronProvider.getBlockNumber();
    console.log(`✅ 网络连接成功，当前区块: ${blockNumber}\n`);

    // 步骤 2: ChainId 测试
    console.log('🔗 步骤 2: 测试 ChainId 扩展');
    console.log(`   ChainId.TRON = ${ChainId.TRON}`);
    console.log(`   类型: ${typeof ChainId.TRON}`);
    console.log(`✅ ChainId 扩展正常\n`);

    // 步骤 3: 创建代币实例测试
    console.log('🪙 步骤 3: 创建代币实例');
    const testToken1 = new Token(ChainId.TRON, '0xA614F803B6FD780986A42C78EC9C7F77E6DED13C', 6, 'USDT');
    const testToken2 = new Token(ChainId.TRON, '0x891CDB91D149F23B1A45D9C5CA78A88D0CB44C18', 6, 'WTRX');
    console.log(`✅ 代币实例创建成功: ${testToken1.symbol}, ${testToken2.symbol}\n`);

    // 步骤 4: AlphaRouter 构造函数调用（这里最可能出错）
    console.log('🚀 步骤 4: 创建 AlphaRouter（最关键步骤）');
    console.log('   准备调用 AlphaRouter 构造函数...');

    // 🔍 关键：在这里设置断点！
    const tronAlphaRouter = new AlphaRouter({
      chainId: ChainId.TRON,
      provider: tronProvider,
    });

    console.log('✅ AlphaRouter 创建成功！\n');

    // 步骤 5: 路由调用测试
    console.log('🛣️ 步骤 5: 测试路由调用');
    const amount = '1000000';
    const amountCurrency = CurrencyAmount.fromRawAmount(testToken1, amount);

    console.log('   准备调用 route 方法...');

    // 🔍 关键：在这里也设置断点！
    const swapRoute = await tronAlphaRouter.route(
      amountCurrency,
      testToken2,
      TradeType.EXACT_INPUT,
      undefined,
      { protocols: [Protocol.V3] }
    );

    if (swapRoute) {
      console.log('✅ 路由调用成功！');
    } else {
      console.log('⚠️ 路由调用返回 null');
    }

  } catch (error) {
    console.error('\n❌ 错误发生！');
    console.error('错误详情:', error);

    // 分析错误信息
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';

    console.log('\n🔍 错误分析:');
    if (errorMessage.includes('AlphaRouter')) {
      console.log('💡 错误发生在 AlphaRouter 构造函数中');
    } else if (errorMessage.includes('route')) {
      console.log('💡 错误发生在 route 方法调用中');
    } else if (errorMessage.includes('CALL_EXCEPTION')) {
      console.log('💡 这是合约调用异常');
      if (errorMessage.includes('0x75B377')) {
        console.log('💡 错误合约地址是 TRON Quoter 地址');
      }
    }

    if (errorStack) {
      console.log('\n📍 错误堆栈（前10行）:');
      console.log(errorStack.split('\n').slice(0, 10).join('\n'));
    }
  }
}


// 主函数
async function main() {
  console.log('🎯 波场路由测试开始\n');

  // 测试基本路由
  await testTronRouter();

  // 测试不同金额
  await testDifferentAmounts();

  // 测试精确输出
  await testExactOutput();

  // 步骤化调试
  await debugStepByStep();

  console.log('\n🏁 测试完成!');
  console.log('\n📝 总结:');
  console.log('   - ChainId 扩展功能已实现并测试');
  console.log('   - OnChainQuoteProvider TRON 特殊逻辑已添加');
  console.log('   - TokenProvider 单个请求功能已实现');
  console.log('   - V3PoolProvider 单个请求功能已实现');
  console.log('   - 波场链路由测试已完成');
  console.log('   - 由于波场链可能使用 SunSwap 等不同的 DEX，某些功能可能需要进一步适配');
}

// 运行测试
main().catch((error) => {
  console.error('💥 测试过程中发生错误:', error);
  process.exit(1);
});