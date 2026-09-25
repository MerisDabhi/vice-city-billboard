// Converts the three generated city scene paintings into optimized WebP files.
// Starter posters are no longer baked here — they are painted at runtime (src/posters.ts).
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Pass the generated-images directory as the first argument.');
await mkdir('public/images', { recursive: true });
const files = {
  boulevard: 'exec-0134b845-1a08-4f35-931b-32c191886fd2.png',
  nightclub: 'exec-c6471554-8c19-44c9-938e-1539dadf6ad3.png',
  storefront: 'exec-e82ad6a1-69ef-4457-9e3d-1c1c23b38090.png',
};
for (const [name, file] of Object.entries(files)) {
  await sharp(join(source, file)).webp({ quality: 88 }).toFile(`public/images/${name}.webp`);
}
console.log('Optimized 3 city scenes.');
