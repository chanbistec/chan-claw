# MedGemma Sinhala — Project Scope

## Vision
A Sinhala-language medical AI assistant powered by Google's MedGemma, enabling patients and healthcare workers in Sri Lanka to interact with clinical AI in their native language.

## Why This Matters
- ~22M Sinhala speakers, most uncomfortable with English medical terminology
- Sri Lankan healthcare system is overburdened — AI triage can reduce unnecessary clinic visits
- Having access to a clinic management system with real patient data is a **massive advantage** for fine-tuning
- First-mover opportunity: no Sinhala medical AI exists today

---

## Phase 1: Foundation (Weeks 1-2)
**Goal:** Get MedGemma running and establish baseline

### Tasks
- [ ] Download MedGemma 4B multimodal from Hugging Face (requires access approval)
- [ ] Set up inference on Colab (T4 GPU — 4B model fits in ~8GB VRAM)
- [ ] Benchmark baseline English medical Q&A accuracy
- [ ] Test baseline Sinhala comprehension (Gemma 3 has some multilingual capability)
- [ ] Document what works out-of-the-box vs what needs fine-tuning

### Deliverables
- Running MedGemma 4B on Colab
- Baseline evaluation report (English vs Sinhala medical queries)

---

## Phase 2: Data Preparation (Weeks 2-4)
**Goal:** Build a Sinhala medical dataset from available sources

### Data Sources
1. **Clinic Management System** (primary)
   - Patient symptoms/complaints in Sinhala
   - Doctor notes and diagnoses
   - Prescription patterns
   - ⚠️ Must be **de-identified** (remove names, NIC numbers, addresses, DOB → age only)

2. **Public Medical Knowledge**
   - Translate common medical Q&A pairs (MedQA, HealthSearchQA) to Sinhala
   - Sri Lankan Ministry of Health guidelines (many available in Sinhala)
   - Sinhala Wikipedia medical articles
   - Common drug names and their Sinhala equivalents

3. **Synthetic Data Generation**
   - Use GPT-4/Claude to generate Sinhala medical conversations
   - Create symptom→diagnosis training pairs in Sinhala
   - Generate patient intake form examples

### Data Pipeline
```
Clinic DB → De-identify → Extract (symptoms, diagnoses, notes)
                              ↓
                    Format as instruction pairs:
                    {"instruction": "රෝගියා හිසරදය සහ උණ ගැන පැමිණිලි කරයි...",
                     "response": "විය හැකි රෝග විනිශ්චය..."}
                              ↓
                    Quality review (doctor validation)
                              ↓
                    Train/Val/Test split
```

### Target Dataset Size
- **Minimum viable:** 5,000 instruction pairs
- **Good quality:** 20,000+ instruction pairs
- **Mix:** 60% clinical Q&A, 20% patient triage, 10% drug info, 10% health education

### De-identification Requirements
- Remove all PII (names, NIC, phone, address, email)
- Replace dates with relative offsets
- Generalize locations (specific hospital → "hospital")
- Age ranges instead of exact ages for rare conditions
- Must comply with Sri Lanka's Data Protection Act

### Deliverables
- De-identified dataset in JSONL format
- Data quality report
- Doctor-validated sample (100+ pairs reviewed by physician)

---

## Phase 3: Fine-Tuning (Weeks 4-6)
**Goal:** Fine-tune MedGemma on Sinhala medical data

### Approach
- **Method:** LoRA (Low-Rank Adaptation) — parameter efficient, works on T4 GPU
- **Base model:** MedGemma 4B multimodal
- **Framework:** Hugging Face Transformers + PEFT
- **Hardware:** Google Colab Pro (T4 16GB) or A100 if budget allows

### Training Config
```python
lora_config = {
    "r": 16,                    # LoRA rank
    "lora_alpha": 32,           # scaling
    "target_modules": ["q_proj", "v_proj", "k_proj", "o_proj"],
    "lora_dropout": 0.05,
    "task_type": "CAUSAL_LM"
}

training_args = {
    "num_train_epochs": 3,
    "per_device_train_batch_size": 4,
    "gradient_accumulation_steps": 8,
    "learning_rate": 2e-4,
    "warmup_ratio": 0.03,
    "fp16": True,               # T4 supports fp16
    "max_seq_length": 2048
}
```

### Evaluation
- Medical Q&A accuracy (Sinhala test set)
- Symptom triage correctness (validated by doctor)
- Hallucination rate
- Compare: base MedGemma vs fine-tuned on same Sinhala queries

### Deliverables
- Fine-tuned LoRA adapter weights
- Evaluation report with metrics
- Sample inference outputs reviewed by medical professional

---

## Phase 4: Application Layer (Weeks 6-8)
**Goal:** Build a usable interface

### Option A: Copilot Studio Agent (Recommended for Bistec)
- Deploy as Microsoft Teams bot for clinic staff
- Knowledge grounding from clinic's own medical guidelines
- Actions: patient lookup, appointment scheduling, drug interaction check
- Sinhala input/output with English fallback for medical terms

### Option B: Standalone Web App
- Next.js frontend with Sinhala text input
- API backend serving MedGemma inference
- Patient symptom checker flow
- Health education chatbot

### Option C: WhatsApp Bot (Widest Reach)
- Patients text symptoms in Sinhala via WhatsApp
- AI provides preliminary guidance + clinic referral
- Integrates with clinic management system for appointments

### Recommended: Start with Option A (Teams) for clinic staff, then Option C (WhatsApp) for patients

---

## Phase 5: Voice Integration (Weeks 8-10)
**Goal:** Connect Piper Sinhala TTS (what we're training now!) for voice output

### Pipeline
```
Patient speaks Sinhala → Whisper ASR → MedGemma reasoning → Piper TTS → Sinhala voice response
```

### Components
- **ASR:** OpenAI Whisper (already supports Sinhala)
- **LLM:** MedGemma fine-tuned (this project)
- **TTS:** Piper Sinhala (currently training!)
- **Orchestration:** Copilot Studio or custom pipeline

---

## Technical Requirements

### Infrastructure
| Component | Option 1 (Budget) | Option 2 (Production) |
|-----------|-------------------|----------------------|
| Inference | Colab Pro / Hetzner GPU | Azure ML / GCP Vertex AI |
| API | Azure App Service | Azure Container Apps |
| Database | Existing clinic DB | Azure SQL + Cosmos DB |
| Frontend | Next.js on Vercel | Next.js on Azure Static Web Apps |

### Model Serving
- MedGemma 4B with LoRA adapter: ~8GB VRAM
- vLLM or TGI for production serving
- Expected latency: <2s per response on T4

### Security & Compliance
- All patient data stays within Sri Lanka (data residency)
- End-to-end encryption for patient communications
- Audit logging for all AI interactions
- Doctor-in-the-loop for critical diagnoses
- Clear disclaimers: "AI-assisted, not a replacement for medical advice"
- Comply with Sri Lanka NMRA regulations for health software

---

## Resource Requirements

### Team
- **AI Engineer** (Chandima / Bistec) — fine-tuning, deployment
- **Medical Advisor** (doctor from clinic network) — data validation, clinical review
- **Data Engineer** — clinic data extraction, de-identification
- **Frontend Dev** — application UI

### Compute Budget
- Colab Pro: ~$10/month (T4 access)
- Colab Pro+: ~$50/month (A100 access, faster training)
- Production GPU server: ~$200-400/month (Hetzner/Azure)

### Timeline
| Phase | Duration | Dependencies |
|-------|----------|-------------|
| 1. Foundation | 2 weeks | MedGemma access approval |
| 2. Data Prep | 2-3 weeks | Clinic data access, doctor availability |
| 3. Fine-Tuning | 2 weeks | Dataset ready |
| 4. Application | 2-3 weeks | Model ready |
| 5. Voice | 2 weeks | Piper TTS model ready |
| **Total** | **10-12 weeks** | |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Insufficient Sinhala medical data | Poor model quality | Supplement with synthetic data + translated datasets |
| Medical hallucinations | Patient safety | Doctor-in-the-loop, confidence thresholds, disclaimers |
| Clinic data privacy breach | Legal/ethical | Strict de-identification, access controls, audit trail |
| MedGemma access denied | Project blocked | Fallback to Gemma 3 base + medical fine-tuning |
| Colab GPU limits | Training delays | Checkpoint resume, consider Hetzner GPU server |
| Doctor availability for validation | Quality gaps | Batch reviews, structured rubrics, async feedback |

---

## Success Metrics
- **Accuracy:** >80% on Sinhala medical Q&A test set
- **Triage correctness:** >90% agreement with doctor assessment
- **Hallucination rate:** <5% on validated test set
- **User satisfaction:** >4/5 rating from clinic staff pilot
- **Response time:** <3s end-to-end (text input → text output)

---

## Quick Wins (Can Start Now)
1. ✅ Apply for MedGemma access on Hugging Face
2. ✅ Start collecting/translating medical Q&A pairs
3. ✅ Draft data sharing agreement with clinic
4. ✅ Identify 1-2 doctors willing to validate data
5. ✅ Piper Sinhala TTS already training (voice pipeline ready soon)

---

*Created: 2026-03-18 | Author: OpenClaw for Bistec Global*
