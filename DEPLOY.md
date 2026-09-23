# 部署指南

## 当前 GitHub Pages 分支部署

当前仓库直接从 `main` 分支根目录发布，不需要修改 GitHub Pages 设置。

更新源码后执行：

```powershell
npm ci
npm run lint
npm test
npm run build:pages
git add index.html favicon.svg assets
git commit -m "build: update GitHub Pages"
git push origin main
```

`npm run build:pages` 会先生成 `dist/web`，再把可直接托管的 `index.html`、`favicon.svg` 和 `assets/` 同步到仓库根目录。

Vite 的 `base` 配置为 `./`，因此仓库部署在 `https://<user>.github.io/<repo>/` 时不需要额外修改路径。

## 可选：切换到 GitHub Actions 部署

1. 打开仓库 **Settings → Pages**。
2. 在 **Build and deployment** 中将 Source 设置为 **GitHub Actions**。
3. 推送代码或手动运行 `Deploy GitHub Pages` workflow。
4. workflow 会依次执行依赖安装、lint、单元测试、Vite 构建和 Pages 部署。

切换后不需要再提交根目录构建产物。

## 本地验收网页构建

```bash
npm ci
npm run lint
npm test
npm run build:web
npm run preview
```

打开终端输出的本地地址检查随机恒星系、太阳系、时间控制、天体详情和音乐按钮。

## 构建 Windows 桌面版

```bash
npm ci
npm run build:electron
```

安装包输出到 `release/`。桌面版加载 `dist/web`，不依赖外部 CDN。

## 自定义域名

在 GitHub Pages 设置中添加自定义域名，并按 GitHub 提示配置 DNS。应用本身使用相对资源路径，不需要重新构建。

## 常见问题

**页面一直显示“正在生成恒星系”？**

检查浏览器控制台和 WebGL 支持。应用应自动尝试主线程纹理降级；如果仍失败，页面会显示明确错误信息。

**Electron 启动后是空白页？**

先执行 `npm run build:web` 生成 `dist/web`，再运行 `npm start`。

**端到端测试提示缺少 Chromium？**

CI 会执行 `npx playwright install --with-deps chromium`。本地也可使用已安装的 Edge：

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:e2e
```
