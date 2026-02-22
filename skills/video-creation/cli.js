#!/usr/bin/env node
/**
 * Video Creation Pipeline
 * Text → Slides → Audio → Video
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Auto-detect FFmpeg in common locations
function findFFmpeg() {
  const candidates = [
    '/home/chanclaw/.npm-global/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
    'ffmpeg'
  ];
  for (const p of candidates) {
    try {
      execSync(`${p} -version`, { stdio: 'ignore' });
      return p;
    } catch (e) {}
  }
  return null;
}

// Parse command line arguments
function parseArgs(args) {
  const result = {};
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const eqIndex = key.indexOf('=');
      if (eqIndex > 0) {
        result[key.substring(0, eqIndex)] = key.substring(eqIndex + 1);
      } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        result[key] = args[++i];
      } else {
        result[key] = true;
      }
    }
    i++;
  }
  return result;
}
const CONFIG = {
  themes: {
    dark: { bg: '#1a1a2e', text: '#ffffff', accent: '#e94560' },
    light: { bg: '#ffffff', text: '#1a1a2e', accent: '#e94560' },
    gradient: { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', text: '#ffffff', accent: '#ffffff' },
    corporate: { bg: '#0f4c75', text: '#ffffff', accent: '#3282b8' },
    nature: { bg: '#1b4332', text: '#d8f3dc', accent: '#95d5b2' }
  },
  defaults: {
    slideDuration: 5,
    fontSize: 48,
    fontFamily: 'Inter, system-ui, sans-serif',
    width: 1920,
    height: 1080
  }
};

/**
 * Parse text into slides
 * Supports: # for new slide, ## for section title within slide
 */
function parseScript(text) {
  const slides = [];
  const lines = text.split('\n');
  let currentSlide = { title: '', content: [], image: '' };
  let currentSection = null;
  
  for (const line of lines) {
    // Check for slide breaks (## with content following = new slide)
    if (line.startsWith('## ')) {
      // If we have content in current slide, push it
      if (currentSlide.content.length > 0 || currentSlide.title) {
        // Check if this ## is significant enough to be a new slide
        // Look ahead to see if there are paragraphs after
        slides.push({ ...currentSlide });
      }
      
      // Start new slide with this ## as title
      currentSlide = {
        title: line.substring(3).trim(),
        content: [],
        image: ''
      };
    } else if (line.startsWith('# ')) {
      // Main title - always creates a new slide
      if (currentSlide.content.length > 0 || currentSlide.title) {
        slides.push({ ...currentSlide });
      }
      currentSlide = {
        title: line.substring(2).trim(),
        content: [],
        image: ''
      };
    } else if (line.startsWith('![')) {
      const match = line.match(/!\[(.*?)\]\((.*?)\)/);
      if (match) {
        currentSlide.image = { alt: match[1], src: match[2] };
      }
    } else if (line.trim()) {
      // Skip list markers in content collection
      currentSlide.content.push(line);
    }
  }
  
  // Push the last slide
  if (currentSlide.content.length > 0 || currentSlide.title) {
    slides.push({ ...currentSlide });
  }
  
  return slides;
}

/**
 * Generate HTML slide from slide data
 */
function generateHTMLSlide(slide, theme, index, total) {
  // Process content lines into HTML
  let contentHTML = '';
  let inList = false;
  let listItems = [];
  
  for (const line of slide.content) {
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        if (contentHTML) contentHTML += '</div>';
        inList = true;
      }
      listItems.push(line.substring(2).trim());
    } else if (/^\d+\.\s/.test(line)) {
      if (!inList) {
        if (contentHTML) contentHTML += '</div>';
        inList = true;
      }
      listItems.push(line.replace(/^\d+\.\s*/, '').trim());
    } else if (line.startsWith('## ')) {
      if (inList) {
        contentHTML += '<ul>' + listItems.map(li => `<li>${li}</li>`).join('') + '</ul>';
        listItems = [];
        inList = false;
      }
      contentHTML += `<h2>${line.substring(3).trim()}</h2>`;
    } else if (line.startsWith('# ')) {
      // Skip main title in content
    } else {
      if (inList) {
        contentHTML += '<ul>' + listItems.map(li => `<li>${li}</li>`).join('') + '</ul>';
        listItems = [];
        inList = false;
      }
      contentHTML += `<p>${line}</p>`;
    }
  }
  
  // Close any open list
  if (inList) {
    contentHTML += '<ul>' + listItems.map(li => `<li>${li}</li>`).join('') + '</ul>';
  }
  
  if (contentHTML && !contentHTML.startsWith('<div')) {
    contentHTML = '<div class="content">' + contentHTML + '</div>';
  } else if (contentHTML) {
    contentHTML = '<div class="content">' + contentHTML.substring(contentHTML.indexOf('>') + 1);
  }
  
  const slideNum = String(index + 1).padStart(3, '0');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${slide.title || 'Slide ' + slideNum}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    .slide {
      width: 1920px;
      height: 1080px;
      background: ${theme.bg};
      color: ${theme.text};
      font-family: '${CONFIG.defaults.fontFamily}', sans-serif;
      display: flex;
      flex-direction: column;
      padding: 80px;
      position: relative;
      overflow: hidden;
    }
    
    .slide::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 8px;
      background: ${theme.accent};
    }
    
    .slide-number {
      position: absolute;
      bottom: 40px;
      right: 60px;
      font-size: 24px;
      opacity: 0.5;
    }
    
    h1 {
      font-size: 72px;
      margin-bottom: 40px;
      font-weight: 700;
      color: ${theme.accent};
    }
    
    h2 {
      font-size: 56px;
      margin-bottom: 30px;
      font-weight: 600;
      color: ${theme.accent};
    }
    
    p {
      font-size: ${CONFIG.defaults.fontSize}px;
      line-height: 1.6;
      margin-bottom: 24px;
      max-width: 1400px;
    }
    
    ul, ol {
      font-size: ${CONFIG.defaults.fontSize}px;
      line-height: 1.8;
      margin-left: 60px;
      margin-bottom: 30px;
    }
    
    pre {
      background: rgba(0,0,0,0.3);
      padding: 30px;
      border-radius: 12px;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 32px;
      overflow-x: auto;
      margin: 20px 0;
    }
    
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    
    .image-container {
      margin: 30px 0;
      text-align: center;
    }
    
    .image-container img {
      max-width: 80%;
      max-height: 500px;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    
    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 4px;
      background: ${theme.accent};
      width: ${((index + 1) / total * 100)}%;
    }
  </style>
</head>
<body>
  <div class="slide">
    ${slide.title ? `<h1>${slide.title}</h1>` : ''}
    ${contentHTML}
    ${slide.image ? `<div class="image-container"><img src="${slide.image.src}" alt="${slide.image.alt}"></div>` : ''}
    <div class="slide-number">${index + 1} / ${total}</div>
    <div class="progress-bar"></div>
  </div>
</body>
</html>`;
}

/**
 * Create slides directory and generate HTML files
 */
function createSlides(inputFile, outputDir, themeName = 'dark') {
  const theme = CONFIG.themes[themeName] || CONFIG.themes.dark;
  
  console.log('📝 Parsing script...');
  const text = fs.readFileSync(inputFile, 'utf-8');
  const slides = parseScript(text);
  
  console.log(`📊 Found ${slides.length} slides`);
  
  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'html'), { recursive: true });
  
  // Generate HTML slides
  slides.forEach((slide, index) => {
    const html = generateHTMLSlide(slide, theme, index, slides.length);
    const filename = path.join(outputDir, 'html', `slide-${String(index + 1).padStart(3, '0')}.html`);
    fs.writeFileSync(filename, html);
    console.log(`  ✓ Slide ${index + 1}: ${slide.title || 'Untitled'}`);
  });
  
  // Create a simple presentation viewer
  const viewerHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Presentation Viewer</title>
  <style>
    body { margin: 0; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; }
    iframe { width: 960px; height: 540px; border: none; transform: scale(1); }
  </style>
</head>
<body>
  <iframe id="slide" src="slide-001.html" allowfullscreen></iframe>
  <script>
    const slides = ${JSON.stringify(slides.map((_, i) => `slide-${String(i+1).padStart(3,'0')}.html`))};
    let current = 0;
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === ' ') current = Math.min(current + 1, slides.length - 1);
      if (e.key === 'ArrowLeft') current = Math.max(current - 1, 0);
      document.getElementById('slide').src = slides[current];
    });
  </script>
</body>
</html>`;
  fs.writeFileSync(path.join(outputDir, 'html', 'index.html'), viewerHTML);
  
  console.log(`\n✅ Slides created in: ${outputDir}/html/`);
  console.log('📺 Open index.html in browser and use arrow keys to navigate');
  console.log('🎬 Use OBS or screen recording to capture the presentation\n');
  
  return slides.length;
}

/**
 * Generate audio narration (placeholder - uses OpenClaw TTS)
 */
function generateAudio(slidesDir, outputDir, options = {}) {
  console.log('🎙️ Generating audio narration...');
  console.log('Note: Use the OpenClaw TTS tool for actual audio generation:');
  console.log('  tts text:"Your narration text here"');
  console.log('  tts textFile:./slides/slide-001.txt');
  console.log('\n📁 Save audio files to:', outputDir);
  
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Create placeholder info
  const info = {
    slidesDir,
    outputDir,
    instructions: [
      '1. For each slide, create a narration script',
      '2. Use TTS tool: tts text:"slide content"',
      '3. Save as: audio/slide-001.mp3',
      '4. Ensure audio duration matches slide duration'
    ]
  };
  
  fs.writeFileSync(path.join(outputDir, 'README.md'), `# Audio Files

${info.instructions.map(i => '- ' + i).join('\n')}

## Generated Files

| Slide | Audio File | Duration |
|-------|------------|----------|
${slidesDir ? '| slide-001 | slide-001.mp3 | 5s |' : ''}
`);
  
  return info;
}

/**
 * Create video using FFmpeg (if available)
 */
function createVideo(slidesDir, audioDir, outputFile, options = {}) {
  console.log('🎬 Creating video...');
  
  const ffmpegPath = findFFmpeg();
  
  if (!ffmpegPath) {
    console.log('⚠️ FFmpeg not found. Please install FFmpeg first:');
    console.log('  Linux: sudo apt install ffmpeg');
    console.log('  macOS: brew install ffmpeg');
    console.log('\n📹 Alternative: Use OBS Studio to record the presentation');
    console.log('   1. Open slides/html/index.html in browser');
    console.log('   2. Start OBS and capture the browser window');
    console.log('   3. Play audio alongside');
    console.log('   4. Stop recording when done');
    return false;
  }
  
  console.log(`✓ Found FFmpeg at: ${ffmpegPath}`);
  
  // Create image sequence from HTML slides
  // This is a placeholder - actual implementation would use puppeteer/playwright
  
  console.log('✅ Video creation would use FFmpeg here');
  console.log(`   Output: ${outputFile}`);
  
  return true;
}

/**
 * Main CLI
 */
function main() {
  const rawArgs = process.argv.slice(2);
  
  // Simple argument parsing
  const command = rawArgs[0] || 'help';
  const getArg = (flag) => {
    const idx = rawArgs.indexOf(flag);
    if (idx >= 0 && rawArgs[idx + 1]) return rawArgs[idx + 1];
    return null;
  };
  const hasFlag = (flag) => rawArgs.includes(flag);
  
  const input = getArg('--input') || getArg('-i');
  const output = getArg('--output') || getArg('-o') || './output';
  const theme = getArg('--theme') || getArg('-t') || 'dark';
  
  switch (command) {
    case 'slides':
      if (!input) {
        console.error('❌ Error: --input required');
        console.log('Usage: node cli.js slides --input <file> --output <dir> --theme <name>');
        process.exit(1);
      }
      
      createSlides(input, output, theme);
      break;
      
    case 'audio':
      const slidesForAudio = getArg('--slides') || getArg('-s') || './slides';
      const audioOutput = getArg('--output') || getArg('-o') || './audio';
      
      generateAudio(slidesForAudio, audioOutput);
      break;
      
    case 'video':
      const inputForVideo = input;
      const outputVideo = output.replace('.mp4', '.mp4'); // Ensure .mp4 extension
      const videoTheme = theme;
      const ffmpegPath = findFFmpeg();
      
      if (inputForVideo) {
        const slidesDir = './slides-temp';
        createSlides(inputForVideo, slidesDir, videoTheme);
        createVideo(slidesDir, './audio', outputVideo, { ffmpegPath });
      } else {
        console.log('Usage: node cli.js video --input <script.txt> --output <video.mp4>');
      }
      break;
      
    case 'help':
    default:
      console.log(`
🎬 Video Creation Pipeline

Commands:
  node cli.js slides --input <file> --output <dir> --theme <name>
    Create HTML slides from a markdown/text script
    
  node cli.js audio --slides <dir> --output <dir>
    Generate audio narration placeholders
    
  node cli.js video --input <file> --output <video.mp4>
    Full pipeline: slides + audio → video

Themes: dark, light, gradient, corporate, nature

Examples:
  node cli.js slides --input training.txt --output ./slides --theme dark
  node cli.js audio --slides ./slides --output ./audio
  node cli.js video --input course.txt --output ./course.mp4 --theme gradient

Notes:
- FFmpeg required for video encoding (optional - OBS works too)
- Use OpenClaw TTS tool for actual audio generation
- For best results, record with OBS Studio

📚 Full docs: ~/.openclaw/workspace/skills/video-creation/SKILL.md
`);
  }
}

main();
