# qrcode-extension

一个基于 Vite 的二维码 Web 应用，支持在浏览器中生成二维码、摄像头扫码、本地图片扫码、剪贴板图片扫码，以及本地语言和主题设置持久化。

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run compile
npm run deploy
```

`deploy` 会先构建 `dist/`，再通过 `wrangler.jsonc` 发布到 Cloudflare。

在线体验 [website](https://qrcode.tingyuan.in)

<img src="./assets/screenshot-1.png" alt="生成界面" width="420" />

<img src="./assets/screenshot-2.png" alt="扫描界面" width="420" />
