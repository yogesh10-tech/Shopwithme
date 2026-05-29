import sharp from 'sharp';
import { mkdirSync } from 'fs';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f766e"/>
  <text x="256" y="320" font-size="240" text-anchor="middle">🪴</text>
</svg>`;

mkdirSync('public/icons', { recursive: true });
const buf = Buffer.from(svg);

await sharp(buf).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(buf).resize(512, 512).png().toFile('public/icons/icon-512.png');
await sharp(buf).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png');

console.log('PWA icons generated in public/icons/');
