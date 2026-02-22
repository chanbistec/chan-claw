# Kokoro TTS Setup

## Overview
Kokoro TTS is an open-source text-to-speech model with:
- 82M parameters (lightweight, efficient)
- Multiple voices: Bella, Sarah, Adam, etc.
- Languages: English, French, Korean, Japanese, Mandarin
- OpenAI-compatible API

## Website
https://kokorottsai.com

## Try Online
https://webml-community-kokoro-web.static.hf.space

## Installation Options

### Option 1: Hugging Face Inference API
```bash
# Get token from https://huggingface.co/settings/tokens
export HF_TOKEN="your_token_here"
```

### Option 2: Local Setup (requires Python)
```bash
# Install dependencies
pip install kokoro-tts
pip install sounddevice numpy

# Download models
python -c "from kokoro import KokoroTTS; KokoroTTS.download()"
```

### Option 3: Docker
```bash
docker run -p 8000:8000 kokoro-tts/server
```

## Usage (OpenAI-compatible)
```python
import openai

client = openai.OpenAI(
    base_url="https://api.kokorottsai.com/v1",
    api_key="your_api_key"
)

audio = client.audio.speech.create(
    model="kokoro",
    voice="bella",
    input="Hello, this is Kokoro TTS!"
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
| jane | French | Female |
| max | German | Male |
| yun | Korean | Male |
| mei | Chinese | Female |
| haruki | Japanese | Male |

## Comparison with ElevenLabs
| Feature | Kokoro TTS | ElevenLabs |
|---------|------------|------------|
| Cost | Free (open-source) | Paid |
| Quality | High (82M params) | Very High |
| Voices | 10+ | 100+ |
| Languages | 5 | 29+ |
| Local | Yes | No |
| API | OpenAI-compatible | Custom |
