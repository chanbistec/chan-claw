const fs = require('fs');
const { Resvg } = require('@resvg/resvg-js');

const svgDir = 'text/svg';
const pngDir = 'text';
fs.mkdirSync(pngDir, { recursive: true });

const files = fs.readdirSync(svgDir).sort();
let count = 0;
for (const file of files) {
  if (file.endsWith('.svg')) {
    const svgPath = `${svgDir}/${file}`;
    const resvg = new Resvg(fs.readFileSync(svgPath, 'utf8'));
    const pngFile = file.replace('.svg', '.png');
    fs.writeFileSync(`${pngDir}/${pngFile}`, resvg.render().asPng());
    console.log('PNG: ' + pngFile);
    count++;
  }
}
console.log('Total: ' + count);
