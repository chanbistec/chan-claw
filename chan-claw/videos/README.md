# Training Videos

Each training video is in its own folder under `/videos/`.

## Structure

```
videos/
├── {topic-name}/
│   ├── video.mp4           (video without audio)
│   ├── video-with-audio.mp4 (final video with narration)
│   └── images/
│       ├── slide-001.png
│       ├── slide-002.png
│       └── concat.txt
```

## Available Videos

### openclaw-overview
- **File**: `videos/openclaw-overview/video-with-audio.mp4`
- **Duration**: ~60 seconds
- **Theme**: Light
- **Audio**: ElevenLabs TTS narration

## Generate New Videos

```bash
cd ~/.openclaw/workspace/chan-claw
~/.npm-global/bin/openclaw-video.js "Topic Name" --light
~/.npm-global/bin/openclaw-video.js "Topic Name" --dark

# Custom content:
~/.npm-global/bin/openclaw-video.js "Custom Topic" --content='[{"title":"Title","content":["Point 1","Point 2"]}]'
```

Output goes to: `videos/{topic-lowercase}/video.mp4`
