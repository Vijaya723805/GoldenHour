# GoldenHour REST API Specification (v1)

Base URL: `http://localhost:8001/api/v1`
Interactive Swagger Docs: `http://localhost:8001/api/v1/docs`

---

## 1. System Health
- **Endpoint**: `GET /api/v1/health`
- **Description**: Returns operational status of FastAPI, database connectivity, and AI service readiness.

---

## 2. Authentication & User Profile (Module 1)
- **Endpoint**: `POST /api/v1/auth/register`
- **Endpoint**: `POST /api/v1/auth/login`
- **Endpoint**: `GET /api/v1/auth/me`
- **Endpoint**: `PUT /api/v1/auth/profile`

---

## 3. Dashboard Statistics & Cases (Module 1 & 2)
- **Endpoint**: `GET /api/v1/dashboard/stats`
- **Endpoint**: `GET /api/v1/cases`
- **Endpoint**: `POST /api/v1/cases`
- **Endpoint**: `GET /api/v1/cases/{case_id}`
- **Endpoint**: `POST /api/v1/cases/{case_id}/evidence`
- **Endpoint**: `GET /api/v1/cases/{case_id}/evidence`
- **Endpoint**: `DELETE /api/v1/cases/{case_id}/evidence/{evidence_id}`
- **Endpoint**: `GET /api/v1/cases/{case_id}/evidence/{evidence_id}/preview`

---

## 4. AI-Powered Evidence Extraction (Module 3)
- **Endpoint**: `POST /api/v1/extraction/cases/{case_id}/evidence/{evidence_id}/extract`
  - **Description**: Runs the visual (Claude Vision) and OCR (PaddleOCR) analysis pipeline on an uploaded evidence screenshot or PDF.
  - **Rules Enforced**:
    - Never hallucinates missing information (returns explicit `null`).
    - Preserves raw OCR transcript for verification.
    - Computes confidence scores per entity (`HIGH`, `MEDIUM`, `LOW`, `NOT_FOUND`).
    - Distinguishes victim (sender) vs scammer (beneficiary).
    - Detects sender ID spoofing (e.g. `VK-POWERC`).
    - Surfaces conflicting data across multiple lines or documents.
  - **Response Structure**:
    ```json
    {
      "success": true,
      "data": {
        "id": "ext_sample_101",
        "case_id": "case_101",
        "evidence_id": "ev_101_1",
        "evidence_file_name": "phonepe_payment_receipt_24500.png",
        "evidence_category": "UPI_RECEIPT",
        "transaction_info": {
          "transaction_id_utr": { "value": "412890563412", "confidence": 0.98, "confidence_level": "HIGH", "source": "cross_verified" },
          "amount": { "value": 24500.0, "confidence": 0.98, "confidence_level": "HIGH", "source": "cross_verified" },
          "beneficiary_upi_id": { "value": "rewards.claim77@ybl", "confidence": 0.97, "confidence_level": "HIGH" },
          "beneficiary_bank": { "value": "YES BANK", "confidence": 0.92, "confidence_level": "HIGH" }
        },
        "communication_info": {
          "sender_phone_number": { "value": null, "confidence_level": "NOT_FOUND" },
          "is_sender_spoofed": { "value": false },
          "suspicious_payment_instructions": []
        },
        "conflicts_detected": [],
        "overall_confidence": 0.96,
        "zero_credential_sanitized": true,
        "user_verified": false
      }
    }
    ```

- **Endpoint**: `GET /api/v1/extraction/cases/{case_id}/evidence/{evidence_id}/extraction`
  - **Description**: Retrieves previously generated or cached extraction result.

- **Endpoint**: `GET /api/v1/extraction/cases/{case_id}/extractions`
  - **Description**: Retrieves all extraction results across all evidence items in the case.

- **Endpoint**: `POST /api/v1/extraction/cases/{case_id}/evidence/{evidence_id}/verify`
  - **Description**: Allows the victim to inspect and confirm the extracted transaction parameters, or supply manual inline overrides.
  - **Request Body**:
    ```json
    {
      "user_verified": true,
      "corrections": {
        "transaction_id_utr": "412890563412",
        "amount": 24500.0
      }
    }
    ```

- **Endpoint**: `GET /api/v1/extraction/sample`
  - **Description**: Returns sample pre-analyzed PhonePe receipt extraction for offline testing.

---

## 5. Emergency Golden Hour Assistance
- **Endpoint**: `GET /api/v1/emergency/instructions`
- **Endpoint**: `GET /api/v1/emergency/bank-contacts`

---

## 6. AI Fraud Complaint Generation (Module 6)
- **Endpoint**: `POST /api/v1/complaints/cases/{case_id}/generate`
- **Endpoint**: `GET /api/v1/complaints/cases/{case_id}`
- **Endpoint**: `PUT /api/v1/complaints/cases/{case_id}/{doc_type}`
- **Endpoint**: `GET /api/v1/complaints/cases/{case_id}/{doc_type}/pdf`

---

## 7. Emergency Response and Case Tracking (Module 7)
- **Endpoint**: `GET /api/v1/tracking/cases/{case_id}`
  - **Description**: Retrieves full case tracking state, 3-stage emergency checklist (10m, 1h, 24h), chronological action timeline, manual reference numbers, follow-up notes, and ready documents.
- **Endpoint**: `GET /api/v1/tracking/cases/{case_id}/dashboard`
  - **Description**: Returns emergency dashboard summary including current status, prioritized next actions, pending checklist items, ready documents, follow-up information, and verified links.
- **Endpoint**: `PUT /api/v1/tracking/cases/{case_id}/reference-numbers`
  - **Description**: Allows complainant to manually log official complaint reference numbers (1930 NCRP Acknowledgement Token, Bank Dispute SR Number, Police FIR Ref) and explicit submission confirmations.
- **Endpoint**: `PUT /api/v1/tracking/cases/{case_id}/status`
  - **Description**: Updates complainant follow-up status (e.g. `REPORTED_TO_1930`, `BANK_DISPUTE_SUBMITTED`, `UNDER_BANK_INVESTIGATION`, `LIEN_INQUIRY_ACTIVE`, `RESOLVED`, `CLOSED`) and records an audit timeline event.
- **Endpoint**: `POST /api/v1/tracking/cases/{case_id}/notes`
  - **Description**: Records chronological follow-up activity notes (bank call, branch visit, officer meeting, etc.).
- **Endpoint**: `POST /api/v1/tracking/cases/{case_id}/checklist/{item_id}/toggle`
  - **Description**: Checks or unchecks an emergency checklist item, automatically recording completion timestamp and timeline event.
- **Endpoint**: `GET /api/v1/tracking/official-links`
  - **Description**: Returns verified official links for the National Cybercrime Reporting Portal (`https://cybercrime.gov.in/`), Cybercrime Helpline (`1930`), and major bank dispute centers.
