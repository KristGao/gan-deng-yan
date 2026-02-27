# 部署指南

## Railway 部署步骤

### 1. 准备代码

确保代码已提交到 GitHub：
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. 在 Railway 上部署

1. 访问 [Railway](https://railway.app/) 并登录
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的仓库
4. 点击 "Add Variables" 添加环境变量：
   - `GEMINI_API_KEY`: 你的 Google Gemini API Key（可选，用于 AI 聊天功能）
   - `NODE_ENV`: `production`
5. 点击 "Deploy" 开始部署

### 3. 自定义域名（可选）

1. 在 Railway 项目设置中，点击 "Settings" → "Domains"
2. 点击 "Generate Domain" 获取默认域名，或添加自定义域名

## Render 部署步骤

### 1. 准备代码

同上，确保代码已推送到 GitHub

### 2. 在 Render 上部署

1. 访问 [Render](https://render.com/) 并登录
2. 点击 "New" → "Web Service"
3. 选择你的 GitHub 仓库
4. 配置：
   - **Name**: gan-deng-yan
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. 添加环境变量：
   - `GEMINI_API_KEY`: 你的 Google Gemini API Key（可选）
   - `NODE_ENV`: `production`
6. 点击 "Create Web Service"

## 环境变量说明

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `GEMINI_API_KEY` | Google Gemini API Key，用于 AI 聊天功能 | 否 |
| `NODE_ENV` | 设置为 `production` 启用生产模式 | 是 |
| `PORT` | 服务器端口，默认 3000 | 否 |

## 获取 Gemini API Key

1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 点击 "Create API Key"
3. 复制生成的 key

## 部署后验证

1. 访问部署后的 URL
2. 确认首页正常显示
3. 测试 "创建联机房间" 功能
4. 测试 "添加机器人" 功能
5. 测试游戏流程
