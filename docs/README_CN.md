# SaaS Launch Kit

**几天内构建你的 SaaS 产品，而不是几个月**

为中国独立开发者打造的 SaaS 出海完整脚手架。包含 Chrome 扩展、Cloudflare Worker API、Creem 支付集成、SEO 配置和国际化支持。

## 🎯 功能一览

### Chrome 扩展模板
- **Manifest V3** 现代架构
- **Popup 弹窗**：用量显示、设置、订阅管理
- **内容脚本**：侧边栏 UI 显示结果
- **后台 Service Worker**：消息路由
- **esbuild** 快速构建

### Cloudflare Worker API
- **RESTful API**：CORS 配置
- **速率限制**：全局 + 端点级别
- **KV 存储**：订阅和缓存
- **Webhook 处理**：签名验证
- **SEO 端点**：robots.txt、sitemap.xml、OG 图片

### Creem 支付集成
- **Checkout 会话**创建
- **Webhook 验证**：时间安全比较
- **订阅生命周期**管理
- **退款冷却**：30 天限制

### 其他功能
- **Free/Pro 分级系统**：每日限额
- **国际化**：中英日三语
- **法律页面模板**：隐私政策、服务条款、DMCA
- **专业 Landing Page 模板**

## 📁 项目结构

```
saas-launch-kit/
├── extension/           # Chrome 扩展模板
│   ├── src/
│   │   ├── popup/        # 弹窗 UI
│   │   ├── content/      # 内容脚本 + 侧边栏
│   │   ├── background/   # Service Worker
│   │   ├── core/         # API 客户端、用量追踪
│   │   └── types/        # TypeScript 类型定义
│   ├── scripts/          # 构建脚本
│   └── manifest.json
├── worker/              # Cloudflare Worker API
│   ├── src/
│   │   └── index.ts     # 主 API 处理器
│   └── wrangler.toml
├── landing/             # Landing Page 模板
│   └── index.html
└── docs/                # 文档
    ├── README.md         # 英文文档
    ├── README_CN.md      # 中文文档
    ├── DEPLOYMENT.md     # 部署指南
    └── CUSTOMIZATION.md  # 自定义指南
```

## 🚀 快速开始

### 1. 获取模板

```bash
git clone https://github.com/your-repo/saas-launch-kit.git
cd saas-launch-kit
```

### 2. 配置扩展

```bash
cd extension
npm install

# 修改 manifest.json 中的占位符：
# - __EXTENSION_NAME__
# - __EXTENSION_DESCRIPTION__
# - __HOST_PERMISSION__
# - __API_DOMAIN__

# 构建扩展
npm run build
```

### 3. 配置 Worker

```bash
cd worker
npm install

# 创建 .dev.vars 文件：
# CREEM_API_KEY=your_key
# CREEM_WEBHOOK_SECRET=your_secret
# CREEM_PRODUCT_ID=prod_xxx
# AI_API_KEY=your_ai_key
# CANONICAL_DOMAIN=yourdomain.com

# 本地测试
npm run dev

# 部署
npm run deploy
```

### 4. 自定义

1. 更新 `extension/src/core/constants.ts` 中的 API 端点
2. 在 `worker/src/index.ts` 中实现你的 AI 处理逻辑
3. 自定义 `landing/index.html` Landing Page
4. 用你的信息更新法律页面

## 💡 核心功能

### Free/Pro 分级系统

```typescript
// 检查是否可以处理
const canProcess = await UsageTracker.canProcess();

// 获取剩余配额
const remaining = await UsageTracker.getRemaining();

// 成功后增加计数
await UsageTracker.increment();
```

### API 客户端

```typescript
import { APIClient } from './core/api-client';

const api = new APIClient('https://your-api.workers.dev');

// 处理内容
const result = await api.process({
  source_id: 'video123',
  source_url: 'https://example.com/video123',
  language: 'zh-CN',
  email: 'user@example.com',
});

// 检查订阅
const sub = await api.checkSubscription('user@example.com');
```

### Creem Webhook 事件

API 处理以下 Creem Webhook 事件：
- `subscription.active` / `subscription.paid` → 激活订阅
- `subscription.canceled` / `subscription.expired` → 停用订阅
- `checkout.completed` → 激活（终身或订阅购买）
- `subscription.scheduled_cancel` → 标记为周期末取消

## 🔒 安全特性

- **时间安全比较**：Webhook 签名验证
- **输入验证**：所有端点
- **速率限制**：防止滥用
- **CORS 配置**：API 路由
- **XSS 防护**：内容脚本转义

## 🌐 国际化

扩展支持：
- 英语 (`en`)
- 简体中文 (`zh-CN`)
- 日语 (`ja`)

消息定义在 `extension/src/_locales/*/messages.json`

## 📊 速率限制

| 端点 | 免费用户 | Pro 用户 |
|------|---------|---------|
| 通用 API | 100/小时 | 100/小时 |
| 处理 | 3/天，10/小时 | 无限 |
| Checkout | 5/小时 | 5/小时 |

## 🔧 配置

### 环境变量（Worker）

| 变量 | 描述 |
|------|------|
| `CREEM_API_KEY` | 你的 Creem API 密钥 |
| `CREEM_WEBHOOK_SECRET` | Webhook 签名密钥 |
| `CREEM_PRODUCT_ID` | 你的 Creem Pro 产品 ID |
| `AI_API_KEY` | 你的 AI 供应商 API 密钥 |
| `CANONICAL_DOMAIN` | 你的生产域名 |

### 扩展常量

编辑 `extension/src/core/constants.ts`：

```typescript
export const EXTENSION_CONFIG = {
  name: '你的扩展名称',
  version: '1.0.0',
  apiEndpoint: 'https://your-api.workers.dev',
  pricing: {
    free: { dailyLimit: 3 },
    pro: { monthly: 9.99 },
  },
  checkoutUrl: 'https://yourdomain.com/#pricing',
};
```

## 📖 文档

- [部署指南](./DEPLOYMENT.md) - 详细部署步骤
- [自定义指南](./CUSTOMIZATION.md) - 如何自定义你的产品

## 🤝 支持

- **Pro 用户**：优先邮件支持
- **Starter 用户**：GitHub Issues

## 📄 许可证

MIT 许可证 - 可自由用于个人和商业项目。

---

为中国开发者出海而生 ❤️
