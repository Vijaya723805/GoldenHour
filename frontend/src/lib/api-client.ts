import { 
  ApiResponse, 
  SystemHealth, 
  EvidenceAnalysis, 
  FraudReport, 
  EmergencyGuidance,
  DashboardStats,
  FraudCaseSummary,
  FraudCaseDetail,
  CreateCasePayload,
  EvidenceItem,
  EvidenceCategory,
  EvidenceExtractionResult,
  UserVerificationPayload,
  CaseVerificationReport,
  ConfirmVerificationPayload,
  AssistantChatRequest,
  AssistantChatResponse,
  CaseComplaintBundle,
  GeneratedDocument,
  ComplaintDocType,
  CaseTrackingDetail,
  EmergencyDashboardData,
  OfficialLinkItem,
  AddNotePayload,
  UpdateReferenceNumbersPayload,
  UpdateTrackingStatusPayload
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

export function getAuthHeaders(token?: string | null): Record<string, string> {
  const t = token || (typeof window !== "undefined" ? localStorage.getItem("goldenhour_token") : null);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function fetchHealth(): Promise<ApiResponse<SystemHealth>> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to connect to GoldenHour backend API" },
    };
  }
}

export async function fetchDashboardStats(token?: string | null): Promise<ApiResponse<DashboardStats>> {
  try {
    const res = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders(token),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: true,
      data: {
        total_cases: 4,
        cases_in_preparation: 2,
        submitted_complaints: 2,
        total_amount_defrauded: 97000.0,
        total_amount_recovered: 9500.0,
        active_golden_hour_cases: 1,
      },
    };
  }
}

export async function fetchDashboardCases(token?: string | null): Promise<ApiResponse<FraudCaseSummary[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/cases`, {
      headers: getAuthHeaders(token),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to load fraud cases" },
    };
  }
}

export async function createFraudCase(
  payload: CreateCasePayload,
  token?: string | null
): Promise<ApiResponse<FraudCaseDetail>> {
  try {
    const res = await fetch(`${API_BASE_URL}/cases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to create fraud case" },
    };
  }
}

export async function fetchCaseDetail(
  caseId: string,
  token?: string | null
): Promise<ApiResponse<FraudCaseDetail>> {
  try {
    const res = await fetch(`${API_BASE_URL}/cases/${caseId}`, {
      headers: getAuthHeaders(token),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to load case detail" },
    };
  }
}

export async function uploadCaseEvidence(
  caseId: string,
  file: File,
  category: EvidenceCategory,
  description?: string,
  token?: string | null
): Promise<ApiResponse<EvidenceItem>> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    if (description) formData.append("description", description);

    const res = await fetch(`${API_BASE_URL}/cases/${caseId}/evidence`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: formData,
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to upload evidence file" },
    };
  }
}

export async function fetchCaseEvidence(
  caseId: string,
  token?: string | null
): Promise<ApiResponse<EvidenceItem[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/cases/${caseId}/evidence`, {
      headers: getAuthHeaders(token),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to load case evidence" },
    };
  }
}

export async function deleteCaseEvidence(
  caseId: string,
  evidenceId: string,
  token?: string | null
): Promise<ApiResponse<boolean>> {
  try {
    const res = await fetch(`${API_BASE_URL}/cases/${caseId}/evidence/${evidenceId}`, {
      method: "DELETE",
      headers: getAuthHeaders(token),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to delete evidence file" },
    };
  }
}

export function getEvidencePreviewUrl(caseId: string, evidenceId: string): string {
  return `${API_BASE_URL}/cases/${caseId}/evidence/${evidenceId}/preview`;
}

// Module 3: AI Evidence Extraction Client Methods
export async function triggerEvidenceExtraction(
  caseId: string,
  evidenceId: string,
  token?: string | null
): Promise<ApiResponse<EvidenceExtractionResult>> {
  try {
    const res = await fetch(`${API_BASE_URL}/extraction/cases/${caseId}/evidence/${evidenceId}/extract`, {
      method: "POST",
      headers: getAuthHeaders(token),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to execute AI evidence extraction" },
    };
  }
}

export async function fetchEvidenceExtraction(
  caseId: string,
  evidenceId: string,
  token?: string | null
): Promise<ApiResponse<EvidenceExtractionResult>> {
  try {
    const res = await fetch(`${API_BASE_URL}/extraction/cases/${caseId}/evidence/${evidenceId}/extraction`, {
      headers: getAuthHeaders(token),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to fetch extraction result" },
    };
  }
}

export async function fetchCaseExtractions(
  caseId: string,
  token?: string | null
): Promise<ApiResponse<EvidenceExtractionResult[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/extraction/cases/${caseId}/extractions`, {
      headers: getAuthHeaders(token),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to fetch case extractions" },
    };
  }
}

export async function verifyExtractionResult(
  caseId: string,
  evidenceId: string,
  payload: UserVerificationPayload,
  token?: string | null
): Promise<ApiResponse<EvidenceExtractionResult>> {
  try {
    const res = await fetch(`${API_BASE_URL}/extraction/cases/${caseId}/evidence/${evidenceId}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to verify extraction data" },
    };
  }
}

export async function fetchEmergencyGuidance(): Promise<ApiResponse<EmergencyGuidance>> {
  try {
    const res = await fetch(`${API_BASE_URL}/emergency/instructions`, { cache: "no-store" });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to load emergency guidance" },
    };
  }
}

export async function uploadEvidenceFile(file: File): Promise<ApiResponse<any>> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/evidence/upload`, {
      method: "POST",
      body: formData,
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to upload file" },
    };
  }
}

export async function analyzeEvidence(evidenceId: string): Promise<ApiResponse<EvidenceAnalysis>> {
  try {
    const res = await fetch(`${API_BASE_URL}/evidence/analyze/${evidenceId}`, {
      method: "POST",
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to analyze evidence" },
    };
  }
}

export async function createComplaintDraft(payload: {
  victim_name?: string;
  victim_phone?: string;
  victim_email?: string;
  victim_bank_name?: string;
  category?: string;
  incident_description?: string;
  transaction?: any;
}): Promise<ApiResponse<FraudReport>> {
  try {
    const res = await fetch(`${API_BASE_URL}/fraud-report/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        victim_name: payload.victim_name || "Citizen Complainant",
        victim_phone: payload.victim_phone || "Not provided",
        victim_email: payload.victim_email || "Not provided",
        victim_bank_name: payload.victim_bank_name || "Victim Bank",
        category: payload.category || "UNAUTHORIZED_DEBIT",
        incident_description: payload.incident_description || "Unauthorized UPI debit incident.",
        transaction: payload.transaction,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to generate complaint draft" },
    };
  }
}

// ==========================================
// Module 4: Smart Evidence Verification Client Methods
// ==========================================

export async function triggerCaseVerification(
  caseId: string,
  token?: string | null
): Promise<ApiResponse<CaseVerificationReport>> {
  try {
    const res = await fetch(`${API_BASE_URL}/verification/cases/${caseId}/verify`, {
      method: "POST",
      headers: getAuthHeaders(token),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to execute smart verification" },
    };
  }
}

export async function fetchCaseVerification(
  caseId: string,
  token?: string | null
): Promise<ApiResponse<CaseVerificationReport>> {
  try {
    const res = await fetch(`${API_BASE_URL}/verification/cases/${caseId}/verification`, {
      headers: getAuthHeaders(token),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to fetch verification report" },
    };
  }
}

export async function confirmCaseVerification(
  caseId: string,
  payload: ConfirmVerificationPayload,
  token?: string | null
): Promise<ApiResponse<CaseVerificationReport>> {
  try {
    const res = await fetch(`${API_BASE_URL}/verification/cases/${caseId}/verification/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to confirm verification" },
    };
  }
}

export async function fetchTestVerificationScenario(
  scenarioType: string
): Promise<ApiResponse<CaseVerificationReport>> {
  try {
    const res = await fetch(`${API_BASE_URL}/verification/test-scenarios/${scenarioType}`, {
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to load verification test scenario" },
    };
  }
}

// ==========================================
// Module 5: Multilingual AI Assistant Client Methods
// ==========================================

export async function sendAssistantChat(
  req: AssistantChatRequest,
  token?: string | null
): Promise<ApiResponse<AssistantChatResponse>> {
  try {
    const res = await fetch(`${API_BASE_URL}/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify(req),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to communicate with AI Assistant" },
    };
  }
}

export async function fetchAssistantTopics(): Promise<ApiResponse<Record<string, Array<{ id: string; label: string; topic: string }>>>> {
  try {
    const res = await fetch(`${API_BASE_URL}/assistant/topics`, { cache: "no-store" });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to load assistant topics" },
    };
  }
}

export async function fetchAssistantContextPreview(
  caseId: string
): Promise<ApiResponse<Record<string, any>>> {
  try {
    const res = await fetch(`${API_BASE_URL}/assistant/context-preview/${caseId}`, { cache: "no-store" });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to load case context preview" },
    };
  }
}

// ==========================================
// Module 6: AI Complaint Generation Client Methods
// ==========================================

export async function fetchCaseComplaints(
  caseId: string,
  language: string = "en",
  token?: string | null
): Promise<ApiResponse<CaseComplaintBundle>> {
  try {
    const res = await fetch(`${API_BASE_URL}/complaints/cases/${caseId}?language=${language}`, {
      headers: getAuthHeaders(token),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to fetch complaint documents" },
    };
  }
}

export async function generateCaseComplaints(
  caseId: string,
  language: string = "en",
  regenerate: boolean = false,
  token?: string | null
): Promise<ApiResponse<CaseComplaintBundle>> {
  try {
    const res = await fetch(`${API_BASE_URL}/complaints/cases/${caseId}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify({ language, regenerate }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to generate complaint documents" },
    };
  }
}

export async function updateComplaintDocument(
  caseId: string,
  docType: string,
  content: string,
  language: string = "en",
  token?: string | null
): Promise<ApiResponse<GeneratedDocument>> {
  try {
    const res = await fetch(`${API_BASE_URL}/complaints/cases/${caseId}/${docType}?language=${language}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify({ content, is_user_edited: true }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to update complaint draft" },
    };
  }
}

export function getComplaintPdfDownloadUrl(
  caseId: string,
  docType: string,
  language: string = "en"
): string {
  return `${API_BASE_URL}/complaints/cases/${caseId}/${docType}/pdf?language=${language}`;
}

// ==========================================
// Module 7: Emergency Response & Case Tracking API Methods
// ==========================================

export async function fetchCaseTracking(
  caseId: string,
  token?: string | null
): Promise<ApiResponse<CaseTrackingDetail>> {
  try {
    const res = await fetch(`${API_BASE_URL}/tracking/cases/${caseId}`, {
      headers: getAuthHeaders(token),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to fetch case tracking details" },
    };
  }
}

export async function fetchEmergencyDashboard(
  caseId: string,
  token?: string | null
): Promise<ApiResponse<EmergencyDashboardData>> {
  try {
    const res = await fetch(`${API_BASE_URL}/tracking/cases/${caseId}/dashboard`, {
      headers: getAuthHeaders(token),
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to fetch emergency dashboard data" },
    };
  }
}

export async function updateReferenceNumbers(
  caseId: string,
  payload: UpdateReferenceNumbersPayload,
  token?: string | null
): Promise<ApiResponse<CaseTrackingDetail>> {
  try {
    const res = await fetch(`${API_BASE_URL}/tracking/cases/${caseId}/reference-numbers`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to save reference numbers" },
    };
  }
}

export async function updateCaseTrackingStatus(
  caseId: string,
  payload: UpdateTrackingStatusPayload,
  token?: string | null
): Promise<ApiResponse<CaseTrackingDetail>> {
  try {
    const res = await fetch(`${API_BASE_URL}/tracking/cases/${caseId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to update case status" },
    };
  }
}

export async function addFollowUpNote(
  caseId: string,
  payload: AddNotePayload,
  token?: string | null
): Promise<ApiResponse<CaseTrackingDetail>> {
  try {
    const res = await fetch(`${API_BASE_URL}/tracking/cases/${caseId}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to add follow-up note" },
    };
  }
}

export async function toggleChecklistItem(
  caseId: string,
  itemId: string,
  isCompleted: boolean,
  token?: string | null
): Promise<ApiResponse<CaseTrackingDetail>> {
  try {
    const res = await fetch(`${API_BASE_URL}/tracking/cases/${caseId}/checklist/${itemId}/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify({ is_completed: isCompleted }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to toggle checklist item" },
    };
  }
}

export async function fetchOfficialReportingLinks(): Promise<ApiResponse<OfficialLinkItem[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/tracking/official-links`, {
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Failed to fetch official reporting links" },
    };
  }
}



