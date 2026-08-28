# 三阶魔方 (RubikCube)

一个用于三阶魔方填色与求解的渐进式网页应用 (PWA)，纯客户端运行、数据仅存于本地设备。使用 React + Vite + TypeScript 构建，部署于 GitHub Pages。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

产物输出到 `dist/`。应用 `base` 为 `/RubikCube/`。

## 测试

```bash
npm run test        # 单次运行
npm run test:watch  # 监听模式
```

## 部署

推送到 `main` 分支后，GitHub Actions (`.github/workflows/deploy.yml`) 会自动构建并发布到 GitHub Pages。

## 在 iOS 上安装

1. 用 Safari 打开应用地址。
2. 点击底部的“分享”按钮。
3. 选择“添加到主屏幕”。
4. 从主屏幕以独立 (standalone) 模式启动。
