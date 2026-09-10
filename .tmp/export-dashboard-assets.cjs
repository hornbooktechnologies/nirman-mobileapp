const fs = require('fs');
const path = require('path');
const sharp = require('../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp');
(async () => {
  const records = new Map();
  for (const file of ['dashboard-assets-manifest.json', 'dashboard-assets-batch2.json', 'dashboard-assets-batch3.json']) {
    for (const record of JSON.parse(fs.readFileSync(path.join(__dirname, file)))) records.set(record.path, record);
  }
  const manifest = [];
  for (const record of records.values()) {
    const destination = path.resolve('apps/mobile/assets/dashboard', record.path);
    fs.mkdirSync(path.dirname(destination), {recursive:true});
    const edge = record.path.startsWith('backgrounds/') ? 1024 : record.path.startsWith('hero/') || record.path === 'progress/progress-building.png' ? 768 : 256;
    // Export source art at mobile density while retaining the original generated alpha.
    const buffer = await sharp(record.source).resize(edge, edge, {fit:'inside', withoutEnlargement:true}).png({compressionLevel:9}).toBuffer();
    fs.writeFileSync(destination, buffer);
    const metadata = await sharp(buffer).metadata();
    const stats = await sharp(buffer).stats();
    manifest.push({file:record.path, width:metadata.width, height:metadata.height, bytes:buffer.length, alpha:metadata.hasAlpha, transparentPixels:metadata.hasAlpha && stats.channels[3].min === 0, origin:record.source.includes('assets/brand') ? 'approved brand library' : 'built-in image_gen', prompt:record.prompt});
  }
  fs.writeFileSync('apps/mobile/assets/dashboard/manifest.json', JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({count:manifest.length,bytes:manifest.reduce((s,r)=>s+r.bytes,0),missingAlpha:manifest.filter(r=>!r.file.startsWith('activity/') && r.file!=='backgrounds/dashboard-background.png' && !r.transparentPixels).map(r=>r.file)}));
})();
