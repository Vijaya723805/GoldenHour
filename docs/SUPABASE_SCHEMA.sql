-- ==============================================================================
-- GoldenHour Supabase PostgreSQL Schema
-- Module 1 & 2: Profiles, Authentication, Fraud Incident Cases & Evidence Vault
-- ==============================================================================

-- 1. Create User Profiles Table linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'te', 'hi')),
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. Create Fraud Cases Table
CREATE TABLE IF NOT EXISTS public.fraud_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_number TEXT UNIQUE NOT NULL,
    victim_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    fraud_category TEXT NOT NULL,
    fraud_description TEXT NOT NULL DEFAULT '',
    incident_date TIMESTAMPTZ DEFAULT NOW(),
    transaction_id_utr TEXT,
    amount_lost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    beneficiary_upi_id TEXT,
    beneficiary_bank TEXT,
    preferred_language TEXT DEFAULT 'en',
    contact_phone TEXT,
    contact_email TEXT,
    status TEXT DEFAULT 'REVIEW_PENDING' CHECK (status IN (
        'DRAFT', 'IN_PREPARATION', 'REVIEW_PENDING', 'APPROVED', 
        'LIEN_REQUESTED', 'SUBMITTED_TO_CYBER_CELL', 'RECOVERED', 'CLOSED'
    )),
    golden_hour_active BOOLEAN DEFAULT TRUE,
    evidence_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on fraud_cases
ALTER TABLE public.fraud_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view only their own fraud cases"
    ON public.fraud_cases FOR SELECT
    USING (auth.uid() = victim_id);

CREATE POLICY "Users can create their own fraud cases"
    ON public.fraud_cases FOR INSERT
    WITH CHECK (auth.uid() = victim_id);

CREATE POLICY "Users can update their own fraud cases"
    ON public.fraud_cases FOR UPDATE
    USING (auth.uid() = victim_id);

-- 3. Create Evidence Files Table (Module 2)
CREATE TABLE IF NOT EXISTS public.evidence_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES public.fraud_cases(id) ON DELETE CASCADE,
    victim_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    sanitized_file_name TEXT NOT NULL,
    file_size_bytes INT NOT NULL,
    content_type TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'UPI_RECEIPT', 'BANK_STATEMENT', 'SMS_ALERT', 'WHATSAPP_CHAT', 'OTHER'
    )),
    description TEXT,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on evidence_files
ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view only evidence belonging to their cases"
    ON public.evidence_files FOR SELECT
    USING (auth.uid() = victim_id);

CREATE POLICY "Users can insert evidence for their cases"
    ON public.evidence_files FOR INSERT
    WITH CHECK (auth.uid() = victim_id);

CREATE POLICY "Users can delete evidence from their cases"
    ON public.evidence_files FOR DELETE
    USING (auth.uid() = victim_id);

-- 4. Automatic Trigger to Create Profile on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone_number, bank_name, preferred_language)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Citizen User'),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', '+910000000000'),
        COALESCE(NEW.raw_user_meta_data->>'bank_name', 'Primary Bank'),
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Create Evidence Vault Storage Bucket (PRIVATE - Never Public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence-vault', 'evidence-vault', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ==============================================================================
-- Module 7: Emergency Response & Case Tracking Schema
-- ==============================================================================

-- 6. Case Tracking State Table
CREATE TABLE IF NOT EXISTS public.case_tracking (
    case_id UUID REFERENCES public.fraud_cases(id) ON DELETE CASCADE PRIMARY KEY,
    victim_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_status TEXT NOT NULL DEFAULT 'CASE_INITIALIZED' CHECK (current_status IN (
        'CASE_INITIALIZED', 'EVIDENCE_VERIFIED', 'REPORTED_TO_1930', 
        'BANK_DISPUTE_SUBMITTED', 'PORTAL_COMPLAINT_FILED', 
        'UNDER_BANK_INVESTIGATION', 'LIEN_INQUIRY_ACTIVE', 
        'FOLLOW_UP_COMPLETED', 'RESOLVED', 'CLOSED'
    )),
    ncrp_acknowledgement_token TEXT,
    ncrp_submission_confirmed BOOLEAN DEFAULT FALSE,
    bank_dispute_sr_number TEXT,
    bank_submission_confirmed BOOLEAN DEFAULT FALSE,
    police_station_ref TEXT,
    submission_confirmed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their case tracking"
    ON public.case_tracking FOR SELECT
    USING (auth.uid() = victim_id);

CREATE POLICY "Users can update their case tracking"
    ON public.case_tracking FOR UPDATE
    USING (auth.uid() = victim_id);

CREATE POLICY "Users can insert their case tracking"
    ON public.case_tracking FOR INSERT
    WITH CHECK (auth.uid() = victim_id);

-- 7. Case Checklist Items Table (3 Action Stages: 10m, 1h, 24h)
CREATE TABLE IF NOT EXISTS public.case_checklist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES public.fraud_cases(id) ON DELETE CASCADE,
    victim_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_key TEXT NOT NULL,
    stage TEXT NOT NULL CHECK (stage IN ('WITHIN_10_MINUTES', 'WITHIN_1_HOUR', 'WITHIN_24_HOURS')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(case_id, item_key)
);

ALTER TABLE public.case_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their case checklist items"
    ON public.case_checklist_items FOR ALL
    USING (auth.uid() = victim_id);

-- 8. Case Action Timeline Table
CREATE TABLE IF NOT EXISTS public.case_timeline_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES public.fraud_cases(id) ON DELETE CASCADE,
    victim_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_type TEXT NOT NULL,
    badge_variant TEXT DEFAULT 'default',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their case timeline events"
    ON public.case_timeline_events FOR SELECT
    USING (auth.uid() = victim_id);

CREATE POLICY "Users can insert their case timeline events"
    ON public.case_timeline_events FOR INSERT
    WITH CHECK (auth.uid() = victim_id);

-- 9. Case Follow-Up Notes Table
CREATE TABLE IF NOT EXISTS public.case_follow_up_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES public.fraud_cases(id) ON DELETE CASCADE,
    victim_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    author TEXT DEFAULT 'Citizen Complainant',
    category TEXT DEFAULT 'General Follow-up',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_follow_up_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their case follow-up notes"
    ON public.case_follow_up_notes FOR ALL
    USING (auth.uid() = victim_id);
