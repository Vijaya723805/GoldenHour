export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    type?: string;
    details?: any;
  };
}

export type Language = "en" | "te" | "hi";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  bank_name: string;
  preferred_language: Language;
  created_at: string;
  updated_at: string;
  email_notifications?: boolean;
  sms_notifications?: boolean;
}

export interface UserAuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export type CaseStatus =
  | "DRAFT"
  | "IN_PREPARATION"
  | "REVIEW_PENDING"
  | "APPROVED"
  | "LIEN_REQUESTED"
  | "SUBMITTED_TO_CYBER_CELL"
  | "RECOVERED"
  | "CLOSED";

export type EvidenceCategory =
  | "UPI_RECEIPT"
  | "BANK_STATEMENT"
  | "SMS_ALERT"
  | "WHATSAPP_CHAT"
  | "OTHER";

export interface EvidenceItem {
  id: string;
  case_id: string;
  file_name: string;
  sanitized_file_name: string;
  file_size_bytes: number;
  content_type: string;
  category: EvidenceCategory;
  description?: string;
  storage_location: string;
  storage_path: string;
  created_at: string;
  has_preview?: boolean;
}

export interface FraudCaseSummary {
  id: string;
  case_number: string;
  victim_id: string;
  title: string;
  fraud_category: string;
  transaction_id_utr?: string;
  amount_lost: number;
  beneficiary_upi_id?: string;
  beneficiary_bank?: string;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  golden_hour_active: boolean;
  evidence_count: number;
}

export interface FraudCaseDetail extends FraudCaseSummary {
  fraud_description: string;
  incident_date?: string;
  preferred_language?: string;
  contact_phone?: string;
  contact_email?: string;
  evidence_items: EvidenceItem[];
}

export interface CreateCasePayload {
  title: string;
  fraud_category: string;
  fraud_description: string;
  incident_date?: string;
  amount_lost: number;
  transaction_id_utr?: string;
  beneficiary_upi_id?: string;
  beneficiary_bank?: string;
  preferred_language?: string;
  contact_phone?: string;
  contact_email?: string;
}

export interface DashboardStats {
  total_cases: number;
  cases_in_preparation: number;
  submitted_complaints: number;
  total_amount_defrauded: number;
  total_amount_recovered: number;
  active_golden_hour_cases: number;
}

// Module 3: AI-Powered Evidence Extraction Types
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "NOT_FOUND";

export interface ExtractedField<T> {
  value: T | null;
  confidence: number;
  confidence_level: ConfidenceLevel;
  source: string;
  raw_match?: string | null;
  uncertainty_note?: string | null;
}

export interface ExtractedTransactionDetails {
  transaction_id_utr: ExtractedField<string>;
  amount: ExtractedField<number>;
  transaction_date: ExtractedField<string>;
  transaction_time: ExtractedField<string>;
  sender_upi_id: ExtractedField<string>;
  sender_name: ExtractedField<string>;
  sender_bank: ExtractedField<string>;
  beneficiary_upi_id: ExtractedField<string>;
  beneficiary_name: ExtractedField<string>;
  beneficiary_bank: ExtractedField<string>;
  beneficiary_account: ExtractedField<string>;
  app_used: ExtractedField<string>;
}

export interface ExtractedCommunicationDetails {
  sender_phone_number: ExtractedField<string>;
  sender_display_name: ExtractedField<string>;
  is_sender_spoofed: ExtractedField<boolean>;
  whatsapp_contact_info: ExtractedField<string>;
  conversation_timestamps: string[];
  suspicious_payment_instructions: string[];
  raw_message_transcript?: string | null;
}

export interface ConflictItem {
  field_name: string;
  conflicting_values: Array<{
    source: string;
    value: any;
    confidence: number;
  }>;
  explanation: string;
  recommended_action: string;
}

export interface EvidenceExtractionResult {
  id: string;
  case_id: string;
  evidence_id: string;
  evidence_file_name: string;
  evidence_category: string;
  transaction_info: ExtractedTransactionDetails;
  communication_info: ExtractedCommunicationDetails;
  raw_ocr_text: string;
  visual_analysis_summary: string;
  conflicts_detected: ConflictItem[];
  overall_confidence: number;
  zero_credential_sanitized: boolean;
  user_verified: boolean;
  user_corrections: Record<string, any>;
  extracted_at: string;
  ocr_engine_used: string;
  vision_engine_used: string;
}

export interface UserVerificationPayload {
  user_verified: boolean;
  corrections: Record<string, any>;
  feedback_notes?: string;
}

export interface SystemHealth {
  status: string;
  service: string;
  version: string;
  environment: string;
  database: {
    provider: string;
    connected: boolean;
    mode: string;
  };
  ai_services: {
    claude_vision: string;
    ocr_engine: string;
  };
}

export interface ExtractedTransaction {
  transaction_id_utr?: string;
  amount?: number;
  timestamp?: string;
  sender_upi_id?: string;
  beneficiary_upi_id?: string;
  beneficiary_account?: string;
  beneficiary_bank?: string;
  app_used?: string;
  confidence_score?: number;
}

export interface EvidenceAnalysis {
  evidence_id: string;
  transaction: ExtractedTransaction;
  detected_category: string;
  raw_text_summary: string;
  redacted_sensitive_data: boolean;
  security_flags: string[];
}

export interface ComplaintDraft {
  format_type: string;
  title: string;
  body_text: string;
  action_items_for_victim: string[];
  critical_disclaimer: string;
}

export interface FraudReport {
  report_id: string;
  status: "DRAFT" | "REVIEW_PENDING" | "APPROVED_BY_USER" | "ARCHIVED";
  created_at: string;
  updated_at: string;
  victim_name: string;
  victim_phone: string;
  category: string;
  transaction?: ExtractedTransaction;
  complaint_drafts: ComplaintDraft[];
  user_approved: boolean;
  approval_timestamp?: string;
}

export interface EmergencyActionStep {
  step_number: number;
  title: string;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  action_url_or_number?: string;
  tips: string[];
}

export interface BankEmergencyContact {
  bank_name: string;
  short_code: string;
  toll_free_number: string;
  emergency_fraud_sms?: string;
  email?: string;
  portal_url?: string;
  freeze_account_sms_format?: string;
}

export interface EmergencyGuidance {
  golden_hour_window_hours: number;
  toll_free_cyber_helpline: string;
  national_portal_url: string;
  immediate_steps: EmergencyActionStep[];
  bank_contacts: BankEmergencyContact[];
  safety_advisory: string;
}

// ==========================================
// Module 4: Smart Evidence Verification Types
// ==========================================

export type VerificationStatus = 
  | "UNVERIFIED"
  | "IN_REVIEW"
  | "ACTION_REQUIRED"
  | "HIGH_DISCREPANCY"
  | "VERIFIED";

export type SeverityLevel = "CRITICAL" | "WARNING" | "INFO";

export type QualityIssueType = 
  | "BLURRY_IMAGE"
  | "UNREADABLE_TEXT"
  | "INCOMPLETE_RECEIPT"
  | "DUPLICATE_FILE"
  | "LOW_RESOLUTION"
  | "MISSING_PAYMENT_PROOF";

export interface MissingFieldItem {
  field_key: string;
  label: string;
  severity: SeverityLevel;
  reason: string;
  requires_user_action: boolean;
  prompt_question: string;
}

export interface InconsistentFieldItem {
  field_key: string;
  label: string;
  evidence_sources: Array<{
    evidence_id: string;
    file_name: string;
    category?: string;
    value: any;
    confidence: number;
  }>;
  discrepancy_description: string;
  severity: SeverityLevel;
  suggested_resolution?: string | null;
}

export interface EvidenceQualityIssue {
  evidence_id: string;
  file_name: string;
  issue_type: QualityIssueType;
  severity: SeverityLevel;
  message: string;
  metric?: string | null;
  is_blocking: boolean;
}

export interface DuplicateTransactionItem {
  transaction_id_utr?: string | null;
  amount?: number | null;
  evidence_ids: string[];
  file_names: string[];
  explanation: string;
  is_identical_file: boolean;
}

export interface VerifiedFieldItem {
  field_key: string;
  label: string;
  value: any;
  confidence: number;
  confidence_level: string;
  source_evidence_ids: string[];
  source_file_names: string[];
  is_cross_verified: boolean;
  user_confirmed: boolean;
}

export interface ConfirmationNeededItem {
  field_key: string;
  label: string;
  current_value: any;
  confidence: number;
  reason: string;
  suggested_value?: any;
}

export interface CaseVerificationReport {
  id: string;
  case_id: string;
  case_number: string;
  verification_status: VerificationStatus;
  completeness_score: number;
  consistency_score: number;
  quality_score: number;
  overall_score: number;
  verified_fields: VerifiedFieldItem[];
  missing_fields: MissingFieldItem[];
  inconsistencies: InconsistentFieldItem[];
  quality_issues: EvidenceQualityIssue[];
  duplicate_transactions: DuplicateTransactionItem[];
  confirmation_needed: ConfirmationNeededItem[];
  evidence_count: number;
  is_citizen_verified: boolean;
  verified_by_user?: string | null;
  verified_at?: string | null;
  user_corrections: Record<string, any>;
  citizen_notes?: string | null;
  disclaimer: string;
  created_at: string;
  updated_at: string;
}

export interface ConfirmVerificationPayload {
  is_confirmed: boolean;
  user_corrections: Record<string, any>;
  citizen_notes?: string | null;
}

// ==========================================
// Module 5: Multilingual AI Emergency Assistant
// ==========================================

export type AssistantLanguage = "en" | "te" | "hi";

export type AssistantTopic = 
  | "HELPLINE_1930"
  | "CYBERCRIME_PORTAL"
  | "EVIDENCE_PRESERVATION"
  | "BANK_DISPUTE_VS_FREEZE"
  | "SENIOR_CITIZEN_GUIDANCE"
  | "RBI_ZERO_LIABILITY"
  | "GENERAL";

export interface QuickAction {
  label: string;
  action_type: string;
  action_target: string;
  description?: string;
}

export interface AssistantChatRequest {
  message: string;
  language: AssistantLanguage;
  case_id?: string;
  use_case_context?: boolean;
  senior_citizen_mode?: boolean;
  conversation_history?: Array<{ role: string; content: string }>;
}

export interface AssistantChatResponse {
  reply: string;
  language: AssistantLanguage;
  detected_topic: AssistantTopic;
  suggested_quick_actions: QuickAction[];
  follow_up_questions: string[];
  senior_citizen_mode: boolean;
  zero_credential_sanitized: boolean;
  context_used?: Record<string, any> | null;
  disclaimer: string;
}

// ==========================================
// Module 6: AI Complaint Generation Types
// ==========================================

export type ComplaintDocType = 
  | "BANK_FRAUD_COMPLAINT"
  | "BANK_FREEZE_REQUEST"
  | "HELPLINE_1930_SCRIPT"
  | "CYBERCRIME_PORTAL_DRAFT";

export interface GeneratedDocument {
  doc_type: ComplaintDocType;
  title: string;
  language: string;
  content: string;
  structured_fields: Record<string, any>;
  missing_fields: string[];
  action_items: string[];
  disclaimer: string;
  is_user_edited: boolean;
  generated_at: string;
  updated_at: string;
}

export interface CaseComplaintBundle {
  case_id: string;
  case_number: string;
  language: string;
  documents: Record<string, GeneratedDocument>;
  missing_information_summary: string[];
  overall_verified_score: number;
  citizen_approved: boolean;
  citizen_approval_timestamp?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateComplaintDraftPayload {
  content: string;
  is_user_edited?: boolean;
}

export interface GenerateComplaintsPayload {
  language: string;
  regenerate?: boolean;
}

// ==========================================
// Module 7: Emergency Response and Case Tracking Types
// ==========================================

export type ActionStage = 
  | "WITHIN_10_MINUTES" 
  | "WITHIN_1_HOUR" 
  | "WITHIN_24_HOURS";

export type TrackingStatus =
  | "CASE_INITIALIZED"
  | "EVIDENCE_VERIFIED"
  | "REPORTED_TO_1930"
  | "BANK_DISPUTE_SUBMITTED"
  | "PORTAL_COMPLAINT_FILED"
  | "UNDER_BANK_INVESTIGATION"
  | "LIEN_INQUIRY_ACTIVE"
  | "FOLLOW_UP_COMPLETED"
  | "RESOLVED"
  | "CLOSED";

export interface EmergencyChecklistItem {
  id: string;
  stage: ActionStage;
  title: string;
  description: string;
  is_completed: boolean;
  completed_at?: string | null;
  action_url?: string | null;
  action_label?: string | null;
  category?: string | null;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  event_type: string;
  timestamp: string;
  reference_id?: string | null;
  badge_variant?: "default" | "gold" | "crimson" | "emerald" | "outline";
}

export interface FollowUpNote {
  id: string;
  note_text: string;
  author: string;
  category: string;
  created_at: string;
}

export interface OfficialLinkItem {
  name: string;
  url: string;
  category: string;
  description: string;
  verified: boolean;
  helpline_number?: string | null;
  badge_text: string;
}

export interface ReadyDocumentItem {
  doc_type: string;
  title: string;
  description: string;
  pdf_url: string;
  view_url: string;
  is_ready: boolean;
  recommended_stage: string;
}

export interface FollowUpInfo {
  primary_bank_name: string;
  primary_bank_helpline: string;
  bank_fraud_email: string;
  cybercrime_helpline: string;
  cybercrime_portal_url: string;
  next_follow_up_target?: string | null;
  recommended_action: string;
  bank_nodal_advisory: string;
}

export interface CaseTrackingDetail {
  case_id: string;
  case_number: string;
  victim_id: string;
  title: string;
  amount_lost: number;
  transaction_id_utr?: string | null;
  beneficiary_upi_id?: string | null;
  beneficiary_bank?: string | null;
  current_status: TrackingStatus;
  created_at: string;
  updated_at: string;
  golden_hour_active: boolean;

  ncrp_acknowledgement_token?: string | null;
  ncrp_submission_confirmed: boolean;
  bank_dispute_sr_number?: string | null;
  bank_submission_confirmed: boolean;
  police_station_ref?: string | null;
  submission_confirmed_at?: string | null;

  checklist_items: EmergencyChecklistItem[];
  timeline: TimelineEvent[];
  follow_up_notes: FollowUpNote[];
  ready_documents: ReadyDocumentItem[];
  follow_up_info?: FollowUpInfo | null;
  important_next_actions: string[];
  disclaimer: string;
}

export interface EmergencyDashboardData {
  case_id: string;
  case_number: string;
  current_status: TrackingStatus;
  case_created_at: string;
  golden_hour_active: boolean;
  amount_lost: number;
  transaction_id_utr?: string | null;
  beneficiary_upi_id?: string | null;
  important_next_actions: string[];
  pending_checklist_items: EmergencyChecklistItem[];
  completed_checklist_count: number;
  total_checklist_count: number;
  completion_percentage: number;
  ready_documents: ReadyDocumentItem[];
  follow_up_info: FollowUpInfo;
  reference_numbers: Record<string, string | null>;
  official_links: OfficialLinkItem[];
  disclaimer: string;
}

export interface AddNotePayload {
  note_text: string;
  category?: string;
}

export interface UpdateReferenceNumbersPayload {
  ncrp_token?: string;
  bank_sr_number?: string;
  police_ref?: string;
  confirm_ncrp_submitted?: boolean;
  confirm_bank_submitted?: boolean;
}

export interface UpdateTrackingStatusPayload {
  status: TrackingStatus;
  status_change_note?: string;
}




