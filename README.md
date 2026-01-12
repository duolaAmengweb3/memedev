# FourMeme Creator Analyzer

Four.meme 代币创建者分析工具 - Chrome 浏览器插件

在 Four.meme 代币页面一键查看创建者历史、持仓分布、风险评分等关键数据，帮助你做出更明智的投资决策。

## 功能特性

### 创建者分析
- 钱包地址 & BNB 余额
- 当前代币持仓量、占比、排名
- 历史创建代币数量（支持分页加载）
- 每个历史代币的市值、涨跌、上 DEX 状态

### 风险评分系统
- 综合评分 0-100 分，5 个风险等级
- 5 个评分维度：
  - 创建者持仓占比
  - Top 10 持有者集中度
  - 流动性深度
  - 24h 交易活跃度
  - 创建者 BNB 余额

### 市场数据
- 实时价格 & 24h 涨跌幅
- 市值 / FDV
- 流动性池深度
- 24h 交易量 & 买卖笔数

### 持有者分布
- Top 10 / Top 20 集中度
- 最大持有者占比
- Top 100 持有者列表
- 集中度风险等级判断

## 技术栈

- React 18 + TypeScript
- Vite (Chrome Extension 构建)
- TailwindCSS
- Chrome Extension Manifest V3

## 数据来源

- Four.meme API - 代币信息、持有者数据、创建者历史
- BSC RPC - 链上余额查询
- DexScreener API - 市场数据
- GeckoTerminal API - 备用市场数据

## 安装使用

### 开发环境

```bash
# 安装依赖
npm install

# 开发构建（监听文件变化）
npm run dev

# 生产构建
npm run build
```

### 加载插件

1. 运行 `npm run build` 生成 dist 目录
2. 打开 Chrome，进入 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目的 `dist` 文件夹
6. 打开 Four.meme 任意代币页面，点击插件图标

## 项目结构

```
src/
├── background/          # Service Worker
│   ├── index.ts         # 消息处理 & 数据聚合
│   └── api/
│       ├── fourmeme.ts  # Four.meme API
│       ├── dexscreener.ts
│       ├── geckoterminal.ts
│       └── bsc-rpc.ts   # 链上查询
├── popup/               # 弹窗界面
│   ├── App.tsx
│   └── components/
│       ├── TokenCard.tsx
│       ├── CreatorCard.tsx
│       ├── CreatorTokens.tsx
│       ├── RiskScore.tsx
│       ├── MarketData.tsx
│       ├── HolderAnalysis.tsx
│       └── ...
├── services/
│   ├── riskScore.ts     # 风险评分算法
│   └── holderAnalysis.ts
├── content/             # Content Script
└── types/               # TypeScript 类型定义
```

## 联系我们

- Telegram: [t.me/dsa885](https://t.me/dsa885)
- X: [x.com/hunterweb303](https://x.com/hunterweb303)

## 免责声明

本工具仅供参考，不构成任何投资建议。Meme 币投资风险极高，请自行研究 (DYOR)，谨慎决策。
