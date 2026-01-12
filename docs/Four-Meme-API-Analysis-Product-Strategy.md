# Four.meme API 深度分析与产品策略文档

> 文档版本：2.0
> 更新日期：2025-01-12
> 基于 API 文档版本：30/10/2025

---

## 目录

1. [平台概述](#1-平台概述)
2. [智能合约架构分析](#2-智能合约架构分析)
3. [API 能力详解](#3-api-能力详解)
4. [官方 REST API](#4-官方-rest-api)
5. [第三方 API 服务](#5-第三方-api-服务)
6. [开源 SDK 与工具](#6-开源-sdk-与工具)
7. [可获取数据清单](#7-可获取数据清单)
8. [产品方向一：代币创建者分析工具](#8-产品方向一代币创建者分析工具)
9. [产品方向二至十一：其他产品机会](#9-产品方向二至十一其他产品机会)
10. [技术实现路线图](#10-技术实现路线图)
11. [竞品分析与差异化](#11-竞品分析与差异化)
12. [商业模式建议](#12-商业模式建议)
13. [资源链接汇总](#13-资源链接汇总)

---

## 1. 平台概述

### 1.1 Four.meme 是什么

Four.meme 是一个去中心化的 Meme 代币发行和交易协议，类似于 Solana 上的 Pump.fun，但部署在 EVM 兼容链上。名称来源于币安前 CEO CZ 著名的 "4" 梗。

**核心机制：**
- 用户可以创建新的 Meme 代币
- 代币通过 Bonding Curve（联合曲线）进行内部交易
- 当募资达到目标后，自动在 PancakeSwap 添加流动性
- 支持 X Mode（独家代币模式）

### 1.2 支持的区块链

| 链 | TokenManager V2 地址 | TokenManagerHelper3 地址 |
|----|---------------------|-------------------------|
| BSC (BNB Chain) | `0x5c952063c7fc8610FFDB798152D69F0B9550762b` | `0xF251F83e40a78868FcfA3FA4599Dad6494E46034` |
| Arbitrum One | - | `0x02287dc3CcA964a025DAaB1111135A46C10D3A57` |
| Base | - | `0x1172FABbAc4Fe05f5a5Cebd8EBBC593A76c42399` |

### 1.3 代币生命周期

```
┌─────────────────────────────────────────────────────────────────┐
│                      Four.meme 代币生命周期                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 创建阶段          2. 内盘交易阶段         3. DEX 阶段        │
│  ┌─────────┐         ┌─────────────┐        ┌──────────────┐   │
│  │TokenCreate│ ────▶ │ 用户买卖交易  │ ────▶ │ PancakeSwap  │   │
│  │  Event   │        │ (Bonding Curve)│      │  流动性池    │   │
│  └─────────┘         └─────────────┘        └──────────────┘   │
│       │                     │                      │            │
│       ▼                     ▼                      ▼            │
│  creator 地址         TokenPurchase          LiquidityAdded     │
│  token 地址           TokenSale              TradeStop          │
│  launchTime           价格变动                代币"毕业"        │
│                       募资进度                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 智能合约架构分析

### 2.1 合约体系

```
┌─────────────────────────────────────────────────────────────────┐
│                        合约架构                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ TokenManager V1 │    │ TokenManager V2 │                    │
│  │ (旧版，仅交易)   │    │ (新版，创建+交易) │                   │
│  │                 │    │                 │                    │
│  │ BSC:           │    │ BSC:           │                    │
│  │ 0xEC4549...    │    │ 0x5c952...     │                    │
│  └────────┬────────┘    └────────┬────────┘                    │
│           │                      │                              │
│           └──────────┬───────────┘                              │
│                      ▼                                          │
│           ┌─────────────────────┐                              │
│           │ TokenManagerHelper3 │                              │
│           │      (V3 封装)       │                              │
│           │                     │                              │
│           │ - getTokenInfo()    │                              │
│           │ - tryBuy()          │                              │
│           │ - trySell()         │                              │
│           │ - buyWithEth()      │                              │
│           │ - sellForEth()      │                              │
│           └─────────────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 V1 vs V2 对比

| 特性 | TokenManager V1 | TokenManager V2 |
|------|-----------------|-----------------|
| 创建新代币 | ❌ 不支持 | ✅ 支持 |
| 支持的代币 | 2024年9月5日前创建 | 2024年9月5日后创建 |
| 交易币种 | 仅 BNB | BNB + BEP20 |
| X Mode | ❌ 不支持 | ✅ 支持 |
| 第三方费用 | ❌ 不支持 | ✅ 支持 (最高5%) |
| 合约地址 (BSC) | `0xEC4549caDcE5DA21Df6E6422d448034B5233bFbC` | `0x5c952063c7fc8610FFDB798152D69F0B9550762b` |

### 2.3 X Mode (独家代币模式)

X Mode 是 2025年10月新增的特性，原名 "Binance MPC Wallet only Mode"。

**特点：**
- 独家代币需要特殊方法购买
- 需要使用 `buyToken(bytes args, uint256 time, bytes signature)` 方法
- 可通过 API 或链上方式识别

**识别方法：**

```solidity
// 链上识别
template = TokenManager2._tokenInfos[tokenAddress].template;
if (template & 0x10000 > 0) {
    // 是 X Mode 独家代币
}

// 链下识别
// API: https://four.meme/meme-api/v1/private/token/get?address=[token]
// 返回 version = "V8" 表示独家代币
```

---

## 3. API 能力详解

### 3.1 API 资源总览

Four.meme 生态有多种 API 获取方式：

```
┌─────────────────────────────────────────────────────────────────┐
│                    Four.meme API 资源总览                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    1. 智能合约 API                        │   │
│  │  直接与链上合约交互，获取实时数据和执行交易                  │   │
│  │  - TokenManager V1/V2: 交易执行                           │   │
│  │  - TokenManagerHelper3: 数据查询                          │   │
│  │  - 事件监听: TokenCreate, TokenPurchase, TokenSale 等     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    2. 官方 REST API                       │   │
│  │  Four.meme 官方提供，部分端点未公开文档                     │   │
│  │  - 基础 URL: https://four.meme/meme-api/v1/              │   │
│  │  - 代币信息、用户数据等                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 3. 第三方数据 API (Bitquery)              │   │
│  │  GraphQL 接口，提供丰富的链上数据分析能力                   │   │
│  │  - 实时交易数据 (WebSocket)                               │   │
│  │  - 历史数据查询                                           │   │
│  │  - 价格/OHLCV/持仓分析                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  4. 开源 SDK / 机器人                      │   │
│  │  GitHub 社区开源项目                                       │   │
│  │  - TypeScript SDK                                         │   │
│  │  - Sniper Bot / Copy Trade Bot                           │   │
│  │  - Bundler 工具                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 智能合约读取方法 (View Functions)

#### 3.2.1 getTokenInfo - 获取代币完整信息

```solidity
function getTokenInfo(address token) returns (
    uint256 version,        // TokenManager 版本 (1 或 2)
    address tokenManager,   // 管理该代币的合约地址
    address quote,          // 交易对币种 (0x0 = BNB, 其他 = BEP20)
    uint256 lastPrice,      // 最新价格
    uint256 tradingFeeRate, // 交易费率 (需除以 10000)
    uint256 minTradingFee,  // 最低交易费
    uint256 launchTime,     // 发布时间戳
    uint256 offers,         // 剩余可售代币数量
    uint256 maxOffers,      // 最大可售代币数量
    uint256 funds,          // 已募集资金
    uint256 maxFunds,       // 募资目标
    bool liquidityAdded     // 是否已上 PancakeSwap
)
```

**应用场景：**
- 查询代币当前状态
- 判断使用 V1 还是 V2 合约
- 计算募资进度百分比
- 判断代币是否已"毕业"

**数据价值：**
```
募资进度 = funds / maxFunds * 100%
售出进度 = (maxOffers - offers) / maxOffers * 100%
距离上DEX = maxFunds - funds
Bonding Curve 进度 = 100 - ((offers * 100) / maxOffers)
```

#### 3.2.2 tryBuy - 买入预估

```solidity
function tryBuy(address token, uint256 amount, uint256 funds) returns (
    address tokenManager,    // 使用的 TokenManager 地址
    address quote,           // 交易对币种
    uint256 estimatedAmount, // 预估获得代币数量
    uint256 estimatedCost,   // 预估花费
    uint256 estimatedFee,    // 预估手续费
    uint256 amountMsgValue,  // 调用时需要的 msg.value
    uint256 amountApproval,  // 需要授权的数量
    uint256 amountFunds      // buyTokenAMAP 的 funds 参数
)
```

**使用方式：**
```javascript
// 想买 10,000 个代币
tryBuy(tokenAddress, 10000 * 1e18, 0)

// 想花 10 BNB 买代币
tryBuy(tokenAddress, 0, 10 * 1e18)
```

#### 3.2.3 trySell - 卖出预估

```solidity
function trySell(address token, uint256 amount) returns (
    address tokenManager,  // 使用的 TokenManager 地址
    address quote,         // 交易对币种
    uint256 funds,         // 预估收到的资金
    uint256 fee            // 预估手续费
)
```

#### 3.2.4 calcInitialPrice - 计算初始价格

```solidity
function calcInitialPrice(
    uint256 maxRaising,   // 最大募资额
    uint256 totalSupply,  // 代币总供应量
    uint256 offers,       // 可售代币数量
    uint256 reserves      // 保留代币数量
) returns (uint256 priceWei)
```

### 3.3 智能合约交易方法 (Write Functions)

#### 3.3.1 买入方法

| 方法 | 用途 | 合约版本 |
|------|------|----------|
| `purchaseToken(token, amount, maxFunds)` | 买固定数量代币 | V1 |
| `purchaseTokenAMAP(token, funds, minAmount)` | 花固定金额买代币 | V1 |
| `buyToken(token, amount, maxFunds)` | 买固定数量代币 | V2 |
| `buyTokenAMAP(token, funds, minAmount)` | 花固定金额买代币 | V2 |
| `buyToken(bytes args, uint256 time, bytes signature)` | X Mode 购买 | V2 |
| `buyWithEth(origin, token, to, funds, minAmount)` | 用 BNB 买 ERC20 对代币 | Helper V3 |

#### 3.3.2 卖出方法

| 方法 | 用途 | 合约版本 |
|------|------|----------|
| `saleToken(token, amount)` | 基础卖出 | V1 |
| `sellToken(token, amount)` | 基础卖出 | V2 |
| `sellToken(..., feeRate, feeRecipient)` | 带第三方费用卖出 | V2 |
| `sellForEth(...)` | 卖出换 BNB (ERC20对) | Helper V3 |

### 3.4 智能合约事件 (Events)

#### 3.4.1 TokenCreate - 代币创建事件

```solidity
// V1 版本
event TokenCreate(
    address creator,      // 创建者地址 ⭐ 重要
    address token,        // 代币地址 ⭐ 重要
    uint256 requestId,    // 请求ID
    string name,          // 代币名称
    string symbol,        // 代币符号
    uint256 totalSupply,  // 总供应量
    uint256 launchTime    // 发布时间
);

// V2 版本 (多一个 launchFee)
event TokenCreate(
    address creator,
    address token,
    uint256 requestId,
    string name,
    string symbol,
    uint256 totalSupply,
    uint256 launchTime,
    uint256 launchFee     // 发布费用
);
```

**数据挖掘价值：**
- 追踪所有创建者地址
- 建立创建者画像
- 分析创建者行为模式

#### 3.4.2 TokenPurchase - 代币购买事件

```solidity
// V2 版本
event TokenPurchase(
    address token,    // 代币地址
    address account,  // 买家地址 ⭐ 重要
    uint256 price,    // 成交价格
    uint256 amount,   // 购买数量
    uint256 cost,     // 花费金额
    uint256 fee,      // 手续费
    uint256 offers,   // 剩余可售量
    uint256 funds     // 当前募资额
);
```

**数据挖掘价值：**
- 追踪早期买家
- 识别大户/鲸鱼
- 分析买入时机与价格

#### 3.4.3 TokenSale - 代币卖出事件

```solidity
event TokenSale(
    address token,    // 代币地址
    address account,  // 卖家地址 ⭐ 重要
    uint256 price,    // 成交价格
    uint256 amount,   // 卖出数量
    uint256 cost,     // 收到金额
    uint256 fee,      // 手续费
    uint256 offers,   // 剩余可售量
    uint256 funds     // 当前募资额
);
```

**数据挖掘价值：**
- 追踪卖出行为
- 识别创建者是否抛售
- 分析抛压来源

#### 3.4.4 LiquidityAdded - 流动性添加事件

```solidity
event LiquidityAdded(
    address base,     // 代币地址
    uint256 offers,   // 添加的代币数量
    address quote,    // 交易对币种
    uint256 funds     // 添加的资金数量
);
```

**数据挖掘价值：**
- 代币"毕业"时刻
- 上 DEX 的初始流动性
- 套利机会窗口

#### 3.4.5 TradeStop - 交易停止事件

```solidity
event TradeStop(address token);
```

**含义：** 代币在 Four.meme 内部交易停止，已转移至 DEX

---

## 4. 官方 REST API

### 4.1 已知端点

Four.meme 官方提供了 REST API，但未公开完整文档。以下是已知的端点：

**基础 URL：** `https://four.meme/meme-api/v1/`

#### 4.1.1 代币信息查询

```http
# 通过代币地址查询
GET https://four.meme/meme-api/v1/private/token/get?address={token_address}

# 通过 requestId 查询 (来自 TokenCreate 事件)
GET https://four.meme/meme-api/v1/private/token/getById?id={requestId}
```

**返回数据字段（推测）：**
```json
{
  "code": 0,
  "data": {
    "address": "0x...",
    "name": "TokenName",
    "symbol": "TKN",
    "creator": "0x...",
    "version": "V8",        // V8 = X Mode 独家代币
    "totalSupply": "1000000000000000000000000000",
    "launchTime": 1704067200,
    "status": "active",
    "progress": 75.5,
    "imageUrl": "https://...",
    "description": "..."
  }
}
```

### 4.2 可能存在的其他端点（需抓包确认）

| 端点（推测） | 用途 |
|-------------|------|
| `/private/token/list` | 获取代币列表 |
| `/private/token/trending` | 热门/趋势代币 |
| `/private/token/new` | 最新创建的代币 |
| `/private/trade/history` | 交易历史记录 |
| `/private/user/profile` | 用户信息 |
| `/private/user/holdings` | 用户持仓 |
| `/private/stats/overview` | 平台统计数据 |

### 4.3 如何发现更多端点

1. **浏览器开发者工具抓包**
   - 打开 https://four.meme
   - F12 → Network → XHR
   - 浏览网站各功能，观察请求

2. **移动端抓包**
   - 使用 Charles/Fiddler 代理
   - 分析移动端 API 请求

3. **JavaScript 源码分析**
   - 分析前端打包文件
   - 搜索 API 端点字符串

---

## 5. 第三方 API 服务

### 5.1 Bitquery GraphQL API

Bitquery 提供了最完整的 Four.meme 链上数据 API。

**官方文档：** https://docs.bitquery.io/docs/blockchain/BSC/four-meme-api/

**特点：**
- GraphQL 查询语言，灵活获取所需数据
- 支持实时订阅 (WebSocket)
- 支持历史数据查询
- 多种数据格式 (GraphQL, Streams, Kafka)

#### 5.1.1 获取 API 访问

1. 注册 Bitquery 账号：https://bitquery.io/
2. 获取 API Key (Access Token)
3. 免费套餐有请求限制

#### 5.1.2 GraphQL 查询示例

**查询 Four.meme 最新交易：**

```graphql
{
  EVM(dataset: combined, network: bsc) {
    DEXTradeByTokens(
      where: {
        Trade: {
          Dex: {
            ProtocolName: {is: "fourmeme_v1"}
          }
        }
      }
      limit: {count: 100}
      orderBy: {descending: Block_Time}
    ) {
      Trade {
        Currency {
          Symbol
          Name
          SmartContract
        }
        Price
        Amount
        Side {
          Currency {
            Symbol
          }
          Amount
        }
        Buyer
        Seller
      }
      Transaction {
        Hash
      }
      Block {
        Time
        Number
      }
    }
  }
}
```

**查询特定代币的交易历史：**

```graphql
{
  EVM(dataset: combined, network: bsc) {
    DEXTradeByTokens(
      where: {
        Trade: {
          Currency: {
            SmartContract: {is: "0x代币地址"}
          }
          Dex: {
            ProtocolName: {is: "fourmeme_v1"}
          }
        }
      }
      orderBy: {descending: Block_Time}
    ) {
      Trade {
        Price
        Amount
        Buyer
        Seller
      }
      Block {
        Time
      }
    }
  }
}
```

**实时订阅新交易 (WebSocket)：**

```graphql
subscription {
  EVM(network: bsc) {
    DEXTradeByTokens(
      where: {
        Trade: {
          Dex: {
            ProtocolName: {is: "fourmeme_v1"}
          }
        }
      }
    ) {
      Trade {
        Currency {
          Symbol
          SmartContract
        }
        Price
        Amount
        Buyer
        Seller
      }
      Transaction {
        Hash
      }
    }
  }
}
```

**查询新创建的代币：**

```graphql
{
  EVM(dataset: combined, network: bsc) {
    Events(
      where: {
        Log: {
          SmartContract: {is: "0x5c952063c7fc8610FFDB798152D69F0B9550762b"}
          Signature: {Name: {is: "TokenCreate"}}
        }
      }
      orderBy: {descending: Block_Time}
      limit: {count: 50}
    ) {
      Log {
        Signature {
          Name
        }
      }
      Arguments {
        Name
        Value {
          ... on EVM_ABI_Integer_Value_Arg {
            integer
          }
          ... on EVM_ABI_String_Value_Arg {
            string
          }
          ... on EVM_ABI_Address_Value_Arg {
            address
          }
        }
      }
      Block {
        Time
        Number
      }
      Transaction {
        Hash
      }
    }
  }
}
```

**查询 Bonding Curve 进度：**

```
Bonding Curve 进度计算公式:
progress = 100 - ((leftTokens * 100) / initialRealTokenReserves)

其中:
- leftTokens = getTokenInfo().offers
- initialRealTokenReserves = getTokenInfo().maxOffers
```

#### 5.1.3 Bitquery 数据能力总结

| 数据类型 | 支持情况 | 说明 |
|----------|----------|------|
| 实时交易 | ✅ | WebSocket 订阅 |
| 历史交易 | ✅ | GraphQL 查询 |
| 新代币创建 | ✅ | TokenCreate 事件 |
| 价格/OHLCV | ✅ | 可自定义时间间隔 |
| 持仓分析 | ✅ | Top Holders |
| 开发者追踪 | ✅ | 通过 mint 交易识别 |
| 流动性迁移 | ✅ | PairCreated 事件 |
| 大额交易 | ✅ | 自定义过滤条件 |

#### 5.1.4 Bitquery 定价

| 套餐 | 价格 | 请求限制 |
|------|------|----------|
| Free | $0 | 有限制 |
| Developer | $49/月起 | 更高限额 |
| Professional | 定制 | 无限制 |

### 5.2 其他数据源

| 数据源 | 类型 | 用途 |
|--------|------|------|
| Dune Analytics | 仪表板 | 宏观数据分析 |
| DEXScreener | 图表 | 价格走势 |
| GeckoTerminal | 图表 | 代币信息 |
| BscScan | 区块浏览器 | 交易详情 |

---

## 6. 开源 SDK 与工具

### 6.1 GitHub 开源项目

GitHub 上有大量 Four.meme 相关的开源项目，主要集中在交易机器人领域。

**相关 Topic：**
- https://github.com/topics/fourmeme
- https://github.com/topics/fourmeme-bot
- https://github.com/topics/fourmeme-trading-bot
- https://github.com/topics/fourmeme-bundler

#### 6.1.1 主要项目列表

| 项目 | Stars | 功能 | 语言 | 链接 |
|------|-------|------|------|------|
| pancakeswap-sniper-bot | 566 | 新币狙击、流动池监控 | TypeScript | GitHub |
| bsc-fourmeme-bot | 551 | 交易机器人 | TypeScript | GitHub |
| BNB-Bundler-Bot-Fourmeme | 190 | 捆绑交易工具 | TypeScript | GitHub |
| BNB-Fourmeme-Bundle-Trading-Bot | 155 | 捆绑交易 | TypeScript | GitHub |
| Bsc-FourMeme-Trading-Bot | - | 狙击/复制交易/交易量机器人 | TypeScript | [链接](https://github.com/Novus-Tech-LLC/Bsc-FourMeme-Trading-Bot) |
| bsc-mcp | - | MCP 工具服务器 | TypeScript | [链接](https://github.com/TermiX-official/bsc-mcp) |
| fourmeme-sniper-bot-hybrid | - | 混合狙击机器人 | Rust + TS | GitHub |

#### 6.1.2 功能分类

**1. 狙击机器人 (Sniper Bot)**
- 监听 TokenCreate 事件
- 自动买入新代币
- 支持过滤条件设置
- 低延迟执行

**2. 复制交易 (Copy Trade)**
- 追踪目标钱包交易
- 自动复制买卖操作
- 可配置跟单比例

**3. 捆绑交易 (Bundler)**
- 批量钱包管理
- 代币分发
- 流动性操作

**4. 交易量机器人 (Volume Bot)**
- 自动生成交易量
- 隐形模式规避检测
- 多钱包轮转

### 6.2 SDK 使用示例

**TypeScript SDK 基础用法（示例）：**

```typescript
import { ethers } from 'ethers';

// 合约地址
const TOKEN_MANAGER_V2 = '0x5c952063c7fc8610FFDB798152D69F0B9550762b';
const TOKEN_MANAGER_HELPER = '0xF251F83e40a78868FcfA3FA4599Dad6494E46034';

// 连接 BSC
const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');

// Helper ABI (简化版)
const HELPER_ABI = [
  'function getTokenInfo(address token) view returns (uint256 version, address tokenManager, address quote, uint256 lastPrice, uint256 tradingFeeRate, uint256 minTradingFee, uint256 launchTime, uint256 offers, uint256 maxOffers, uint256 funds, uint256 maxFunds, bool liquidityAdded)',
  'function tryBuy(address token, uint256 amount, uint256 funds) view returns (address tokenManager, address quote, uint256 estimatedAmount, uint256 estimatedCost, uint256 estimatedFee, uint256 amountMsgValue, uint256 amountApproval, uint256 amountFunds)',
  'function trySell(address token, uint256 amount) view returns (address tokenManager, address quote, uint256 funds, uint256 fee)'
];

// 创建合约实例
const helper = new ethers.Contract(TOKEN_MANAGER_HELPER, HELPER_ABI, provider);

// 查询代币信息
async function getTokenInfo(tokenAddress: string) {
  const info = await helper.getTokenInfo(tokenAddress);
  return {
    version: info.version.toString(),
    lastPrice: ethers.formatEther(info.lastPrice),
    progress: (Number(info.funds) / Number(info.maxFunds) * 100).toFixed(2) + '%',
    liquidityAdded: info.liquidityAdded
  };
}

// 预估买入
async function estimateBuy(tokenAddress: string, bnbAmount: string) {
  const funds = ethers.parseEther(bnbAmount);
  const result = await helper.tryBuy(tokenAddress, 0, funds);
  return {
    estimatedTokens: ethers.formatEther(result.estimatedAmount),
    estimatedCost: ethers.formatEther(result.estimatedCost),
    fee: ethers.formatEther(result.estimatedFee)
  };
}
```

**监听事件示例：**

```typescript
// TokenManager V2 事件 ABI
const EVENTS_ABI = [
  'event TokenCreate(address creator, address token, uint256 requestId, string name, string symbol, uint256 totalSupply, uint256 launchTime, uint256 launchFee)',
  'event TokenPurchase(address token, address account, uint256 price, uint256 amount, uint256 cost, uint256 fee, uint256 offers, uint256 funds)',
  'event TokenSale(address token, address account, uint256 price, uint256 amount, uint256 cost, uint256 fee, uint256 offers, uint256 funds)',
  'event LiquidityAdded(address base, uint256 offers, address quote, uint256 funds)',
  'event TradeStop(address token)'
];

const tokenManager = new ethers.Contract(TOKEN_MANAGER_V2, EVENTS_ABI, provider);

// 监听新代币创建
tokenManager.on('TokenCreate', (creator, token, requestId, name, symbol, totalSupply, launchTime, launchFee) => {
  console.log(`🆕 新代币创建: ${name} (${symbol})`);
  console.log(`   地址: ${token}`);
  console.log(`   创建者: ${creator}`);
});

// 监听购买事件
tokenManager.on('TokenPurchase', (token, account, price, amount, cost, fee, offers, funds) => {
  console.log(`💰 购买: ${ethers.formatEther(amount)} tokens`);
  console.log(`   花费: ${ethers.formatEther(cost)} BNB`);
});

// 监听流动性添加 (毕业)
tokenManager.on('LiquidityAdded', (base, offers, quote, funds) => {
  console.log(`🎓 代币毕业: ${base}`);
  console.log(`   流动性: ${ethers.formatEther(funds)} BNB`);
});
```

### 6.3 技术栈推荐

| 用途 | 推荐技术 | 说明 |
|------|----------|------|
| 合约交互 | ethers.js v6 / viem | 现代化 Web3 库 |
| RPC 服务 | QuickNode / Alchemy / 自建节点 | 低延迟要求用自建 |
| 事件索引 | TheGraph / 自建 Indexer | 历史数据用 TheGraph |
| 后端 | Node.js + TypeScript | 生态成熟 |
| 数据库 | PostgreSQL | 结构化数据 |
| 缓存 | Redis | 高频数据 |
| 消息队列 | Bull / BullMQ | 任务调度 |

---

## 7. 可获取数据清单

### 7.1 数据来源对比

| 数据类型 | 智能合约 | 官方 API | Bitquery | 开源 SDK |
|----------|:--------:|:--------:|:--------:|:--------:|
| 代币基本信息 | ✅ | ✅ | ✅ | ✅ |
| 实时价格 | ✅ | ❓ | ✅ | ✅ |
| 交易历史 | ✅ 事件 | ❓ | ✅ | ✅ |
| 创建者地址 | ✅ | ✅ | ✅ | ✅ |
| 募资进度 | ✅ | ❓ | ✅ | ✅ |
| 持仓分布 | ❌ | ❓ | ✅ | ❌ |
| 代币元数据 | ❌ | ✅ | ❌ | ❌ |
| 历史 OHLCV | ❌ | ❌ | ✅ | ❌ |
| 实时订阅 | ✅ | ❌ | ✅ | ✅ |

### 7.2 链上可直接获取的数据

| 数据类型 | 获取方式 | 用途 |
|----------|----------|------|
| 所有已创建代币列表 | 监听 `TokenCreate` 事件 | 代币数据库 |
| 代币创建者地址 | `TokenCreate.creator` | 创建者分析 |
| 代币基本信息 | `TokenCreate` 参数 | 代币展示 |
| 所有交易记录 | 监听 `TokenPurchase/TokenSale` | 交易分析 |
| 买卖双方地址 | 事件中的 `account` | 用户画像 |
| 实时价格 | `getTokenInfo().lastPrice` | 价格展示 |
| 募资进度 | `getTokenInfo().funds/maxFunds` | 进度展示 |
| 代币状态 | `getTokenInfo().liquidityAdded` | 状态判断 |
| 上DEX时刻 | `LiquidityAdded` 事件 | 毕业提醒 |

### 7.3 可计算/衍生的数据

| 衍生数据 | 计算方式 | 用途 |
|----------|----------|------|
| 创建者历史成功率 | 统计同一 creator 的代币毕业率 | 风险评估 |
| 早期买家胜率 | 追踪早期买家的盈亏 | 聪明钱识别 |
| 代币存活时间 | launchTime 到 TradeStop 时间差 | 项目质量 |
| 价格变化曲线 | 聚合 Purchase/Sale 事件的 price | 技术分析 |
| 买卖比例 | Purchase 次数 / Sale 次数 | 情绪分析 |
| 鲸鱼占比 | 大额交易 / 总交易 | 集中度分析 |
| 创建者持仓变化 | 追踪 creator 的买卖行为 | Rug 预警 |
| 市值 | Total Supply * Price | 排名 |
| ATH (历史最高) | 价格百分位分析 | 技术指标 |

---

## 8. 产品方向一：代币创建者分析工具

### 8.1 产品定位

**一句话描述：** Four.meme 创建者信用评估系统 + 浏览器插件

**解决的痛点：**
- 用户无法快速判断代币创建者是否可信
- 没有工具追踪创建者的历史记录
- 缺乏 Rug Pull 风险预警

**目标用户：**
- Four.meme 散户投资者
- 链上数据分析师
- Meme 代币猎手

### 8.2 核心功能设计

#### 8.2.1 创建者画像系统

```
┌─────────────────────────────────────────────────────────────────┐
│                     创建者画像卡片                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  地址: 0x1234...5678                             │
│  │  头像    │  首次创建: 2024-10-15                             │
│  │ (Blockie)│  创建代币数: 23                                   │
│  └──────────┘  毕业代币数: 8 (34.8%)                            │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │ 信用评分: 72/100  ████████░░            │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  风险标签:                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │ 活跃创建者 │ │ 无跑路记录 │ │ 中等持仓  │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
│                                                                 │
│  历史代币表现:                                                   │
│  ┌────────┬──────────┬────────┬──────────┐                     │
│  │ 代币   │ 创建时间  │ 状态   │ 最高涨幅  │                     │
│  ├────────┼──────────┼────────┼──────────┤                     │
│  │ PEPE2  │ 2024-12-01│ 已毕业 │ +1,200%  │                     │
│  │ DOGE3  │ 2024-11-15│ 已毕业 │ +500%    │                     │
│  │ SHIB4  │ 2024-11-01│ 失败   │ -80%     │                     │
│  └────────┴──────────┴────────┴──────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 8.2.2 信用评分算法

```
总分 = 100 分

1. 毕业率评分 (30分)
   - 毕业率 > 50%: 30分
   - 毕业率 30-50%: 20分
   - 毕业率 10-30%: 10分
   - 毕业率 < 10%: 0分

2. 历史记录评分 (25分)
   - 创建 > 10 个代币: 25分
   - 创建 5-10 个代币: 15分
   - 创建 1-5 个代币: 5分
   - 首次创建: 0分

3. 持仓行为评分 (25分)
   - 从不卖出: 25分
   - 毕业后卖出: 20分
   - 毕业前卖出部分: 10分
   - 早期大量抛售: 0分

4. 时间活跃度 (10分)
   - 持续活跃 > 3个月: 10分
   - 活跃 1-3个月: 5分
   - 新用户: 0分

5. 社区反馈 (10分)
   - 用户举报/点赞系统
```

#### 8.2.3 浏览器插件功能

**注入位置：** four.meme 代币详情页

```
┌─────────────────────────────────────────────────────────────────┐
│  Four.meme 代币页面                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  代币: PEPE2000                                                 │
│  创建者: 0x1234...5678                                          │
│                                                                 │
│  ┌─────────────────────────────────────────┐ ◀── 插件注入区域   │
│  │ 创建者分析 (by FourMeme Tools)          │                   │
│  ├─────────────────────────────────────────┤                   │
│  │ 信用评分: 72/100 ★★★★☆                  │                   │
│  │ 历史代币: 23个 | 毕业: 8个 (34.8%)       │                   │
│  │ 风险等级: 中等                           │                   │
│  │                                         │                   │
│  │ [查看详情] [关注创建者] [设置提醒]       │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  ... 原始页面内容 ...                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 8.2.4 提醒系统

**提醒类型：**

| 提醒类型 | 触发条件 | 通知方式 |
|----------|----------|----------|
| 新币提醒 | 关注的创建者发布新代币 | 推送/TG/Email |
| 风险提醒 | 创建者开始大量卖出 | 推送/TG |
| 毕业提醒 | 代币即将/已经上 DEX | 推送/TG |
| 价格提醒 | 价格达到设定阈值 | 推送/TG |

### 8.3 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        系统架构                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   BSC 节点   │     │ Arbitrum 节点│     │  Base 节点  │       │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘       │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             ▼                                   │
│                    ┌─────────────────┐                         │
│                    │   Event Indexer │                         │
│                    │  (事件索引服务)  │                         │
│                    └────────┬────────┘                         │
│                             │                                   │
│                             ▼                                   │
│                    ┌─────────────────┐                         │
│                    │    Database     │                         │
│                    │  (PostgreSQL)   │                         │
│                    │                 │                         │
│                    │ - creators      │                         │
│                    │ - tokens        │                         │
│                    │ - transactions  │                         │
│                    │ - scores        │                         │
│                    └────────┬────────┘                         │
│                             │                                   │
│              ┌──────────────┼──────────────┐                   │
│              ▼              ▼              ▼                   │
│      ┌────────────┐ ┌────────────┐ ┌────────────┐             │
│      │  REST API  │ │ WebSocket  │ │ Score Calc │             │
│      │   Server   │ │   Server   │ │  Service   │             │
│      └─────┬──────┘ └─────┬──────┘ └────────────┘             │
│            │              │                                     │
│            └──────────────┘                                     │
│                   │                                             │
│     ┌─────────────┼─────────────┐                              │
│     ▼             ▼             ▼                              │
│ ┌────────┐  ┌──────────┐  ┌──────────┐                        │
│ │ Chrome │  │   Web    │  │ Telegram │                        │
│ │ 插件   │  │  Dashboard│  │   Bot    │                        │
│ └────────┘  └──────────┘  └──────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.4 数据库设计

```sql
-- 创建者表
CREATE TABLE creators (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) UNIQUE NOT NULL,
    first_seen_at TIMESTAMP NOT NULL,
    total_tokens_created INTEGER DEFAULT 0,
    graduated_tokens INTEGER DEFAULT 0,
    failed_tokens INTEGER DEFAULT 0,
    credit_score INTEGER DEFAULT 50,
    risk_level VARCHAR(20) DEFAULT 'unknown',
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 代币表
CREATE TABLE tokens (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) UNIQUE NOT NULL,
    creator_address VARCHAR(42) NOT NULL,
    chain VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    symbol VARCHAR(20),
    total_supply NUMERIC(78, 0),
    launch_time TIMESTAMP,
    launch_fee NUMERIC(78, 0),
    status VARCHAR(20) DEFAULT 'active', -- active, graduated, failed
    graduated_at TIMESTAMP,
    max_price NUMERIC(78, 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_address) REFERENCES creators(address)
);

-- 交易表
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(42) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    tx_type VARCHAR(10) NOT NULL, -- buy, sell
    account VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0),
    cost NUMERIC(78, 0),
    price NUMERIC(78, 0),
    fee NUMERIC(78, 0),
    timestamp TIMESTAMP NOT NULL,
    FOREIGN KEY (token_address) REFERENCES tokens(address)
);

-- 用户关注表
CREATE TABLE user_watchlist (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    creator_address VARCHAR(42) NOT NULL,
    alert_new_token BOOLEAN DEFAULT TRUE,
    alert_sell BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建者行为记录表
CREATE TABLE creator_behaviors (
    id SERIAL PRIMARY KEY,
    creator_address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    behavior_type VARCHAR(50), -- early_sell, hold, gradual_sell
    sell_percentage NUMERIC(5, 2),
    timing VARCHAR(20), -- before_graduation, after_graduation
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_tokens_creator ON tokens(creator_address);
CREATE INDEX idx_tokens_status ON tokens(status);
CREATE INDEX idx_transactions_token ON transactions(token_address);
CREATE INDEX idx_transactions_account ON transactions(account);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
```

### 8.5 开发路线图

**Phase 1: MVP**
- [ ] 事件索引服务 (BSC)
- [ ] 基础数据库和 API
- [ ] 简单的信用评分算法
- [ ] Chrome 插件 v1 (显示基础信息)

**Phase 2: 完善功能**
- [ ] 多链支持 (Arbitrum, Base)
- [ ] 高级评分算法
- [ ] 关注和提醒系统
- [ ] Web Dashboard

**Phase 3: 增强**
- [ ] Telegram Bot
- [ ] 历史数据回填
- [ ] 用户反馈系统
- [ ] API 开放

---

## 9. 产品方向二至十一：其他产品机会

### 9.1 产品方向二：新币狙击机器人 (Sniper Bot)

**产品定位：** 智能化的 Four.meme 新币自动购买系统

**核心功能：**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Sniper Bot 工作流程                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 监听 TokenCreate 事件                                       │
│           │                                                     │
│           ▼                                                     │
│  2. 获取创建者信息                                               │
│           │                                                     │
│           ▼                                                     │
│  3. 评分判断 ───────────────────┐                               │
│           │                     │                               │
│     评分 > 阈值            评分 < 阈值                           │
│           │                     │                               │
│           ▼                     ▼                               │
│  4. 自动买入               跳过/记录                             │
│           │                                                     │
│           ▼                                                     │
│  5. 设置止盈止损                                                 │
│           │                                                     │
│           ▼                                                     │
│  6. 自动卖出                                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**差异化价值：**
- 不是纯抢速度，而是结合创建者评分
- 智能风控系统
- 可配置策略

**技术要点：**
- 低延迟节点连接
- MEV 保护 (Flashbots)
- 钱包安全管理

**商业模式：**
- 订阅制：$50-200/月
- 利润分成：盈利的 5-10%

---

### 9.2 产品方向三：募资进度实时仪表板

**产品定位：** Four.meme 代币募资状态可视化平台

**核心功能：**

```
┌─────────────────────────────────────────────────────────────────┐
│                    募资进度仪表板                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  筛选: [链: BSC ▼] [排序: 进度 ▼] [状态: 活跃 ▼]                │
│                                                                 │
│  即将毕业 (>90%):                                               │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ PEPE2000  进度: 95% ████████████████████░ 剩余: 2.5 BNB    │    │
│  │ DOGE3000  进度: 92% ███████████████████░░ 剩余: 4.1 BNB    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  热门代币 (50-90%):                                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │    SHIB4     进度: 75% ███████████████░░░░░ 剩余: 12 BNB   │    │
│  │    FLOKI2    进度: 68% █████████████░░░░░░░ 剩余: 16 BNB   │    │
│  │    WOJAK     进度: 55% ███████████░░░░░░░░░ 剩余: 22 BNB   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  新币 (<50%):                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │    NEWCOIN   进度: 12% ██░░░░░░░░░░░░░░░░░░ 剩余: 44 BNB   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**核心价值：**
- 发现即将"毕业"的代币
- 预判上 DEX 时间窗口
- 早期布局机会

**技术实现：**
- 实时调用 `getTokenInfo()`
- WebSocket 推送更新
- 历史毕业数据分析

**商业模式：**
- 免费基础版
- Pro 版本：提前提醒、API 访问 $20/月

---

### 9.3 产品方向四：聪明钱追踪器

**产品定位：** Four.meme 生态的"聪明钱"地址追踪和提醒系统

**核心逻辑：**

```
┌─────────────────────────────────────────────────────────────────┐
│                   聪明钱识别流程                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: 收集所有 TokenPurchase 事件                            │
│                                                                 │
│  Step 2: 对每个买家地址计算胜率                                  │
│          胜率 = 盈利代币数 / 总购买代币数                         │
│                                                                 │
│  Step 3: 筛选聪明钱                                              │
│          - 胜率 > 60%                                           │
│          - 交易次数 > 10                                        │
│          - 平均盈利 > 50%                                       │
│                                                                 │
│  Step 4: 追踪聪明钱的新交易                                      │
│                                                                 │
│  Step 5: 当聪明钱买入新币时发送提醒                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**功能设计：**

| 功能 | 描述 |
|------|------|
| 聪明钱排行榜 | 按胜率、盈利额排序 |
| 地址详情 | 历史交易记录、盈亏分析 |
| 实时追踪 | 聪明钱买入即时通知 |
| 复制交易 | 一键跟单功能 |

**商业模式：**
- 免费版：查看排行榜
- Pro 版：实时提醒 $30/月
- VIP 版：自动跟单 $100/月

---

### 9.4 产品方向五：流动性添加提醒服务

**产品定位：** 代币"毕业"关键时刻的精准提醒系统

**核心价值：**
- 代币从 Four.meme 内盘转到 PancakeSwap 是关键时刻
- 价格可能大幅波动
- 存在套利机会

**监听事件：**
- `LiquidityAdded` - 流动性已添加
- `TradeStop` - 内盘交易停止

**功能设计：**

```
提醒时机:
1. 代币募资进度 > 95% - "即将毕业"提醒
2. LiquidityAdded 事件 - "已毕业"提醒
3. DEX vs 内盘价差 > 5% - "套利机会"提醒
```

**商业模式：**
- Telegram Bot 免费
- 高级提醒（提前、更多币种）$10/月

---

### 9.5 产品方向六：多链代币聚合比价平台

**产品定位：** 跨 BSC/Arbitrum/Base 的 Four.meme 代币聚合器

**核心功能：**

```
┌─────────────────────────────────────────────────────────────────┐
│                    多链聚合仪表板                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  链统计:                                                        │
│  ┌──────────────┬──────────────┬──────────────┐                │
│  │     BSC      │   Arbitrum   │     Base     │                │
│  ├──────────────┼──────────────┼──────────────┤                │
│  │ 代币: 5,234  │ 代币: 1,892  │ 代币: 987    │                │
│  │ 日交易: $2.3M│ 日交易: $890K│ 日交易: $450K│                │
│  │ 毕业率: 12%  │ 毕业率: 15%  │ 毕业率: 18%  │                │
│  └──────────────┴──────────────┴──────────────┘                │
│                                                                 │
│  热门跨链对比:                                                   │
│  ┌─────────┬─────────┬─────────┬─────────┐                     │
│  │ 代币名  │ BSC价格 │ ARB价格 │  价差   │                     │
│  ├─────────┼─────────┼─────────┼─────────┤                     │
│  │ PEPE    │ $0.0012 │ $0.0014 │ +16.7%  │                     │
│  │ DOGE    │ $0.0008 │ $0.0007 │ -12.5%  │                     │
│  └─────────┴─────────┴─────────┴─────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**差异化：** 目前市面上没有跨链 Four.meme 聚合器

**商业模式：**
- 广告收入
- Pro 版本订阅

---

### 9.6 产品方向七：内外盘套利工具

**产品定位：** Four.meme 内盘与 PancakeSwap 之间的价格差异监控和套利工具

**套利逻辑：**

```
场景 1: 毕业前后价差
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Four.meme 内盘价格: $0.001                                     │
│           │                                                     │
│           │ 毕业 (LiquidityAdded)                               │
│           ▼                                                     │
│  PancakeSwap 开盘价: $0.0015 (+50%)                            │
│                                                                 │
│  套利: 毕业前买入，毕业后立即在 DEX 卖出                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**技术实现：**
- 实时对比 `getTokenInfo().lastPrice` 和 PancakeSwap 价格
- 计算滑点和手续费后的真实利润
- 自动执行套利交易

**商业模式：**
- 利润分成: 20%

---

### 9.7 产品方向八：代币创建一键工具

**产品定位：** 简化版的 Four.meme 代币创建服务

**核心功能：**

```
┌─────────────────────────────────────────────────────────────────┐
│                    一键发币工具                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: 基本信息                                               │
│  ┌─────────────────────────────────────────┐                   │
│  │ 代币名称: [________________]            │                   │
│  │ 代币符号: [________________]            │                   │
│  │ 描述:     [________________]            │                   │
│  │ Logo:     [上传图片]                    │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  Step 2: 经济模型 (自动优化)                                    │
│  ┌─────────────────────────────────────────┐                   │
│  │ 总供应量:  1,000,000,000                │                   │
│  │ 募资目标:  50 BNB (推荐)                │                   │
│  │ 预估初始价格: 0.00000005 BNB            │                   │
│  │                                         │                   │
│  │ [使用 calcInitialPrice 计算]            │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  [创建代币] 费用: 0.1 BNB + Gas                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**差异化：**
- 比官方更友好的 UI
- 自动经济模型优化
- 营销工具包

**商业模式：**
- 服务费: $10-50/次
- 增值服务收费

---

### 9.8 产品方向九：投资组合追踪 & 盈亏分析

**产品定位：** Four.meme 专属的持仓管理和税务工具

**核心功能：**

```
┌─────────────────────────────────────────────────────────────────┐
│                    投资组合仪表板                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  钱包: 0x1234...5678                                            │
│                                                                 │
│  总投入: 5.5 BNB | 当前价值: 8.2 BNB | 盈亏: +2.7 BNB (+49%)    │
│                                                                 │
│  持仓明细:                                                       │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┐       │
│  │ 代币   │ 数量   │ 成本   │ 现价   │ 价值   │ 盈亏   │       │
│  ├────────┼────────┼────────┼────────┼────────┼────────┤       │
│  │ PEPE2  │ 1M     │ 1 BNB  │ +120%  │ 2.2 BNB│ +1.2   │       │
│  │ DOGE3  │ 500K   │ 0.5 BNB│ +80%   │ 0.9 BNB│ +0.4   │       │
│  │ SHIB4  │ 2M     │ 2 BNB  │ -30%   │ 1.4 BNB│ -0.6   │       │
│  └────────┴────────┴────────┴────────┴────────┴────────┘       │
│                                                                 │
│  [导出税务报告] [分享战绩] [设置提醒]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**技术实现：**
- 解析用户地址的所有 `TokenPurchase`/`TokenSale` 事件
- 计算平均成本、盈亏
- 生成税务报告

**商业模式：**
- 免费版：基础追踪
- Pro 版：税务报告、多钱包 $10/月

---

### 9.9 产品方向十：大额交易警报服务 (Whale Alert)

**产品定位：** Four.meme 版的"鲸鱼警报"

**核心功能：**

```
监控逻辑:
1. 监听所有 TokenPurchase/TokenSale 事件
2. 筛选大额交易 (> X BNB)
3. 实时推送到 Telegram/Discord

推送格式:
┌─────────────────────────────────────────────────────────────────┐
│ Four.meme 大额交易警报                                          │
│                                                                 │
│ 代币: PEPE2000                                                  │
│ 类型: 买入                                                      │
│ 金额: 10 BNB ($2,500)                                          │
│ 数量: 50,000,000 PEPE2000                                       │
│ 买家: 0x1234...5678 (首次交易/老用户)                           │
│ 当前进度: 75% → 80%                                             │
│                                                                 │
│ [查看代币] [查看买家] [跟单买入]                                 │
└─────────────────────────────────────────────────────────────────┘
```

**商业模式：**
- 免费 Telegram 频道（延迟 5 分钟）
- Pro 版：实时推送 $15/月

---

### 9.10 产品方向十一：API 数据服务 (Data-as-a-Service)

**产品定位：** 为开发者和量化团队提供 Four.meme 结构化数据

**API 设计：**

```
REST API 端点:

# 代币相关
GET /api/v1/tokens                     # 获取所有代币列表
GET /api/v1/tokens/{address}           # 获取单个代币详情
GET /api/v1/tokens/{address}/trades    # 获取代币交易历史
GET /api/v1/tokens/{address}/holders   # 获取代币持有者

# 创建者相关
GET /api/v1/creators                   # 获取所有创建者
GET /api/v1/creators/{address}         # 获取创建者详情
GET /api/v1/creators/{address}/tokens  # 获取创建者的所有代币

# 交易相关
GET /api/v1/trades                     # 获取最新交易
GET /api/v1/trades/whale               # 获取大额交易

# 统计相关
GET /api/v1/stats/overview             # 平台概览统计
GET /api/v1/stats/daily                # 每日统计

# WebSocket
WS /ws/trades                          # 实时交易流
WS /ws/tokens                          # 新代币创建流
```

**数据格式示例：**

```json
{
  "token": {
    "address": "0x1234...",
    "name": "PEPE2000",
    "symbol": "PEPE2",
    "creator": "0x5678...",
    "chain": "bsc",
    "created_at": "2025-01-10T12:00:00Z",
    "status": "active",
    "stats": {
      "current_price": "0.000001",
      "market_cap": "1000",
      "volume_24h": "500",
      "progress": 75.5,
      "holders": 234,
      "trades": 1892
    }
  }
}
```

**商业模式：**

| 套餐 | 价格 | 限制 |
|------|------|------|
| Free | $0 | 100 请求/天，无 WebSocket |
| Developer | $49/月 | 10,000 请求/天，WebSocket |
| Professional | $199/月 | 100,000 请求/天，全功能 |
| Enterprise | 定制 | 无限制，专属支持 |

---

## 10. 技术实现路线图

### 10.1 基础设施层

```
┌─────────────────────────────────────────────────────────────────┐
│                     技术栈建议                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  区块链交互层:                                                   │
│  ├── ethers.js v6 / viem - 合约交互                            │
│  ├── 自建节点 或 QuickNode/Alchemy - RPC 服务                   │
│  └── TheGraph 或 自建 Indexer - 事件索引                        │
│                                                                 │
│  后端服务:                                                       │
│  ├── Node.js / TypeScript - 主服务                              │
│  ├── PostgreSQL - 主数据库                                       │
│  ├── Redis - 缓存和队列                                          │
│  └── WebSocket - 实时推送                                        │
│                                                                 │
│  前端:                                                           │
│  ├── React / Next.js - Web 应用                                 │
│  ├── Chrome Extension APIs - 浏览器插件                          │
│  └── TailwindCSS - 样式                                         │
│                                                                 │
│  通知服务:                                                       │
│  ├── Telegram Bot API                                           │
│  ├── Discord Webhooks                                           │
│  └── Web Push                                                   │
│                                                                 │
│  部署:                                                           │
│  ├── AWS / GCP / Vercel                                         │
│  └── Docker + Kubernetes                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 事件索引器核心代码框架

```typescript
// event-indexer.ts
import { ethers } from 'ethers';

const TOKEN_MANAGER_V2_ADDRESS = '0x5c952063c7fc8610FFDB798152D69F0B9550762b';

const TOKEN_MANAGER_V2_ABI = [
  'event TokenCreate(address creator, address token, uint256 requestId, string name, string symbol, uint256 totalSupply, uint256 launchTime, uint256 launchFee)',
  'event TokenPurchase(address token, address account, uint256 price, uint256 amount, uint256 cost, uint256 fee, uint256 offers, uint256 funds)',
  'event TokenSale(address token, address account, uint256 price, uint256 amount, uint256 cost, uint256 fee, uint256 offers, uint256 funds)',
  'event LiquidityAdded(address base, uint256 offers, address quote, uint256 funds)',
  'event TradeStop(address token)'
];

class FourMemeIndexer {
  private provider: ethers.Provider;
  private contract: ethers.Contract;

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(
      TOKEN_MANAGER_V2_ADDRESS,
      TOKEN_MANAGER_V2_ABI,
      this.provider
    );
  }

  async startListening() {
    // 监听新代币创建
    this.contract.on('TokenCreate', async (creator, token, requestId, name, symbol, totalSupply, launchTime, launchFee) => {
      console.log(`新代币创建: ${name} (${symbol})`);
      await this.handleTokenCreate({
        creator,
        token,
        requestId,
        name,
        symbol,
        totalSupply,
        launchTime,
        launchFee
      });
    });

    // 监听购买事件
    this.contract.on('TokenPurchase', async (token, account, price, amount, cost, fee, offers, funds) => {
      await this.handleTokenPurchase({
        token,
        account,
        price,
        amount,
        cost,
        fee,
        offers,
        funds
      });
    });

    // 监听卖出事件
    this.contract.on('TokenSale', async (token, account, price, amount, cost, fee, offers, funds) => {
      await this.handleTokenSale({
        token,
        account,
        price,
        amount,
        cost,
        fee,
        offers,
        funds
      });
    });

    // 监听流动性添加
    this.contract.on('LiquidityAdded', async (base, offers, quote, funds) => {
      await this.handleLiquidityAdded({ base, offers, quote, funds });
    });
  }

  private async handleTokenCreate(data: any) {
    // 1. 保存代币信息到数据库
    // 2. 更新创建者统计
    // 3. 发送通知
  }

  private async handleTokenPurchase(data: any) {
    // 1. 保存交易记录
    // 2. 更新代币统计
    // 3. 检查是否大额交易
    // 4. 更新买家画像
  }

  private async handleTokenSale(data: any) {
    // 1. 保存交易记录
    // 2. 检查是否创建者卖出
    // 3. 更新风险评分
  }

  private async handleLiquidityAdded(data: any) {
    // 1. 更新代币状态为"已毕业"
    // 2. 发送毕业通知
    // 3. 触发套利检测
  }
}
```

### 10.3 开发优先级建议

```
Phase 1 (基础设施)
├── 事件索引器
├── 数据库设计和部署
├── 基础 API 服务
└── 创建者评分算法 v1

Phase 2 (核心产品)
├── Chrome 浏览器插件
├── Web Dashboard
├── Telegram 通知 Bot
└── 创建者评分算法 v2

Phase 3 (增值产品)
├── 聪明钱追踪系统
├── Sniper Bot (可选)
├── API 服务开放
└── 多链支持

Phase 4 (商业化)
├── 付费功能上线
├── 用户增长
├── 产品迭代
└── 新功能开发
```

---

## 11. 竞品分析与差异化

### 11.1 市场现状

| 平台 | 链 | 类似产品 | 差距/机会 |
|------|-----|----------|----------|
| Pump.fun | Solana | 有大量第三方工具 | Four.meme 生态工具稀缺 |
| GMGN | Solana | 聪明钱追踪 | 无 Four.meme 版本 |
| DEXScreener | 多链 | 代币筛选器 | 无创建者分析 |
| BubbleMaps | 多链 | 持仓分析 | 无内盘数据 |
| MEVX | BSC | 交易工具 | 功能有限 |
| Maestro | 多链 | 交易机器人 | 非专注 Four.meme |

### 11.2 差异化策略

```
┌─────────────────────────────────────────────────────────────────┐
│                     差异化定位                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 专注 Four.meme 生态                                         │
│     - 深度整合，不是通用工具                                     │
│     - 内盘 + 外盘数据联动                                        │
│                                                                 │
│  2. 创建者信用系统                                               │
│     - 独特的评分算法                                             │
│     - 没有竞品做这个                                             │
│                                                                 │
│  3. 多链覆盖                                                     │
│     - BSC + Arbitrum + Base 一站式                              │
│     - 跨链数据对比                                               │
│                                                                 │
│  4. 浏览器插件形态                                               │
│     - 无缝融入用户现有流程                                       │
│     - 降低使用门槛                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. 商业模式建议

### 12.1 收入来源

| 收入类型 | 产品 | 预估定价 |
|----------|------|----------|
| 订阅费 | Pro 版浏览器插件 | $15-30/月 |
| 订阅费 | 聪明钱追踪 Pro | $30-50/月 |
| 订阅费 | API 数据服务 | $49-199/月 |
| 利润分成 | Sniper Bot | 盈利的 5-10% |
| 利润分成 | 套利工具 | 利润的 20% |
| 服务费 | 代币创建工具 | $10-50/次 |
| 广告 | 免费 Dashboard | CPM/CPC |

### 12.2 用户增长策略

```
免费获客:
├── 免费版浏览器插件 (基础功能)
├── 公开 Telegram 频道 (延迟数据)
├── Twitter 数据分享/KOL 合作
└── 社区活动/空投

转化付费:
├── 免费试用 Pro 功能 7 天
├── 限时优惠
└── 推荐奖励
```

### 12.3 成本估算

| 项目 | 月成本估算 |
|------|-----------|
| 服务器 (AWS/GCP) | $200-500 |
| RPC 节点服务 | $100-300 |
| 数据库 | $50-100 |
| Bitquery API (可选) | $49-199 |
| 域名/SSL | $10-20 |
| **总计** | **$410-1,120/月** |

---

## 13. 资源链接汇总

### 13.1 官方资源

| 资源 | 链接 |
|------|------|
| Four.meme 官网 | https://four.meme |
| 官方 GitBook 文档 | https://four-meme.gitbook.io/four.meme/protocol-integration |
| BSC TokenManager V1 | `0xEC4549caDcE5DA21Df6E6422d448034B5233bFbC` |
| BSC TokenManager V2 | `0x5c952063c7fc8610FFDB798152D69F0B9550762b` |
| BSC TokenManagerHelper3 | `0xF251F83e40a78868FcfA3FA4599Dad6494E46034` |
| Arbitrum Helper3 | `0x02287dc3CcA964a025DAaB1111135A46C10D3A57` |
| Base Helper3 | `0x1172FABbAc4Fe05f5a5Cebd8EBBC593A76c42399` |

### 13.2 第三方数据服务

| 服务 | 链接 | 说明 |
|------|------|------|
| Bitquery Four Meme API | https://docs.bitquery.io/docs/blockchain/BSC/four-meme-api/ | GraphQL 数据 API |
| Bitquery 注册 | https://bitquery.io | 获取 API Key |
| DEXScreener | https://dexscreener.com | 图表工具 |
| GeckoTerminal | https://geckoterminal.com | 代币信息 |
| BscScan | https://bscscan.com | 区块浏览器 |

### 13.3 GitHub 开源项目

| 项目 | 链接 |
|------|------|
| fourmeme Topic | https://github.com/topics/fourmeme |
| fourmeme-bot Topic | https://github.com/topics/fourmeme-bot |
| fourmeme-trading-bot Topic | https://github.com/topics/fourmeme-trading-bot |
| fourmeme-bundler Topic | https://github.com/topics/fourmeme-bundler |
| Bsc-FourMeme-Trading-Bot | https://github.com/Novus-Tech-LLC/Bsc-FourMeme-Trading-Bot |
| bsc-mcp | https://github.com/TermiX-official/bsc-mcp |

### 13.4 开发工具

| 工具 | 链接 | 用途 |
|------|------|------|
| ethers.js | https://docs.ethers.org/v6/ | Web3 交互 |
| viem | https://viem.sh | 现代化 Web3 库 |
| QuickNode | https://quicknode.com | RPC 服务 |
| Alchemy | https://alchemy.com | RPC 服务 |
| TheGraph | https://thegraph.com | 事件索引 |

---

## 14. 总结

### 14.1 API 资源优先级

| 优先级 | API 来源 | 适用场景 |
|--------|----------|----------|
| **P0** | 智能合约 API | 实时交易执行、事件监听 |
| **P1** | Bitquery GraphQL | 历史数据分析、复杂查询 |
| **P2** | 官方 REST API | 代币元数据、用户信息 |
| **P3** | 开源 SDK | 快速原型、参考实现 |

### 14.2 产品优先级推荐

| 优先级 | 产品 | 原因 |
|--------|------|------|
| **P0** | 创建者分析浏览器插件 | 差异化强，解决真实痛点 |
| **P1** | 聪明钱追踪器 | 用户付费意愿高 |
| **P1** | 募资进度仪表板 | 开发成本低，需求明确 |
| **P2** | API 数据服务 | 基础设施，支持其他产品 |
| **P2** | Whale Alert | 社区运营工具 |
| **P3** | Sniper Bot | 竞争激烈，风险高 |
| **P3** | 套利工具 | 机会窗口小 |

### 14.3 Quick Win 建议

1. **先做浏览器插件 MVP**
   - 显示创建者基础信息
   - 简单评分 (代币数量 + 毕业率)
   - 快速上线，收集反馈

2. **同时建设数据基础设施**
   - 事件索引器
   - 数据库
   - 为后续产品打基础

3. **通过 Telegram Bot 做增长**
   - 新币提醒
   - 大额交易提醒
   - 免费引流

---

*文档完*

*版本历史：*
- v1.0 (2025-01-12): 初始版本，基于智能合约 API 文档
- v2.0 (2025-01-12): 新增官方 REST API、Bitquery GraphQL、开源 SDK 章节
