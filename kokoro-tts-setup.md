# Kokoro TTS Setup

## Current Status: Using gTTS (Google TTS) as Fallback

Since the server lacks sudo access for system audio libraries, we use **gTTS** (Google TTS) as a free fallback.

### Installation (No sudo needed)
```bash
# Already installed
~/.local/bin/gtts-cli --help
```

### Usage
```bash
# Basic
~/.local/bin/gtts-cli "Hello world" -l en -o output.mp3

# Or use the wrapper
~/.npm-global/bin/kokoro-tts.js "Hello world" -o output.mp3 -l en
```

## Full Kokoro TTS Setup (Requires sudo)

### Option 1: Hosted API
Get API key from https://kokorottsai.com

### Option 2: Local (needs sudo for PortAudio)
```bash
sudo apt install portaudio19-dev python3-pyaudio
pip install kokoro-tts
```

### Option 3: Docker
```bash
docker run -p 8000:8000 ghcr.io/remsky/kokoro-onnx:latest
```

## Website
https://kokorottsai.com

## Try Online
https://webml-community-kokoro-web.static.hf.space

## Usage (OpenAI-compatible API)
```python
import openai
client = openai.OpenAI(
    base_url="https://api.kokorottsai.com/v1",
    api_key="your_api_key"
)
audio = client.audio.speech.create(
    model="kokoro",
    voice="bella",
    input="Hello!"
)
```

## Available Voices
| Voice | Language | Gender |
|-------|----------|--------|
| bella | American English | Female |
| sarah | American English | Female |
| adam | American English | Male |
| george | British English | Male |
| lily | British English | Female |

## Comparison
| Feature | gTTS (current) | Kokoro TTS | ElevenLabs |
|---------|---------------|------------|------------|
| Cost | Free | Free/Open | Paid |
| Quality | Basic | High | Very High |
| No API key | ✅ | ❌ | ❌ |
