# 恒星系模拟器

一个基于 Three.js 的 3D 恒星系模拟器，可在浏览器和 Electron 桌面端随机生成并运行单星、双星、裸星和太阳系。

## 功能

- 随机生成单星、双星与裸星系统
- 一键切换到太阳系
- 程序化生成恒星、行星、卫星和行星环纹理\n- PBR 光照、凹凸表面、独立云层与大气边缘辉光\n- 恒星与行星采用真实比例压缩，兼顾辨识度与观赏性
- 时间暂停、减速和最高 10 倍加速
- 点击天体查看质量、轨道与生命状态
- 背景音乐与音量控制
- 桌面端和移动端响应式界面

## 技术栈

- Vite 8
- Three.js 0.186
- Web Worker + OffscreenCanvas 程序化纹理
- Vitest 单元测试
- Playwright 浏览器测试
- Electron 桌面打包
- GitHub Actions 与 GitHub Pages

## 环境要求

- Node.js 24
- npm 11
- 支持 WebGL2 的现代浏览器

## 本地开发

```bash
npm install
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`。

## 常用命令

```bash
npm run dev            # 启动开发服务器
npm run install:electron # 下载 Electron 运行时
npm test               # 运行单元测试
npm run test:e2e       # 运行 Playwright 测试
npm run test:electron  # 构建网页版并执行 Electron 离线冒烟测试
npm run lint           # ESLint 与 Prettier 检查
npm run build:web      # 构建网页版到 dist/web
npm run build:pages    # 构建并同步到 GitHub Pages 根目录
npm run preview        # 预览网页版构建
npm run build:electron # 构建 Windows 安装包到 release
npm start              # 启动已经构建的 Electron 版本
```

在本地使用已安装的 Edge 运行端到端测试：

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:e2e
```

## 项目结构

```text
src/
  index.html  Vite 页面入口
  app/        应用生命周期与交互编排
  core/       常量、随机数、时钟、资源与设备能力
  domain/     与渲染无关的恒星系数据生成
  rendering/  Three.js 场景与程序化纹理
  ui/         界面和音频控制
electron/     Electron 主进程
tests/        单元测试与浏览器端到端测试
public/       构建时直接复制的静态资源
index.html    当前 GitHub Pages 分支部署入口（生成文件）
assets/       当前 GitHub Pages 分支部署资源（生成文件）
```

生成器输入固定 seed 后会得到完全相同的 `SystemModel`。渲染层只消费该模型，不参与随机生成。

## 构建与部署

网页版构建产物位于 `dist/web`，资源路径使用相对地址，可部署在 GitHub Pages 的仓库子路径下。

如果仓库继续使用“从 `main` 分支根目录发布”的旧 Pages 设置，更新网站前执行 `npm run build:pages`，然后提交根目录下的 `index.html`、`favicon.svg` 和 `assets/`。

如果以后改为 GitHub Actions 发布，只需将 **Settings → Pages → Build and deployment** 的 Source 设为 **GitHub Actions**；现有 workflow 会直接部署 `dist/web`。

Electron 构建和网页构建相互独立，桌面版不会请求 CDN，可离线运行。

## 浏览器支持

- Chrome / Edge 120+
- Firefox 120+
- Safari 17+

纹理 Worker 不可用时会自动降级到低分辨率主线程生成。

## 素材授权

行星、卫星、太阳和行星环表面贴图来自 [Solar System Scope](https://www.solarsystemscope.com/textures/)，采用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 授权。项目将官方 TIF 法线图和镜面图转换为 WebP，并将云层和金星大气图转换为带透明通道的 WebP。

背景音乐仅应在确认录音授权后随公开版本分发。若授权不明确，应在发布前移除 `src/assets/background.mp3` 及 README 中的音乐功能说明。

## 开源许可

代码使用 MIT License。第三方音乐和素材应遵循各自授权。
