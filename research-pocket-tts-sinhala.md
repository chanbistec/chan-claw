# Research Report: Fine-tuning Kyutai Pocket TTS for Sinhala (සිංහල)

**Date:** 2026-03-17  
**Status:** Research complete — actionable plan included

---

## 1. Model Architecture

### Overview
Pocket TTS is a **100M-parameter** text-to-speech model based on the **CALM (Continuous Audio Language Models)** architecture described in [arXiv:2509.06926](https://arxiv.org/abs/2509.06926). Key design:

- **Backbone:** Transformer that autoregressively produces contextual embeddings at each timestep
- **Sampling head:** MLP using **consistency modeling** (not diffusion) to generate continuous VAE latent frames — this is what makes it fast (1 step instead of hundreds)
- **Short-context Transformer:** Summarizes recent clean latents for fine-grained local context
- **VAE decoder:** Converts continuous latents back to audio waveform
- **Latent CFG + distillation:** Classifier-Free Guidance in latent space, distilled into a smaller student backbone

### Text Processing Pipeline
The repo is **English-only** and does not expose training code. Based on the paper and architecture:

- Text is likely processed through a **phoneme-based or character-level** front-end (the paper doesn't detail the text encoder specifics for Pocket TTS, referring to a separate technical report at `kyutai.org/pocket-tts-technical-report` which was not accessible)
- The text conditioning feeds into the Transformer backbone
- Voice cloning works via audio prompt → KV-cache state (no text involved)

### Key Numbers
- 100M parameters total
- Runs 6x real-time on MacBook Air M4 CPU
- ~200ms first-chunk latency
- 24kHz output (typical for this class of model)
- Batch size 1, 2 CPU cores

---

## 2. Fine-tuning Support

### Official Status: ❌ No training code released

- **No training scripts** in the repository — only inference code (generate, serve, export-voice)
- **No fine-tuning documentation** anywhere
- The model weights are on HuggingFace (`kyutai/pocket-tts`) but training infrastructure is not open-sourced

### Issue #118 — Multilingual Plans
[GitHub Issue #118](https://github.com/kyutai-labs/pocket-tts/issues/118): Kyutai plans to add:
- Spanish, French, German, Portuguese, Italian

**Sinhala is NOT on their roadmap.** They're focusing on major European languages first.

### What This Means
To add Sinhala, you would need to either:
1. **Wait** for Kyutai to release training code (uncertain timeline)
2. **Reverse-engineer** the training pipeline from the paper + inference code (significant effort)
3. **Use a different model** that already supports fine-tuning for new languages (recommended — see Section 5)

---

## 3. Sinhala Speech Datasets

### Available Datasets

| Dataset | Type | Size | Quality | License | Link |
|---------|------|------|---------|---------|------|
| **OpenSLR 30** | Multi-speaker TTS | Unknown (likely 2-5 hours) | High quality, manually checked | CC BY-SA 4.0 | [openslr.org/30](https://www.openslr.org/30/) |
| **OpenSLR 52** | ASR training data | ~185K utterances (~200+ hours) | Crowd-sourced, manually checked | CC BY-SA 4.0 | [openslr.org/52](https://www.openslr.org/52/) |
| **Google FLEURS** | ASR/ST benchmark | ~10 hours (si_lk config) | High quality, read speech | CC BY 4.0 | [huggingface.co/datasets/google/fleurs](https://huggingface.co/datasets/google/fleurs) |
| **Mozilla Common Voice** | ASR | Likely small (<5 hours validated) | Crowd-sourced, variable | CC-0 | [commonvoice.mozilla.org](https://commonvoice.mozilla.org/si/datasets) |

### Assessment
- **OpenSLR 30** is the **best starting point** for TTS — it's specifically multi-speaker TTS data with transcriptions, collected by Google
- **OpenSLR 52** is massive (~185K utterances) but ASR-focused — useful for pretraining/augmentation but may have noisier audio
- **FLEURS** provides clean ~10 hours with Sinhala config `si_lk`
- **Combined usable TTS data: ~15-20 hours** (optimistic) — this is on the low end for TTS fine-tuning but workable with the right approach

---

## 4. Sinhala Text Processing

### Script Characteristics
- **Unicode range:** U+0D80–U+0DFF (Sinhala block)
- **Writing system:** Abugida (consonant-vowel syllabic)
- **~60 graphemes** (consonants + vowels + modifiers)
- **Inherent vowel:** Each consonant carries an inherent /a/ sound

### Phoneme Inventory
- **~25 consonant phonemes** (stops, nasals, fricatives, approximants, laterals)
- **~14 vowel phonemes** (7 short + 7 long)
- Retroflex consonants (ට, ඩ, ණ) — important for TTS quality
- Prenasalized stops (ඳ, ඟ) — distinctive Sinhala feature

### Existing G2P Tools
- **eSpeak-ng:** Has Sinhala support (`si` language code) — this is the most practical option for G2P
- **Phonetisaurus/Sequitur:** Could be trained on a Sinhala pronunciation dictionary
- **IPA transcription:** Sinhala script is relatively phonemic (grapheme-to-phoneme mapping is more regular than English), making rule-based G2P feasible
- **Google's Sinhala TTS** (used internally) likely has G2P but not publicly available

### Recommendation
**eSpeak-ng** for initial G2P, supplemented with rule-based corrections for Sinhala-specific phenomena. The relatively regular orthography is actually an advantage — Sinhala is easier to do G2P for than English.

---

## 5. Similar Projects & Alternative Approaches

### VITS for Indic Languages ✅ Most Promising Path
- **[VITS](https://github.com/jaywalnut310/vits)** — end-to-end TTS, well-documented fine-tuning, ~200 lines to adapt for a new language
- **[Coqui TTS](https://github.com/coqui-ai/TTS)** (now archived but still usable) — has VITS implementation with documented multilingual fine-tuning
- **[AI4Bharat IndicTTS](https://github.com/AI4Bharat)** — has worked on Indic language TTS including related languages
- **[Piper TTS](https://github.com/rhasspy/piper)** — lightweight VITS-based TTS designed for new languages, has a training pipeline, runs on CPU
- **[IMS-Toucan](https://github.com/DigitalPhonetics/IMS-Toucan)** — multilingual TTS toolkit supporting 7000+ languages via meta-learning

### Has Anyone Fine-tuned Pocket TTS?
**No.** No community fine-tuning exists because:
1. No training code is released
2. The CALM architecture with consistency heads is novel and complex
3. The model is only 3 months old (released Jan 2026)

### Recommended Alternative: Piper TTS
[Piper](https://github.com/rhasspy/piper) is the closest practical alternative:
- VITS-based, runs on CPU, small model size
- **Has documented training pipeline for new languages**
- Already supports 30+ languages
- Active community adding new languages
- Would be significantly easier to add Sinhala to

---

## 6. Hardware Requirements

### For Pocket TTS (if training code existed)
- **Training the full CALM pipeline:** Would require:
  - VAE training: 1-4x A100 GPUs
  - Backbone + consistency head: 4-8x A100 GPUs
  - ~100M params but complex training (consistency modeling, CFG, distillation)
- **Fine-tuning only (if supported):** Likely 1x A100 or 2x A10G (24GB VRAM minimum)
- **Hetzner ARM VPS (4GB RAM): ❌ Absolutely not** — no GPU, insufficient RAM

### For VITS/Piper (realistic alternative)
- **Training:** 1x GPU with 8-16GB VRAM (RTX 3060/3090, T4, A10G)
- **Training time:** ~24-72 hours for a new language with 5-10 hours of data
- **Fine-tuning from existing checkpoint:** 8-24 hours on 1x GPU
- **Cloud cost:** ~$5-30 on Lambda Labs, Vast.ai, or RunPod
- **Hetzner:** They offer GPU instances (GX11 with A100) — ~€2/hour
- **Inference:** Runs on CPU (including your ARM VPS)

---

## 7. Estimated Effort & Timeline

### Option A: Wait for Pocket TTS Multilingual (Passive)
- **Timeline:** Unknown — Sinhala is not on their roadmap even for planned languages
- **Effort:** Zero until training code is released
- **Probability of Sinhala support:** Very low in near term

### Option B: Build Sinhala TTS with Piper/VITS (Recommended) ⭐

| Phase | Task | Time | Notes |
|-------|------|------|-------|
| 1 | Data preparation | 1-2 weeks | Download OpenSLR 30+52, clean audio, normalize transcripts |
| 2 | G2P setup | 2-3 days | Configure eSpeak-ng for Sinhala, validate phoneme mappings |
| 3 | Training pipeline | 1-2 days | Set up Piper training or Coqui TTS with VITS |
| 4 | Initial training | 3-5 days | Train on OpenSLR 30 (TTS data), augment with FLEURS |
| 5 | Evaluation & iteration | 1-2 weeks | Listen tests, fix G2P issues, retrain |
| 6 | Optimization | 3-5 days | Export ONNX, test on ARM VPS |

**Total: 4-6 weeks** for a working Sinhala TTS that runs on CPU.

### Option C: Reverse-engineer Pocket TTS Training (Hard Mode)
- **Timeline:** 2-4 months minimum
- **Effort:** Very high — need to implement CALM training from the paper
- **Risk:** High — may not converge, undocumented hyperparameters
- **Only worthwhile if** Pocket TTS voice quality is significantly better than VITS for your use case

---

## 8. Recommended Action Plan

### Immediate (This Week)
1. **Download and evaluate OpenSLR 30** — understand the Sinhala TTS data quality and format
2. **Test eSpeak-ng Sinhala G2P** — `espeak-ng -v si --ipa "සිංහල"` — verify quality
3. **Try Pocket TTS in English** — get familiar with the output quality as a baseline

### Short Term (Weeks 1-3)
4. **Set up Piper TTS training** — follow their [training guide](https://github.com/rhasspy/piper/blob/master/TRAINING.md)
5. **Prepare Sinhala dataset** — format OpenSLR 30 for Piper/VITS training
6. **Rent a GPU** — Vast.ai or RunPod, 1x RTX 3090 (~$0.30/hour)
7. **Train initial model** — expect rough but functional output

### Medium Term (Weeks 3-6)
8. **Iterate on quality** — fix G2P errors, add more data from OpenSLR 52
9. **Export and deploy** — ONNX model running on your Hetzner ARM VPS
10. **Monitor Pocket TTS** — watch issue #118 for training code release

### Long Term
11. **When/if Pocket TTS releases training code** — port your Sinhala data pipeline to it
12. **Consider contributing** — if you build good Sinhala G2P, contribute back to the community

---

## Key Links

- **Pocket TTS repo:** <https://github.com/kyutai-labs/pocket-tts>
- **CALM paper:** <https://arxiv.org/abs/2509.06926>
- **Issue #118 (multilingual):** <https://github.com/kyutai-labs/pocket-tts/issues/118>
- **OpenSLR 30 (Sinhala TTS):** <https://www.openslr.org/30/>
- **OpenSLR 52 (Sinhala ASR):** <https://www.openslr.org/52/>
- **Google FLEURS (si_lk):** <https://huggingface.co/datasets/google/fleurs>
- **Piper TTS:** <https://github.com/rhasspy/piper>
- **eSpeak-ng:** <https://github.com/espeak-ng/espeak-ng>
- **IMS-Toucan:** <https://github.com/DigitalPhonetics/IMS-Toucan>

---

## TL;DR

**You can't fine-tune Pocket TTS today** — no training code is released, Sinhala isn't on their roadmap, and the architecture (CALM with consistency heads) is too novel to easily replicate. 

**Best path:** Use **Piper TTS** (VITS-based, CPU-friendly, has training pipeline) with **OpenSLR 30** Sinhala data and **eSpeak-ng** for G2P. Achievable in **4-6 weeks**, deployable on your ARM VPS. Monitor Pocket TTS for future training code release.
