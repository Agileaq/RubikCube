# 三阶魔方 (RubikCube)

一个用于三阶魔方填色与求解的渐进式网页应用 (PWA)，纯客户端运行、数据仅存于本地设备。
使用 React + Vite + TypeScript 构建，求解器按需懒加载（代码分包），部署于 GitHub Pages。

在线地址（占位）：<https://<user>.github.io/RubikCube/>

## 功能

- 对照手上的实体魔方，为图中三阶魔方的 6 个面 48 个非中心格填色。
- 翻转按钮查看背面三个中心（黄 / 红 / 蓝）。
- 调色板显示每种颜色的剩余可用数量。
- 填满且颜色分布可解时出现「开始复原」；不可解时给出原因说明。
- 复原动画逐步演示，并以标准符号（如 `R`、`U'`、`F2`）提示每一步转动，方便照着转动实体魔方。
- 内置图文教程「三阶魔方教程」（层先法，8 个分节）。

## 开发

```bash
npm install
npm run dev
```

Vite 开发服务器默认在 <http://localhost:5173> 启动。

## 测试

```bash
npm run test        # 单次运行 (vitest run)
npm run test:watch  # 监听模式
```

## 构建

```bash
npm run build
```

产物输出到 `dist/`。应用 `base` 为 `/RubikCube/`。求解器被拆分为独立的
`Solve-*.js` chunk，只有进入复原页时才会加载，填色路径不会引入求解器。

本地预览生产构建：

```bash
npm run preview
```

## 部署

推送到 `main` 分支后，GitHub Actions (`.github/workflows/deploy.yml`) 会自动构建并发布到 GitHub Pages。

首次部署：在 GitHub 仓库 **Settings → Pages → Source** 中选择 **GitHub Actions**，
然后推送 `main` 即可。

## 在 iOS 上安装（添加到主屏幕）

1. 用 **Safari** 打开应用地址。
2. 点击底部工具栏的「分享」按钮。
3. 选择「添加到主屏幕」。
4. 从主屏幕以独立 (standalone) 模式启动，获得接近原生 App 的体验。
