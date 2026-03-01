# 干瞪眼游戏 - 技术架构文档

## 项目概述

- **项目名称**: 干瞪眼 (Gan Deng Yan)
- **项目类型**: 实时多人在线卡牌游戏
- **技术栈**: React + TypeScript + Node.js + Socket.IO
- **部署平台**: Render (Cloud)

---

## 技术栈详解

### 1. 前端技术栈

#### 1.1 核心框架
| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | ^19.0.0 | UI 组件库 |
| **React DOM** | ^19.0.0 | DOM 渲染 |
| **TypeScript** | ~5.8.2 | 类型安全 |

#### 1.2 构建工具
| 技术 | 版本 | 用途 |
|------|------|------|
| **Vite** | ^6.2.0 | 前端构建工具 |
| **@vitejs/plugin-react** | ^5.0.4 | React 插件 |
| **tsx** | ^4.21.0 | TypeScript 执行器 |

#### 1.3 样式方案
| 技术 | 版本 | 用途 |
|------|------|------|
| **Tailwind CSS** | ^4.1.14 | 原子化 CSS 框架 |
| **@tailwindcss/vite** | ^4.1.14 | Vite 集成 |
| **autoprefixer** | ^10.4.21 | CSS 前缀处理 |

#### 1.4 动画库
| 技术 | 版本 | 用途 |
|------|------|------|
| **motion** | ^12.23.24 | 动画效果 (Framer Motion) |

#### 1.5 图标库
| 技术 | 版本 | 用途 |
|------|------|------|
| **lucide-react** | ^0.546.0 | React 图标库 |

---

### 2. 后端技术栈

#### 2.1 核心框架
| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 18+ | JavaScript 运行时 |
| **Express** | ^4.21.2 | Web 服务器框架 |

#### 2.2 实时通信
| 技术 | 版本 | 用途 |
|------|------|------|
| **Socket.IO** | ^4.8.3 | 实时双向通信 |
| **socket.io-client** | ^4.8.3 | 客户端 Socket |

#### 2.3 AI 集成
| 技术 | 版本 | 用途 |
|------|------|------|
| **@google/genai** | ^1.43.0 | Google Gemini AI API |

#### 2.4 数据库
| 技术 | 版本 | 用途 |
|------|------|------|
| **better-sqlite3** | ^12.4.1 | SQLite 数据库 |

#### 2.5 环境配置
| 技术 | 版本 | 用途 |
|------|------|------|
| **dotenv** | ^17.2.3 | 环境变量管理 |

---

## 项目架构

### 1. 目录结构

```
gan-deng-yan/
├── src/
│   ├── App.tsx              # 主应用组件
│   ├── game/
│   │   ├── rules.ts         # 游戏规则逻辑
│   │   └── voice.ts         # 语音播放功能
│   └── index.css            # 全局样式
├── Skills/
│   ├── game-rules.md        # 游戏规则文档
│   └── tech-architecture.md # 技术架构文档
├── server.ts                # 服务器入口
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
├── package.json             # 项目依赖
├── render.yaml              # Render 部署配置
└── index.html               # HTML 入口
```

### 2. 架构模式

#### 2.1 前端架构
- **组件化设计**: 使用 React 函数组件 + Hooks
- **状态管理**: 使用 React useState/useEffect 进行本地状态管理
- **实时同步**: 通过 Socket.IO 客户端与服务器同步游戏状态

#### 2.2 后端架构
- **MVC 模式**: Express 处理 HTTP 请求，Socket.IO 处理实时通信
- **内存存储**: 使用内存对象存储房间状态（rooms, socketRooms, roomHosts）
- **事件驱动**: 基于 Socket.IO 事件实现实时游戏同步

---

## 核心功能实现

### 1. 游戏逻辑 (src/game/rules.ts)

#### 1.1 牌组管理
```typescript
// 创建54张牌（含大小王）
export const createDeck = (): Card[] => { ... }

// 牌型分析
export const analyzePlay = (cards: Card[]): Play | null => { ... }

// 牌型比较
export const canBeat = (play: Play, currentPlay: Play | null): boolean => { ... }
```

#### 1.2 支持的牌型
- 单张 (single)
- 对子 (pair)
- 顺子 (straight) - 3张
- 连对 (straight_pairs) - 4张以上
- 三炸 (bomb3)
- 四炸 (bomb4)
- 火箭 (rocket) - 大小王

### 2. 实时通信 (server.ts)

#### 2.1 Socket 事件
| 事件名 | 方向 | 说明 |
|--------|------|------|
| `join_room` | C→S | 加入房间 |
| `register_host` | C→S | 注册主持人 |
| `update_state` | C→S | 更新游戏状态 |
| `update_dice_roll` | C→S | 同步骰子结果 |
| `update_setup_players` | C→S | 更新设置阶段玩家 |
| `room_state` | S→C | 返回房间状态 |
| `state_updated` | S→C | 广播状态更新 |
| `player_joined` | S→C | 广播新玩家加入 |

#### 2.2 房间管理
```typescript
// 内存中的房间数据
const rooms: Record<string, RoomData> = {}
const socketRooms: Record<string, string> = {}
const roomHosts: Record<string, string> = {}
```

### 3. 语音系统 (src/game/voice.ts)

#### 3.1 Web Speech API
- 使用浏览器原生 `speechSynthesis` API
- 支持中文语音播报
- 可开关控制

#### 3.2 语音场景
- 出牌播报
- 过牌播报
- 炸弹播报
- 胜利播报

---

## 部署架构

### 1. Render 部署配置

```yaml
# render.yaml
services:
  - type: web
    name: gan-deng-yan
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: GEMINI_API_KEY
        sync: false
```

### 2. 部署流程

#### 2.1 构建阶段
```bash
npm install      # 安装依赖
npm run build    # Vite 构建前端
```

#### 2.2 运行阶段
```bash
npm start        # 启动生产服务器 (NODE_ENV=production tsx server.ts)
```

### 3. 环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `NODE_ENV` | 运行环境 (development/production) | 是 |
| `PORT` | 服务器端口 | 否 (默认3000) |
| `GEMINI_API_KEY` | Google Gemini API 密钥 | 否 |

---

## 开发工作流

### 1. 开发命令

```bash
# 开发模式（带热更新）
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 类型检查
npm run lint

# 清理构建文件
npm run clean
```

### 2. 开发环境

#### 2.1 本地开发
```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

#### 2.2 生产模拟
```bash
# 构建并启动生产服务器
npm run build
npm start
```

---

## 性能优化

### 1. 前端优化
- **Vite 构建**: 快速的开发服务器和优化的生产构建
- **代码分割**: 按需加载组件
- **Tailwind CSS**: 原子化 CSS，减少样式文件体积

### 2. 后端优化
- **内存存储**: 使用内存对象而非数据库，降低延迟
- **Socket.IO**: 高效的实时通信，支持自动重连
- **事件广播**: 精准的事件定向广播，减少不必要的网络传输

---

## 安全考虑

### 1. 游戏密钥验证
- 主持人需要输入正确的 `GAME_KEY` 才能创建房间
- 防止未授权用户创建房间

### 2. CORS 配置
```typescript
const io = new Server(server, {
  cors: { origin: "*" },  // 生产环境应限制具体域名
});
```

### 3. 环境变量保护
- 敏感配置（如 API 密钥）通过环境变量注入
- 不提交到版本控制

---

## 扩展性设计

### 1. 当前限制
- **内存存储**: 房间数据存储在内存中，重启后丢失
- **单实例部署**: 不支持多服务器负载均衡

### 2. 未来改进方向
- **持久化存储**: 使用 Redis 或数据库存储房间状态
- **多服务器支持**: 使用 Redis Adapter 实现 Socket.IO 集群
- **用户系统**: 添加用户注册登录功能
- **战绩统计**: 持久化存储玩家战绩数据

---

## 技术选型理由

### 1. 为什么选择 React 19?
- 最新的 React 版本，性能优化更好
- 支持新的 Hooks 和并发特性
- 更好的 TypeScript 支持

### 2. 为什么选择 Socket.IO?
- 成熟的实时通信库
- 自动处理重连和降级
- 广泛的支持和文档

### 3. 为什么选择 Tailwind CSS?
- 原子化 CSS，开发效率高
- 文件体积小，性能优秀
- 与 React 组件化开发完美配合

### 4. 为什么选择 Render?
- 免费的云托管服务
- 支持自动部署
- 内置 HTTPS 和域名

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2025-03 | 初始版本，支持5人对战、联机模式、托管功能 |

---

## 参考资料

- [React 官方文档](https://react.dev/)
- [Socket.IO 官方文档](https://socket.io/)
- [Vite 官方文档](https://vitejs.dev/)
- [Tailwind CSS 官方文档](https://tailwindcss.com/)
- [Render 文档](https://render.com/docs)

---

*文档版本: 1.0.0*
*最后更新: 2025-03-01*
