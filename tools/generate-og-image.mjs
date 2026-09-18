// 生成 src/app/opengraph-image.png（Next.js 文件约定，自动接进 OG/Twitter 卡片）。
//
// 为什么是「生成静态 PNG」而不是 next/og 的 ImageResponse：Satori 需要显式传入
// 字体文件，而仓库里只有 Geist（无中文字形），渲染中文会出方块。要么提交一份中文
// 字体子集——但可自由分发的开源中文字体得额外引入，系统字体（PingFang/STHeiti）
// 的授权不允许把字体文件本身放进仓库。这里改为本机用 sharp 经 librsvg 调系统字体
// 栅格化一次，产物是纯像素、不含字体数据，也不给运行时增加依赖。
//
// 改动文案或配色后重跑：pnpm og:generate

import sharp from "sharp";
import { writeFileSync } from "node:fs";

const W = 1200, H = 630;

// 深色编辑风：大字号对比 + 左侧竖向色带 + 细网格纹理，避免"居中标题 + 渐变球"的模板感
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a1a"/>
      <stop offset="55%" stop-color="#212121"/>
      <stop offset="100%" stop-color="#2b2724"/>
    </linearGradient>
    <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.15"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0 L0 0 0 48" fill="none" stroke="#ffffff" stroke-opacity="0.035" stroke-width="1"/>
    </pattern>
    <radialGradient id="glow" cx="0.82" cy="0.18" r="0.55">
      <stop offset="0%" stop-color="#f0c98a" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#f0c98a" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <rect x="0" y="0" width="10" height="${H}" fill="url(#band)"/>

  <g transform="translate(96, 150)">
    <rect x="0" y="0" width="76" height="76" rx="18" fill="#ffffff"/>
    <text x="38" y="53" font-family="PingFang SC, STHeiti, Hiragino Sans GB" font-size="40"
          font-weight="600" fill="#212121" text-anchor="middle">象</text>
  </g>

  <text x="96" y="330" font-family="PingFang SC, STHeiti, Hiragino Sans GB" font-size="104"
        font-weight="700" fill="#ffffff" letter-spacing="2">小象万象</text>

  <text x="96" y="404" font-family="PingFang SC, STHeiti, Hiragino Sans GB" font-size="36"
        font-weight="400" fill="#cdd5e0">AI 图像与视频创作工作台</text>

  <g font-family="PingFang SC, STHeiti, Hiragino Sans GB" font-size="24" fill="#8b8b8b">
    <text x="96" y="530">多模型生成 · 提示词模板 · 作品管理</text>
  </g>

  <text x="${W - 96}" y="530" font-family="Helvetica, Arial" font-size="24"
        fill="#6f6f6f" text-anchor="end">sora2.681023.xyz</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
writeFileSync("src/app/opengraph-image.png", png);
console.log("生成 src/app/opengraph-image.png  " + png.length + " bytes");
