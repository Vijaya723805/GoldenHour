# GoldenHour 🛡️⚡
### AI-Powered UPI Fraud Reporting and Emergency Assistance Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black.svg?style=flat&logo=next.js)](https://nextjs.org)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![Claude AI](https://img.shields.io/badge/AI-Claude%203.5%20Sonnet%20Vision-7c3aed.svg)](https://anthropic.com)
[![RapidOCR](https://img.shields.io/badge/OCR-RapidOCR%20ONNX-blue.svg)](https://github.com/RapidAI/RapidOCR)
[![ReportLab](https://img.shields.io/badge/PDF-ReportLab%20Engine-red.svg)](https://www.reportlab.com)
[![Security](https://img.shields.io/badge/Safety-Zero%20Credential%20Policy-f59e0b.svg)](#-security--zero-credential-policy)

**GoldenHour** is an AI-powered fintech cybersecurity platform designed to assist victims of UPI financial fraud during the critical **Golden Hour (first 2 hours)** following an unauthorized debit. During this window, rapid reporting and an inter-bank lien/freeze can halt money movement across intermediary beneficiary accounts before fraudsters withdraw funds into cash or cryptocurrency.

---

## 🚀 Fully Integrated Modules (1 – 7)

### ✅ Module 1: User Authentication & Dashboard
- Citizen registration, login, logout, and **1-Click Demo Login** for testing and judges.
- Dual-mode authentication with **local in-memory fallback** (no Supabase required for demo).
- Trilingual UI Support: **English (`en`)**, **తెలుగు (`te`)**, **हिन्दी (`hi`)**.
- 4 real-time metric cards and Golden Hour Threat Alert countdown indicator.
- **Global Senior Citizen Mode** toggle in the navbar — persists via `localStorage`, applies larger text, higher contrast, and bigger touch targets across the entire dashboard.

### ✅ Module 2: Fraud Evidence Collection
- Drag-and-drop digital evidence vault for screenshots and bank PDFs (max 15 MB).
- Category classification (`UPI_RECEIPT`, `BANK_STATEMENT`, `SMS_ALERT`, `WHATSAPP_CHAT`, `OTHER`).
- Multi-file preview thumbnails and secure private storage isolation (zero public bucket exposure).

### ✅ Module 3: AI-Powered Evidence Extraction
- **Claude 3.5 Sonnet Vision + RapidOCR (ONNX Runtime)** extraction pipeline.
- Extracts structured transaction entities: 12-digit UTR, amount, date/time, sender account, beneficiary VPA, bank details.
- Extracts communication intelligence: sender phone, spoofed SMS headers (e.g., `VK-POWERC`), conversation timestamps, suspicious payment instructions.
- **Strict Anti-Hallucination Rules**:
  - Never invents missing fields — returns explicit `null`.
  - Preserves raw OCR line-by-line transcript for judicial verification.
  - Confidence scoring per field (`HIGH`, `MEDIUM`, `LOW`, `NOT_FOUND`).
  - Distinguishes victim (sender) vs scammer (beneficiary).
  - Flags conflicting information (e.g. multiple distinct amounts).

### ✅ Module 4: Smart Evidence Verification Engine
- Cross-evidence parameter reconciliation & multi-factor consistency checks.
- Human-in-the-loop complainant parameter review, inline corrections, and audit seal.
- Zero-credential sanitation — strips OTPs, PINs, and passwords from all stored representations.
- Multi-factor completeness, consistency, and evidence quality scoring.

### ✅ Module 5: Multilingual AI Emergency Assistant
- **Interactive AI chatbot** answering queries in **English**, **Telugu**, and **Hindi**.
- **Topic-aware quick action chips** that change based on conversation context (e.g. links to Complaint Studio, case-specific URLs).
- **Contextual follow-up questions** auto-suggested per topic (e.g. 1930 helpline SOP → suggests "What to say at the bank?").
- Step-by-step guidance for 1930 helpline SOPs, banking freeze procedures, and RBI Circular zero-liability provisions.
- **Global Senior Citizen Mode** provides simplified, non-technical explanations — toggle once from the navbar, applied everywhere.
- **Zero-Credential Interception Guardrail**: Detects and redacts secret UPI PIN or OTP inputs with instant safety warnings.

### ✅ Module 6: AI Fraud Complaint Generation
- Compiles 4 formal legal/operational complaint documents from verified case parameters:
  1. **Bank Fraud Dispute & Alert Letter** (invoking RBI Customer Protection Circular).
  2. **Urgent Account Freeze / Lien Requisition** (under PMLA / Section 102 CrPC/BNSS).
  3. **1930 Cybercrime Helpline Speaking Script** (structured verbal intake prompt).
  4. **Cybercrime Portal (`cybercrime.gov.in`) Complaint Dossier** (ready for portal entry).
- Generates professional, downloadable PDFs with two-pass `Page X of Y` numbering, metadata tables, missing field call-outs, and statutory disclaimers.
- PDFs correctly display the **logged-in victim's details** — dynamically resolved from the authenticated user's profile.
- **Native PDF download** (`application/pdf`) — no browser misconfiguration required.

### ✅ Module 7: Emergency Response and Case Tracking
- **Feature 1 — Emergency Checklist (3 Prioritised Action Stages)**:
  - **Within 10 Minutes**: Dial 1930 helpline, alert issuing bank, preserve receipts & evidence.
  - **Within 1 Hour**: Complete financial cybercrime reporting, submit complaint on official portal, share evidence, save acknowledgement numbers.
  - **Within 24 Hours**: Follow up with bank, check status through official channels, preserve additional evidence.
  - Interactive checkboxes with live completion updates and timestamps.
- **Feature 2 — Case Tracking**:
  - View all fraud cases with creation dates, lost amounts, and 12-digit UTRs.
  - **Download complaint PDFs directly** from the Documents Ready tab.
  - Manually add official reference numbers (1930 NCRP Token, Bank Dispute SR, Police FIR Ref).
  - Update follow-up status (`REPORTED_TO_1930`, `BANK_DISPUTE_SUBMITTED`, `UNDER_BANK_INVESTIGATION`, `LIEN_INQUIRY_ACTIVE`, etc.).
  - Complainant activity notes with timestamps and categorisation.
  - Chronological action timeline and case audit trail.
- **Feature 3 — Official Reporting Links**:
  - Verified National Cybercrime Reporting Portal (`https://cybercrime.gov.in/`).
  - Verified Cybercrime Helpline (`1930` click-to-dial).
  - Bank cyber fraud emergency contacts and portal links.
- **Feature 4 — Emergency Dashboard**:
  - Current case status and Golden Hour countdown.
  - Important prioritised next actions.
  - Pending checklist items counter and interactive progress bar.
  - Documents ready for download (native PDF).
- **Strict Compliance Safeguards**:
  - Never claims a complaint was submitted unless the user confirmed submission through an authorised channel.
  - Never claims money was recovered or an account was frozen.

---

## 🛠️ Installation & Setup

### Prerequisites
- Python **3.10+** (tested with Python 3.13)
- Node.js **18+** and npm
- Windows, macOS, or Linux

---

### 1. Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1
# Activate (Linux / macOS)
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI backend on port 8001
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Backend endpoints:
| URL | Purpose |
|---|---|
| `http://localhost:8001/api/v1` | API base |
| `http://localhost:8001/api/v1/docs` | Interactive Swagger UI |
| `http://localhost:8001/api/v1/redoc` | ReDoc specification |

> **Note:** After every backend restart, all users must **log in again** — the token store is in-memory for the demo.

---

### 2. Frontend Setup

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Next.js dev server on port 3000
npm run dev -- -H 127.0.0.1
```

Frontend will be live at: **`http://127.0.0.1:3000`**

> **Windows tip:** Use `-H 127.0.0.1` to avoid `EADDRINUSE` port conflicts on Windows.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|:---:|---|
| `ENVIRONMENT` | `development` | Mode: `development`, `production`, `test`. |
| `DEBUG` | `True` | Enables verbose tracebacks and hot-reload. |
| `ANTHROPIC_API_KEY` | *(Optional)* | Claude API key for live Vision extraction. When empty, smart offline extraction runs. |
| `ANTHROPIC_MODEL` | `claude-3-5-sonnet-20241022` | Claude model variant. |
| `SUPABASE_URL` | *(Optional)* | Supabase project URL. When empty, uses secure local storage mode. |
| `SUPABASE_KEY` | *(Optional)* | Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Optional)* | Supabase service role key for elevated ops. |
| `SUPABASE_BUCKET_EVIDENCE` | `evidence-vault` | Private storage bucket for evidence screenshots. |
| `MAX_UPLOAD_SIZE_MB` | `15` | Max upload size per evidence file (MB). |
| `UPLOAD_DIR` | `uploads` | Local disk storage for evidence files. |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|:---:|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8001/api/v1` | FastAPI backend base URL. |
| `NEXT_PUBLIC_APP_NAME` | `"GoldenHour"` | Platform branding. |
| `NEXT_PUBLIC_CYBER_HELPLINE` | `"1930"` | National toll-free helpline number. |

---

## 📖 API Reference (v1)

### System
- `GET /api/v1/health` — Operational readiness check.

### Module 1 — Authentication
- `POST /api/v1/auth/register` — Citizen account registration.
- `POST /api/v1/auth/login` — Authenticate and receive bearer token.
- `GET /api/v1/auth/me` — Retrieve authenticated citizen profile.
- `PUT /api/v1/auth/profile` — Update banking and notification preferences.

### Module 2 — Cases & Evidence Vault
- `GET /api/v1/dashboard/stats` — Victim statistics and active Golden Hour count.
- `GET /api/v1/cases` — List all fraud cases for the authenticated citizen.
- `POST /api/v1/cases` — Initialise a new fraud incident case.
- `GET /api/v1/cases/{case_id}` — Full case details with attached evidence.
- `POST /api/v1/cases/{case_id}/evidence` — Upload screenshot or statement to vault.
- `GET /api/v1/cases/{case_id}/evidence` — List evidence items on a case.
- `DELETE /api/v1/cases/{case_id}/evidence/{evidence_id}` — Remove evidence item.
- `GET /api/v1/cases/{case_id}/evidence/{evidence_id}/preview` — Authenticated streaming preview.

### Module 3 — AI Evidence Extraction
- `POST /api/v1/extraction/cases/{case_id}/evidence/{evidence_id}/extract` — Visual + OCR analysis.
- `GET /api/v1/extraction/cases/{case_id}/evidence/{evidence_id}/extraction` — Retrieve extraction result.
- `GET /api/v1/extraction/cases/{case_id}/extractions` — All extractions for a case.
- `POST /api/v1/extraction/cases/{case_id}/evidence/{evidence_id}/verify` — Inline parameter overrides.
- `GET /api/v1/extraction/sample` — Pre-analysed PhonePe receipt sample.

### Module 4 — Smart Verification
- `GET /api/v1/verification/cases/{case_id}` — Verification report and completeness score.
- `POST /api/v1/verification/cases/{case_id}/verify` — Run cross-document verification.
- `POST /api/v1/verification/cases/{case_id}/confirm` — Human-in-the-loop audit seal.
- `GET /api/v1/verification/scenarios/{scenario_type}` — Pre-seeded test scenarios.

### Module 5 — Multilingual AI Assistant
- `POST /api/v1/assistant/chat` — Interactive trilingual chat (`en`, `te`, `hi`) with Senior Citizen mode and topic-aware quick actions.
- `GET /api/v1/assistant/topics` — Pre-configured rapid guidance topics.
- `GET /api/v1/assistant/context-preview/{case_id}` — Case intelligence preview for chat prompt.

### Module 6 — Complaint Generation & PDF
- `POST /api/v1/complaints/cases/{case_id}/generate` — Compile all 4 complaint drafts in selected language.
- `GET /api/v1/complaints/cases/{case_id}` — Retrieve complaint bundle.
- `PUT /api/v1/complaints/cases/{case_id}/{doc_type}` — Edit draft before export.
- `GET /api/v1/complaints/cases/{case_id}/{doc_type}/pdf` — Generate and stream formal PDF (supports `?language=en|te|hi&token=...`).

### Module 7 — Emergency Response & Case Tracking
- `GET /api/v1/tracking/cases/{case_id}` — Full tracking state, checklist, timeline, reference numbers.
- `GET /api/v1/tracking/cases/{case_id}/dashboard` — Emergency dashboard data.
- `PUT /api/v1/tracking/cases/{case_id}/reference-numbers` — Log NCRP token, Bank SR, Police FIR.
- `PUT /api/v1/tracking/cases/{case_id}/status` — Update follow-up status.
- `POST /api/v1/tracking/cases/{case_id}/notes` — Add complainant activity notes.
- `POST /api/v1/tracking/cases/{case_id}/checklist/{item_id}/toggle` — Check/uncheck checklist item.
- `GET /api/v1/tracking/official-links` — Verified links for `cybercrime.gov.in`, `1930`, and bank portals.

---

## 🧪 Testing

Run the automated integration test suites (with backend venv active):

```powershell
# Module 7 Integration Test
python backend\test_module_7.py

# Master 15-Category Integration Test Suite
python backend\test_final_integration.py
```

### Expected output

```
================================================================================
🛡️  GOLDENHOUR FINAL SYSTEM INTEGRATION & QA TEST SUITE
    Comprehensive testing across all 7 modules and 15 QA categories
================================================================================
  •  1 Auth And Login:            [PASSED]
  •  2 Evidence Upload:           [PASSED]
  •  3 Ocr Extraction:            [PASSED]
  •  4 Ai Extraction:             [PASSED]
  •  5 Missing Field Detection:   [PASSED]
  •  6 Conflicts Detection:       [PASSED]
  •  7 Manual Corrections:        [PASSED]
  •  8 Complaint Generation:      [PASSED]
  •  9 Pdf Downloads:             [PASSED]
  • 10 Multilingual Assistant:    [PASSED]
  • 11 Emergency Checklist:       [PASSED]
  • 12 Case Tracking:             [PASSED]
  • 13 Mobile Responsiveness:     [PASSED]
  • 14 Error Handling:            [PASSED]
  • 15 Security Audit:            [PASSED]
================================================================================
🎉 ALL 15 QUALITY ASSURANCE & INTEGRATION TESTS COMPLETED SUCCESSFULLY!
================================================================================
```

For full details see [docs/TESTING_REPORT.md](docs/TESTING_REPORT.md).

---

## 🎬 Demo Walkthrough

### Step 1 — Login & Dashboard (Module 1)
1. Open `http://127.0.0.1:3000`.
2. Click **"Demo Login (Judge/Tester)"** or sign in with `vijayagaraga84@gmail.com`.
3. Switch language from the top-right selector (**English / తెలుగు / हिन्दी**).
4. Click the **Glasses 👓** icon in the navbar to toggle **Senior Citizen Mode** — font sizes grow, contrast increases, and touch targets enlarge across all pages.

### Step 2 — Upload Fraud Evidence (Module 2)
1. Navigate to **Report a Fraud**.
2. Upload demo files from `demo_evidence/`:
   - `1_upi_transaction_receipt.png` → `UPI_RECEIPT`
   - `2_sms_phishing_threat.png` → `SMS_ALERT`
   - `3_whatsapp_conversation_qr_scam.png` → `WHATSAPP_CHAT`
3. Submit incident details (Amount: `₹24,500`, Bank: `State Bank of India`).

### Step 3 — AI Extraction & Spoofing Detection (Module 3)
1. Go to **My Cases** → select the new case → **"Inspect AI Extractions"**.
2. Inspect extracted entities (UTR, amount, VPA, sender account).
3. Switch to the SMS evidence item to see the **Spoofing Alert** (`VK-POWERC`).

### Step 4 — Smart Evidence Verification (Module 4)
1. Click **"Smart Evidence Verification"**.
2. Review completeness score and cross-evidence conflict highlights.
3. Click **"Confirm & Verify Parameters"** to seal the case with an audit timestamp.

### Step 5 — AI Emergency Assistant (Module 5)
1. Navigate to **AI Assistant**.
2. Toggle **Senior Citizen Mode** in the navbar for simplified language.
3. Ask: *"What should I do after unauthorized UPI transfer?"*
4. Notice **topic-aware quick action chips** and **follow-up question suggestions** update per topic.
5. Test the guardrail: type *"My bank sent OTP 889124, should I share it?"* — the OTP is redacted and a safety warning fires.

### Step 6 — Generate Complaints & Download PDFs (Module 6)
1. Go to **Complaint Studio** for the case.
2. Click **"Generate / Refresh Documents"** to compile all 4 complaint drafts.
3. Click **"Download PDF"** on any card — a true PDF file downloads directly (not a `.txt`).

### Step 7 — Emergency Response & Tracking (Module 7)
1. Open **Emergency & Tracking**.
2. Work through the 3-stage checklist.
3. In the **Reference Numbers** tab, enter NCRP token and Bank SR number.
4. In the **Documents Ready** tab, download complaint PDFs.
5. In the **Action Timeline** tab, review the full chronological audit trail.

---

## 🎨 UI/UX & Accessibility

### Colour Palette
| Token | Hex | Usage |
|---|---|---|
| Deep Navy | `#101629` | Core background |
| Purple | `#7455E8` | Brand action colour |
| Gold | `#E5B85C` | Warning / urgency accents |
| White | `#FFFFFF` | High-contrast typography |
| Light BG | `#F5F6FA` | Readable surface elements |

### Senior Citizen Mode (Global)
- Activated by the **Glasses 👓** button in the top navbar — works on **every page**.
- Increases base font size to `1.125rem` (18 px), boosts line-height to `1.75`.
- Enforces `min-height: 52px` on all buttons and interactive elements.
- Persisted in `localStorage` — survives page refresh and navigation.
- AI Assistant also switches to simpler, jargon-free language in this mode.

### Responsive Design
- Fully responsive across **Mobile** (< 640 px), **Tablet** (640–1024 px), and **Desktop** (> 1024 px).
- Mobile-friendly slide-over navigation drawer.
- Scrollable data tables with sticky action columns.

---

## 🔒 Security & Zero-Credential Policy

1. **Zero-Credential Sanitation** — GoldenHour **never** asks for, stores, or logs UPI PINs, passwords, or OTPs. All extracted text is sanitised via regex — PINs → `[REDACTED-PIN]`, OTPs → `[REDACTED-OTP]`.
2. **Private Storage by Default** — Evidence files are saved to isolated private vault paths (`uploads/<case_id>/<uuid>_<filename>`). Public URLs are never exposed.
3. **User Isolation** — Every fraud case is tied to the authenticated citizen via victim scoping on all case queries.
4. **Zero-False-Claim Principle** — The platform never marks a complaint as submitted unless the user confirms. It never claims money was recovered or an account was frozen.
5. **Dynamic Victim Resolution** — PDF documents resolve the victim's name, phone, and bank from the **currently logged-in user**, preventing cross-user data leakage in documents.

---

## ⚠️ Known Limitations

1. **In-Memory Token Store** — After every backend restart, all users must re-login. Tokens are stored in-memory (`_mock_tokens` dict) for demo simplicity.
2. **OCR Engine** — Uses `rapidocr-onnxruntime` (CPU-only ONNX). For production, a GPU-accelerated OCR service would improve throughput on large PDFs.
3. **Bank Automated Direct Freeze** — Under current Indian banking regulations (RBI circulars, Section 102 CrPC/BNSS), software cannot unilaterally freeze third-party accounts. GoldenHour drafts the legally compliant freeze requisition and speaking scripts for the complainant to serve to the bank nodal officer and the 1930 helpline.
4. **No Supabase Required** — The platform fully operates in local storage mode (JSON files in `uploads/`) without a Supabase project. Set Supabase env vars only if you want cloud persistence.

---

## 📂 Project Structure

```
GoldenHour/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/     # FastAPI route handlers (auth, cases, extraction, complaints, tracking, assistant)
│   │   ├── services/             # Business logic (claude_service, ocr_service, complaint_service, auth_service, ...)
│   │   ├── schemas/              # Pydantic request/response models
│   │   └── core/                 # Config, security, CORS
│   ├── main.py                   # FastAPI app entry point
│   ├── requirements.txt          # Python dependencies
│   └── uploads/                  # Local evidence vault & JSON stores
├── frontend/
│   └── src/
│       ├── app/                  # Next.js App Router pages
│       │   └── dashboard/        # assistant, cases, emergency, report pages
│       ├── components/dashboard/ # Navbar, sidebar, shared UI components
│       ├── context/              # SeniorModeContext (global Senior Citizen Mode)
│       └── lib/                  # api-client.ts (typed API calls + PDF download)
├── demo_evidence/                # Sample fraud screenshots for demo
├── docs/                         # Architecture, API spec, testing report
└── README.md
```

---

## 👩‍💻 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React |
| Backend | FastAPI (Python 3.13), Uvicorn, Pydantic v2 |
| AI / Vision | Anthropic Claude 3.5 Sonnet, RapidOCR (ONNX Runtime) |
| PDF Generation | ReportLab |
| Auth & DB | Local JSON store (Supabase PostgreSQL optional) |
| State | React Context API (`SeniorModeContext`, `LanguageContext`) |

---

## 📄 License

This project was built for a hackathon. All demo data is entirely fictional and for testing purposes only.
