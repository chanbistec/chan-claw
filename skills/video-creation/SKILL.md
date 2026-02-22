# Video Creation Skill

Create professional training videos from text scripts using a slide-based presentation pipeline.

## Overview

This skill creates a complete video creation pipeline:
1. **Text Script** → Convert to structured slides
2. **Audio Narration** → Generate TTS audio for each slide
3. **Video Output** → Combine slides + audio into video

## Setup

### Prerequisites
- **FFmpeg** (for video encoding): `sudo apt install ffmpeg` (Linux) or `brew install ffmpeg` (macOS)
- **ImageMagick** (for slide images): `sudo apt install imagemagick` (Linux) or `brew install imagemagick` (macOS)
- **ElevenLabs API key** (recommended for quality TTS)

### Configuration

Add to `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "video-creation": {
      "enabled": true,
      "ffmpegPath": "/usr/bin/ffmpeg",
      "convertPath": "/usr/bin/convert",
      "elevenlabs": {
        "apiKey": "your-elevenlabs-api-key",
        "voiceId": "your-voice-id",
        "modelId": "eleven_v3"
      }
    }
  }
}
```

## Usage

### Command Format

```
video-create <action> <options>
```

### Actions

#### 1. Create Slides from Text
```
video-create slides --input <text-file> --output <slides-dir> --theme <dark|light|gradient>
```

Example input file (`training-script.md`):
```markdown
# Training: Getting Started

## Introduction
Welcome to this training session on getting started with our platform.

## What You'll Learn
- How to create your first project
- Basic configuration steps
- Best practices for success

## Let's Begin
Click "Next" to continue.
```

#### 2. Generate Audio Narration
```
video-create audio --slides <slides-dir> --output <audio-dir> [--elevenlabs]
```

Uses ElevenLabs for professional narration. Falls back to OpenAI TTS if not configured.

#### 3. Create Video (Full Pipeline)
```
video-create video --input <text-file> --output <video.mp4> [--theme dark] [--voice <voice-id>]
```

Runs the complete pipeline: slides → audio → video.

#### 4. List Available Voices
```
video-create voices
```

Lists available ElevenLabs voices.

### Manual Video Creation (No FFmpeg)

If FFmpeg is not available, use this workflow:

1. **Generate HTML Presentation**:
   ```
   video-create slides --input training.txt --output ./slides --theme dark --format html
   ```

2. **Record with OBS**:
   - Open `slides/index.html` in browser
   - Use OBS to record the window
   - Play audio alongside

## Project Structure

```
project/
├── script.txt           # Your training script
├── slides/              # Generated slides
│   ├── slide-001.png
│   ├── slide-002.png
│   └── ...
├── audio/               # Generated narration
│   ├── slide-001.mp3
│   └── ...
├── video/              # Final output
│   └── training.mp4
└── config.json         # Slide configuration
```

## Slide Configuration

Create a `config.json` in your project:

```json
{
  "title": "Training Title",
  "theme": "dark",
  "background": "#1a1a2e",
  "textColor": "#ffffff",
  "accentColor": "#e94560",
  "font": "Inter, sans-serif",
  "slideDuration": 5,
  "transitions": "fade"
}
```

## Tips for Great Training Videos

### Script Writing
- **Keep slides simple**: One main idea per slide
- **Short sentences**: Easy to read and narrate
- **Visual cues**: Describe what visuals should appear

### Narration
- **Pacing**: 150 words/minute for comfortable listening
- **Breaks**: Add pauses between major sections
- **Voice**: Use ElevenLabs for natural sound

### Timing
- **5 seconds minimum** per slide (allows reading time)
- **10 seconds** for complex slides
- **Longer** for demonstrations

## Examples

### Basic Training Video
```bash
video-create video --input intro.txt --output ./training.mp4 --theme dark
```

### Multi-Section Course
```bash
# Create slides with gradient theme
video-create slides --input course.txt --output ./slides --theme gradient

# Generate narration
video-create audio --slides ./slides --output ./audio

# Create video
video-create video --slides ./slides --audio ./audio --output ./course.mp4
```

## Troubleshooting

### "FFmpeg not found"
Install FFmpeg:
- Linux: `sudo apt install ffmpeg`
- macOS: `brew install ffmpeg`

### "ImageMagick not found"
Install ImageMagick:
- Linux: `sudo apt install imagemagick`
- macOS: `brew install imagemagick`

### Audio/Video out of sync
Check slide durations in config. Increase `slideDuration` for longer audio clips.

### Slides too fast/slow
Adjust timing:
```json
{
  "defaultDuration": 5,
  "perWordDelay": 0.1
}
```

## Advanced: Custom Themes

Create a theme file (`my-theme.json`):

```json
{
  "name": "Corporate Blue",
  "background": "#0056b3",
  "textColor": "#ffffff",
  "headingColor": "#ffc107",
  "fontFamily": "'Roboto', sans-serif",
  "logo": "company-logo.png",
  "footer": "Company Training © 2026"
}
```

Use with:
```bash
video-create slides --input script.txt --theme my-theme.json
```

## Supported Formats

| Format | Extension | Description |
|--------|----------|-------------|
| Markdown | `.md` | Full slide support |
| Plain Text | `.txt` | Simple formatting |
| HTML | `.html` | Direct slide definition |
| JSON | `.json` | Structured data |

## Best Practices

1. **Script first**: Write your script before creating slides
2. **Test locally**: Preview slides before recording
3. **Record in sections**: Long videos → multiple short videos
4. **Add captions**: Use the generated transcript for subtitles

## Voice Options

| Provider | Quality | Cost | Setup |
|----------|---------|------|-------|
| ElevenLabs | ⭐⭐⭐⭐⭐ | Paid | API key |
| OpenAI TTS | ⭐⭐⭐⭐ | Pay-per-use | Built-in |
| Local TTS | ⭐⭐⭐ | Free | No setup |

---

**Ready to create your training video?** Start with a simple script!
