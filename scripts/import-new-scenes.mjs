import sharp from 'sharp';
const D = process.argv[2];
const map = {
  busstop: 'ChatGPT Image Sep 25, 2026, 02_37_43 PM.png',
  drivein: 'ChatGPT Image Sep 25, 2026, 02_37_57 PM.png',
  plane: 'ChatGPT Image Sep 25, 2026, 02_38_04 PM.png',
  causeway: 'ChatGPT Image Sep 25, 2026, 02_39_55 PM.png',
  taxi: 'ChatGPT Image Sep 25, 2026, 02_40_22 PM.png',
};
for (const [id, f] of Object.entries(map)) {
  const img = sharp(`${D}/${f}`);
  const m = await img.metadata();
  console.log(id, m.width, m.height);
  await sharp(`${D}/${f}`).resize(1536, 1024, { fit: 'fill' }).webp({ quality: 86 }).toFile(`public/images/${id}.webp`);
}
