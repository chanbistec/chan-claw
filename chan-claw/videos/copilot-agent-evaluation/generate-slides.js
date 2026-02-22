const fs = require('fs');
const opentype = require('opentype.js');

const width = 1920, height = 1080;
const theme = {
  bg: '#0a0a0f', bg2: '#1a1a2e',
  text: '#ffffff', accent: '#6366f1', accentLight: '#818cf8'
};

async function loadFont() {
  const fontBuffer = fs.readFileSync('/tmp/roboto-bold.ttf');
  return opentype.parse(fontBuffer.buffer);
}

function textToPath(text, x, y, fontSize, options = {}) {
  const align = options.align || 'left';
  let glyphs;
  try {
    glyphs = global.boldFont.stringToGlyphs(text);
  } catch (e) {
    return `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="${options.fill || '#fff'}">${text}</text>`;
  }
  
  let offsetX = 0;
  if (align === 'center') {
    const totalWidth = glyphs.reduce((sum, g) => sum + (g.advanceWidth || 0), 0) * fontSize / 1000;
    offsetX = -totalWidth / 2;
  }
  
  let pathData = '';
  glyphs.forEach(g => {
    if (g.path) {
      const d = g.path.toPathData(2);
      const scale = fontSize / 1000;
      const transformed = d.replace(/([0-9.-]+)/g, m => {
        const val = parseFloat(m);
        return (val * scale + (align === 'center' ? offsetX + x : x)).toFixed(2);
      });
      pathData += transformed + ' ';
    }
  });
  
  return `<path d="${pathData}" fill="${options.fill || '#fff'}" />`;
}

function generateSlide(slide, num, total) {
  let contentPaths = '';
  const contentStartY = 520;
  const lineHeight = 65;
  
  slide.content.forEach((line, i) => {
    const y = contentStartY + (i * lineHeight);
    contentPaths += `<circle cx="580" cy="${y - 20}" r="6" fill="${theme.accent}" />`;
    contentPaths += textToPath(line, 620, y - 20, 36, { fill: theme.text });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${theme.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${theme.bg2};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${theme.accent};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${theme.accentLight};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="${width}" cy="0" r="700" fill="${theme.accent}" opacity="0.08"/>
  <circle cx="0" cy="${height}" r="500" fill="${theme.accentLight}" opacity="0.06"/>
  <rect x="0" y="180" width="300" height="8" fill="url(#accent)" />
  ${textToPath('Copilot Studio', 50, 70, 42, { fill: theme.accent })}
  <text x="${width - 50}" y="70" font-family="Arial, sans-serif" font-size="24" fill="#888" text-anchor="end">${num} / ${total}</text>
  ${textToPath(slide.title, width/2, 380, 72, { align: 'center', fill: theme.text })}
  ${contentPaths}
  <text x="${width/2}" y="${height - 40}" font-family="Arial, sans-serif" font-size="20" fill="#666" text-anchor="middle">Agent Evaluation Guide</text>
</svg>`;
}

async function main() {
  global.boldFont = await loadFont();
  const text = fs.readFileSync('text.txt', 'utf8');
  const lines = text.split('\n').filter(l => l.trim());
  const slides = [];
  let current = null;
  
  for (const line of lines) {
    const match = line.match(/^Slide\s+(\d+):\s*(.+)$/i);
    if (match) {
      if (current) slides.push(current);
      current = { title: match[2].trim(), content: [] };
    } else if (current && line.trim()) {
      current.content.push(line.replace(/^[-\*•]\s*/, '').trim());
    }
  }
  if (current) slides.push(current);

  console.log('Loaded ' + slides.length + ' slides');
  
  fs.mkdirSync('text/svg', { recursive: true });
  for (let i = 0; i < slides.length; i++) {
    const svg = generateSlide(slides[i], i + 1, slides.length);
    fs.writeFileSync(`text/svg/slide-${String(i+1).padStart(3,'0')}.svg`, svg);
    console.log('SVG ' + (i+1));
  }
}

main().catch(console.error);
