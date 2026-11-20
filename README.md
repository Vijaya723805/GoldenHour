# GoldenHour 🛡️⚡
### AI-Powered UPI Fraud Reporting and Emergency Assistance Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black.svg?style=flat&logo=next.js)](https://nextjs.org)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Auth%20%26%20DB-Supabase%20PostgreSQL-3ECF8E.svg?logo=supabase)](https://supabase.com)
[![Claude AI](https://img.shields.io/badge/AI-Claude%203.5%20Sonnet%20Vision-7c3aed.svg)](https://anthropic.com)
[![ReportLab](https://img.shields.io/badge/PDF-ReportLab%20Engine-red.svg)](https://www.reportlab.com)
[![PaddleOCR](https://img.shields.io/badge/OCR-PaddleOCR-blue.svg)](https://github.com/PaddlePaddle/PaddleOCR)
[![Security](https://img.shields.io/badge/Safety-Zero%20Credential%20Policy-f59e0b.svg)](#security--zero-credential-policy)

**GoldenHour** is an AI-powered fintech cybersecurity platform designed to assist victims of UPI financial fraud during the critical **Golden Hour (first 2 hours)** following an unauthorized debit. During this window, rapid reporting and an inter-bank lien/freeze can halt money movement across intermediary beneficiary accounts before fraudsters withdraw funds into cash or cryptocurrency.

---

## 🚀 Fully Integrated Modules (1 - 7)

### ✅ Module 1: User Authentication & Dashboard
- Citizen registration, login, logout, and 1-Click Demo Login for testing and judges.
- Dual-mode Supabase PostgreSQL Authentication with local fallback.
- Trilingual UI Support: **English (`en`)**, **తెలుగు (`te`)**, **हिन्दी (`hi`)**.
- 4 Real-time Metric Cards and Golden Hour Threat Alert countdown indicator.

### ✅ Module 2: Fraud Evidence Collection
- Drag-and-drop digital evidence vault for screenshots and bank PDFs (max 15MB).
- Category classification (`UPI_RECEIPT`, `BANK_STATEMENT`, `SMS_ALERT`, `WHATSAPP_CHAT`, `OTHER`).
- Multi-file preview thumbnails and secure private storage isolation (zero public bucket exposure).

### ✅ Module 3: AI-Powered Evidence Extraction
- **Claude 3.5 Sonnet Vision + PaddleOCR** extraction pipeline.
- Extracts structured transaction entities (12-digit UTR, amount, date, time, sender account, beneficiary VPA, bank details).
- Extracts communication intelligence (sender phone, spoofed headers like `VK-POWERC`, conversation timestamps, suspicious payment instructions).
- **Strict Anti-Hallucination Rules**:
  - Never invents missing fields (returns explicit `null`).
  - Preserves raw OCR line-by-line transcript for judicial verification.
  - Confidence scoring per field (`HIGH`, `MEDIUM`, `LOW`, `NOT_FOUND`).
  - Distinguishes victim (sender) vs scammer (beneficiary).
  - Flags conflicting information (e.g. multiple distinct amounts).

### ✅ Module 4: Smart Evidence Verification Engine
- Cross-evidence parameter reconciliation & multi-factor consistency checks.
- Human-in-the-loop complainant parameter review, inline corrections, and audit seal.
- Zero-credential sanitation (strips OTPs, PINs, passwords from all stored representations).
- Multi-factor completeness, consistency, and evidence quality scoring.

### ✅ Module 5: Multilingual AI Emergency Assistant
- Trilingual AI assistant answering queries in **English**, **Telugu**, and **Hindi**.
- Step-by-step guidance for 1930 helpline SOPs, banking freeze procedures, and RBI Circular zero-liability provisions.
- **Senior Citizen Mode** providing simplified, non-technical explanations.
- **Zero-Credential Interception Guardrail**: Detects and redacts secret UPI PIN or OTP inputs with instant safety warnings.

### ✅ Module 6: AI Fraud Complaint Generation
- Compiles 4 formal legal/operational complaint documents from verified case parameters:
  1. **Bank Fraud Dispute & Alert Letter** (Invoking RBI Customer Protection Circular).
  2. **Urgent Account Freeze / Lien Requisition** (Under PMLA / Section 102 CrPC/BNSS).
  3. **1930 Cybercrime Helpline Speaking Script** (Structured verbal intake prompt).
  4. **Cybercrime Portal (`cybercrime.gov.in`) Complaint Dossier** (Ready for portal entry).
- Generates professional, downloadable PDFs with two-pass `Page X of Y` numbering, metadata tables, missing field callouts, and statutory disclaimers.

### ✅ Module 7: Emergency Response and Case Tracking
- **Feature 1: Emergency Checklist (3 Prioritised Action Stages)**:
  - **Within 10 Minutes**: Dial 1930 helpline, alert issuing bank, preserve receipts & evidence, follow official instructions.
  - **Within 1 Hour**: Complete financial cybercrime reporting, submit complaint on official portal where appropriate, share evidence with bank, save acknowledgement & reference numbers.
  - **Within 24 Hours**: Follow up with bank, keep complaint acknowledgement details, check status through official channels, preserve additional evidence.
  - Interactive checkboxes with live completion updates and timestamps.
  - Recommended response targets notice (not guaranteed legal deadlines).
- **Feature 2: Case Tracking**:
  - View all fraud cases with creation dates, lost amounts, and 12-digit UTRs.
  - View & download generated complaint documents.
  - Manually add official reference numbers (1930 NCRP Token, Bank Dispute SR Number, Police FIR Ref) with explicit user confirmation checks.
  - Update follow-up status (`REPORTED_TO_1930`, `BANK_DISPUTE_SUBMITTED`, `UNDER_BANK_INVESTIGATION`, `LIEN_INQUIRY_ACTIVE`, etc.).
  - Complainant activity notes with timestamps and categorization.
  - Chronological action timeline and case audit trail.
- **Feature 3: Official Reporting Links**:
  - Verified National Cybercrime Reporting Portal (`https://cybercrime.gov.in/`).
  - Verified Cybercrime Helpline (`1930` click-to-dial).
  - Bank cyber fraud emergency contacts and portal links.
- **Feature 4: Emergency Dashboard**:
  - Current case status and Golden Hour countdown.
  - Important prioritized next actions.
  - Pending checklist items counter and interactive progress bar.
  - Documents ready for download (PDF/text).
  - Bank follow-up information and nodal advisory.
- **Strict Compliance Safeguards**:
  - Never claims a complaint was submitted unless the user confirmed submission through an authorized channel.
  - Never claims money was recovered or an account was frozen.

---

## 🛠️ Installation & Setup Instructions

### Prerequisites
- Python 3.10+ (tested with Python 3.13)
- Node.js 18+ and npm
- Windows, macOS, or Linux

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI backend server on port 8001
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Backend will be live at:
- **API Base**: `http://localhost:8001/api/v1`
- **Interactive Swagger Docs**: `http://localhost:8001/api/v1/docs`
- **ReDoc Specification**: `http://localhost:8001/api/v1/redoc`

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Next.js development server on port 3000
npm run dev
```

Frontend will be live at:
- **Application URL**: `http://localhost:3000`

---

## ⚙️ Environment Variables Documentation

### Backend (`backend/.env`)

| Variable | Type | Default | Description |
|---|:---:|:---:|---|
| `ENVIRONMENT` | String | `development` | Environment mode (`development`, `production`, `test`). |
| `DEBUG` | Boolean | `True` | Enables verbose tracebacks and reload in development. |
| `ANTHROPIC_API_KEY` | String | *(Optional)* | Anthropic Claude API key for live Claude 3.5 Sonnet Vision extraction. When empty, built-in smart extraction engine operates offline. |
| `ANTHROPIC_MODEL` | String | `claude-3-5-sonnet-20241022` | Claude model variant for visual document reasoning. |
| `SUPABASE_URL` | String | *(Optional)* | Supabase cloud project URL. When empty, operates in secure local storage mode. |
| `SUPABASE_KEY` | String | *(Optional)* | Supabase anon public API key. |
| `SUPABASE_SERVICE_ROLE_KEY` | String | *(Optional)* | Supabase service role key for elevated backend operations. |
| `SUPABASE_BUCKET_EVIDENCE` | String | `evidence-vault` | Private storage bucket name for digital evidence screenshots. |
| `MAX_UPLOAD_SIZE_MB` | Integer | `15` | Maximum allowed upload size per evidence file in megabytes. |
| `UPLOAD_DIR` | String | `uploads` | Local disk storage directory for evidence files. |

### Frontend (`frontend/.env.local`)

| Variable | Type | Default | Description |
|---|:---:|:---:|---|
| `NEXT_PUBLIC_API_URL` | String | `http://localhost:8001/api/v1` | Base URL for FastAPI backend endpoints. |
| `NEXT_PUBLIC_APP_NAME` | String | `"GoldenHour"` | User-facing platform branding. |
| `NEXT_PUBLIC_CYBER_HELPLINE` | String | `"1930"` | National toll-free helpline number. |

---

## 📖 Complete API Reference (v1)

### System Health
- `GET /api/v1/health` - Operational readiness check.

### Module 1: Authentication & Citizen Profile
- `POST /api/v1/auth/register` - Citizen account registration.
- `POST /api/v1/auth/login` - Authenticates user and returns bearer token.
- `GET /api/v1/auth/me` - Retrieves authenticated citizen profile.
- `PUT /api/v1/auth/profile` - Updates banking and notification preferences.

### Module 2: Fraud Incident Cases & Evidence Vault
- `GET /api/v1/dashboard/stats` - Victim statistics and active Golden Hour count.
- `GET /api/v1/cases` - Lists all fraud cases for authenticated citizen.
- `POST /api/v1/cases` - Initializes a new fraud incident case.
- `GET /api/v1/cases/{case_id}` - Full case details with attached evidence items.
- `POST /api/v1/cases/{case_id}/evidence` - Uploads digital screenshot or statement to private vault.
- `GET /api/v1/cases/{case_id}/evidence` - Lists evidence items attached to case.
- `DELETE /api/v1/cases/{case_id}/evidence/{evidence_id}` - Removes evidence item from vault.
- `GET /api/v1/cases/{case_id}/evidence/{evidence_id}/preview` - Authenticated streaming file preview.

### Module 3: AI Evidence Extraction
- `POST /api/v1/extraction/cases/{case_id}/evidence/{evidence_id}/extract` - Executes visual and OCR analysis.
- `GET /api/v1/extraction/cases/{case_id}/evidence/{evidence_id}/extraction` - Retrieves extraction result.
- `GET /api/v1/extraction/cases/{case_id}/extractions` - Retrieves all extractions for a case.
- `POST /api/v1/extraction/cases/{case_id}/evidence/{evidence_id}/verify` - Inline parameter overrides.
- `GET /api/v1/extraction/sample` - Pre-analyzed PhonePe receipt sample.

### Module 4: Smart Evidence Verification
- `GET /api/v1/verification/cases/{case_id}` - Verification report, completeness score, and conflicts.
- `POST /api/v1/verification/cases/{case_id}/verify` - Runs cross-document verification engine.
- `POST /api/v1/verification/cases/{case_id}/confirm` - Human-in-the-loop parameter verification seal.
- `GET /api/v1/verification/scenarios/{scenario_type}` - Pre-seeded test scenarios (`complete`, `incomplete`, `conflicting`, `blurry_duplicate`).

### Module 5: Multilingual AI Emergency Assistant
- `POST /api/v1/assistant/chat` - Interactive trilingual chat query (`en`, `te`, `hi`) with case context and Senior Citizen mode.
- `GET /api/v1/assistant/topics` - Pre-configured rapid guidance topics.
- `GET /api/v1/assistant/context-preview/{case_id}` - Case intelligence preview injected into chat prompt.

### Module 6: AI Fraud Complaint Generation
- `POST /api/v1/complaints/cases/{case_id}/generate` - Compiles all 4 complaint drafts in requested language.
- `GET /api/v1/complaints/cases/{case_id}` - Retrieves complaint bundle.
- `PUT /api/v1/complaints/cases/{case_id}/{doc_type}` - Edits draft before export.
- `GET /api/v1/complaints/cases/{case_id}/{doc_type}/pdf` - Generates and streams formal PDF document.

### Module 7: Emergency Response and Case Tracking
- `GET /api/v1/tracking/cases/{case_id}` - Complete tracking state, 3-stage checklist, timeline, and reference numbers.
- `GET /api/v1/tracking/cases/{case_id}/dashboard` - Emergency dashboard data (current status, priority actions, progress).
- `PUT /api/v1/tracking/cases/{case_id}/reference-numbers` - Logs 1930 NCRP token, Bank SR number, and user confirmation.
- `PUT /api/v1/tracking/cases/{case_id}/status` - Updates follow-up status (`REPORTED_TO_1930`, `BANK_DISPUTE_SUBMITTED`, etc.).
- `POST /api/v1/tracking/cases/{case_id}/notes` - Adds complainant follow-up activity notes.
- `POST /api/v1/tracking/cases/{case_id}/checklist/{item_id}/toggle` - Checks/unchecks emergency checklist item.
- `GET /api/v1/tracking/official-links` - Verified links for `cybercrime.gov.in`, `1930`, and bank portals.

---

## 🧪 Comprehensive QA Testing

Run the automated integration test suites:

```bash
# 1. Run Module 7 Integration Test
backend\venv\Scripts\python.exe backend\test_module_7.py

# 2. Run Master 15-Category Integration Test Suite
backend\venv\Scripts\python.exe backend\test_final_integration.py
```

### Test Suite Execution Output
```
================================================================================
🛡️  GOLDENHOUR FINAL SYSTEM INTEGRATION & QA TEST SUITE
    Comprehensive testing across all 7 modules and 15 QA categories
================================================================================
  • 1 Auth And Login: [PASSED]
  • 2 Evidence Upload: [PASSED]
  • 3 Ocr Extraction: [PASSED]
  • 4 Ai Extraction: [PASSED]
  • 5 Missing Field Detection: [PASSED]
  • 6 Conflicts Detection: [PASSED]
  • 7 Manual Corrections: [PASSED]
  • 8 Complaint Generation: [PASSED]
  • 9 Pdf Downloads: [PASSED]
  • 10 Multilingual Assistant: [PASSED]
  • 11 Emergency Checklist: [PASSED]
  • 12 Case Tracking: [PASSED]
  • 13 Mobile Responsiveness: [PASSED]
  • 14 Error Handling: [PASSED]
  • 15 Security Audit: [PASSED]
================================================================================
🎉 ALL 15 QUALITY ASSURANCE & INTEGRATION TESTS COMPLETED SUCCESSFULLY!
================================================================================
```

For full details, read [docs/TESTING_REPORT.md](file:///c:/GoldenHour/docs/TESTING_REPORT.md).

---

## 🎬 Step-by-Step Demonstration Walkthrough

Follow this scripted demonstration to showcase the complete end-to-end workflow from evidence upload to downloading complaint packages:

### Step 1: Login & Dashboard Overview (Module 1)
1. Open [http://localhost:3000](http://localhost:3000).
2. Click **"Demo Login (Judge/Tester)"** or use credentials `victim.demo@goldenhour.in` / `Demo@1234`.
3. Switch language using the top-right selector (**English**, **తెలుగు**, or **हिन्दी**).
4. Notice the **Golden Hour Active Threat Alert banner** showing real-time countdown.

### Step 2: Upload Fictional Fraud Evidence (Module 2)
1. Navigate to **Report a Fraud** ([http://localhost:3000/dashboard/report](http://localhost:3000/dashboard/report)).
2. Upload the 3 demo evidence files located in `demo_evidence/`:
   - `1_upi_transaction_receipt.png` (Category: `UPI_RECEIPT`)
   - `2_sms_phishing_threat.png` (Category: `SMS_ALERT`)
   - `3_whatsapp_conversation_qr_scam.png` (Category: `WHATSAPP_CHAT`)
3. Submit incident details (Amount: `₹24,500`, Bank: `State Bank of India`).

### Step 3: AI Extraction & Spoofing Detection (Module 3)
1. Navigate to **My Cases** ([http://localhost:3000/dashboard/cases](http://localhost:3000/dashboard/cases)).
2. Select case **GH-2024-8912** and click **"Inspect AI Extractions (Module 3)"**.
3. Inspect extracted entities:
   - 12-Digit UTR: `412890563412` (Confidence: 98%)
   - Amount: `₹24,500.00`
   - Beneficiary VPA: `rewards.claim77@ybl` (YES BANK)
   - Sender Account: `victim.user@okaxis` (Properly separated from scammer)
4. Switch to the SMS file in the dropdown to observe the **Spoofing Alert (`VK-POWERC`)**.

### Step 4: Smart Evidence Verification & Conflict Check (Module 4)
1. Click **"Smart Evidence Verification (Module 4)"**.
2. Review the completeness score (94%) and cross-evidence reconciliation.
3. Observe conflict detection highlighting discrepancies across multi-document amounts.
4. Click **"Confirm & Verify Parameters"** to seal the verified case file with an audit timestamp.

### Step 5: AI Emergency Cyber Assistant (Module 5)
1. Navigate to **AI Assistant** ([http://localhost:3000/dashboard/assistant](http://localhost:3000/dashboard/assistant)).
2. Select **Telugu** or **Hindi** or toggle **Senior Citizen Mode**.
3. Ask: *"What should I do after unauthorized UPI transfer?"*
4. Test zero-credential guardrails by typing: *"My bank sent OTP 889124, should I share it?"* Notice the system intercepts the OTP, replaces it with `[REDACTED-OTP]`, and issues an emergency safety alert.

### Step 6: Generate Legal Complaint Package & PDF Export (Module 6)
1. Click **"Generate Complaints (Module 6)"** ([http://localhost:3000/dashboard/cases/case_101/complaints](http://localhost:3000/dashboard/cases/case_101/complaints)).
2. Review the 4 tailored documents in English, Telugu, or Hindi:
   - Bank Dispute Letter
   - Urgent Account Freeze / Lien Requisition
   - 1930 Speaking Script
   - Cybercrime Portal Dossier
3. Click **"Download Official PDF"** to export the signed, printable legal dossier.

### Step 7: Emergency Response & Case Tracking (Module 7)
1. Open **Emergency & Tracking (M7)** ([http://localhost:3000/dashboard/emergency](http://localhost:3000/dashboard/emergency)) or open the case tracker ([http://localhost:3000/dashboard/cases/case_101](http://localhost:3000/dashboard/cases/case_101)).
2. Check off items across the **3 Action Stages**:
   - Within 10 Minutes: Call 1930, alert bank, preserve receipts.
   - Within 1 Hour: Complete reporting, share evidence with bank, save reference numbers.
   - Within 24 Hours: Follow up with bank, check status on portal.
3. Open the **Reference Numbers** tab, enter NCRP token `2024/NCRP/819203` and Bank SR `SBI-SR-88192031`, check the confirmation box, and save.
4. Open the **Follow-up & Notes** tab to transition status to `BANK_DISPUTE_SUBMITTED` and add branch meeting notes.
5. Open the **Action Timeline** tab to view the complete chronological audit trail.

---

## 🎨 UI/UX Design System & Accessibility (Prompt 9)

GoldenHour features a premium fintech cybersecurity design system engineered for accessibility, high urgency, and clarity:

### 1. Color Palette
- **Deep Navy**: `#101629` – Core background and surface anchor providing focused, distraction-free environment.
- **Purple**: `#7455E8` – Brand action color representing fintech security and modern AI capabilities.
- **Gold**: `#E5B85C` – Warning, urgency, and high-priority badge accent highlighting critical parameters.
- **White**: `#FFFFFF` – High-contrast typography and clear icons conforming to WCAG AAA/AA readability standards.
- **Light Background**: `#F5F6FA` – Used in light surfaces and high-contrast readable elements.

### 2. Senior Citizen & First-Time Digital Payment User Support
- **Plain-Language Jargon Busters**: Clear, inline explanations of complex technical terms (`12-Digit UTR`, `Beneficiary VPA`, `Account Lien`).
- **Accessible Touch Targets**: All buttons, links, and form inputs enforce a minimum touch target height of 44px for effortless mobile & tablet tapping.
- **Senior Citizen Assistant Mode**: Toggles simplified, step-by-step guidance without intimidating legal jargon in English, Telugu, and Hindi.
- **Visual Emergency Timeline**: Clear 3-stage visual timeline (Within 10 Minutes, Within 1 Hour, Within 24 Hours) with interactive checkboxes.
- **Direct-Dial 1930 Helpline**: Prominent, high-contrast click-to-dial button in the navigation bar, sidebar, and landing page.

### 3. Responsive Multi-Device Architecture
- Fully responsive across **Mobile** (< 640px), **Tablet** (640px - 1024px), and **Desktop** (> 1024px).
- Mobile-friendly slide-over navigation drawer with easy dismiss.
- Scrollable data tables with sticky actions.

---

## 🔒 Security & Zero-Credential Policy

1. **Zero-Credential Sanitation**:
   - GoldenHour NEVER asks for, stores, or logs secret UPI PINs, passwords, or OTPs.
   - All extracted text is sanitized via regex pattern matchers that replace PINs with `[REDACTED-PIN]` and OTPs with `[REDACTED-OTP]`.
2. **Private Storage by Default**:
   - Evidence files are saved to isolated private vault paths (`uploads/<case_id>/<uuid>_<filename>`). Public URLs are never exposed.
3. **User Isolation**:
   - Every fraud case is tied to the authenticated citizen UID via Row Level Security (RLS) policies in PostgreSQL.
4. **Zero-False-Claim Principle**:
   - The platform never marks a complaint as submitted unless confirmed by the user.
   - The platform never claims money was recovered or an account was frozen.

---

## ⚠️ Known Limitations

1. **OCR Binary Fallback**:
   - In environments without CUDA/C++ PaddleOCR packages installed, the application uses smart context-aware OCR transcript simulation. In production, running in a Docker container with pre-compiled PaddleOCR provides live pixel OCR.
2. **Bank Automated Direct Freeze**:
   - Under current Indian banking regulations (RBI circulars and Section 102 CrPC/BNSS), software applications cannot unilaterally freeze third-party bank accounts. GoldenHour drafts the legally compliant freeze requisition and speaking scripts for the complainant to serve to the bank nodal officer and 1930 helpline.
