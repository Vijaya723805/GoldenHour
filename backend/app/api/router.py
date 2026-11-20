from fastapi import APIRouter
from app.api.v1.endpoints import (
    health, 
    evidence, 
    fraud_report, 
    emergency, 
    auth, 
    dashboard,
    cases,
    extraction,
    verification,
    assistant,
    complaints,
    tracking
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["System Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["User Authentication & Profile"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Victim Dashboard & Statistics"])
api_router.include_router(cases.router, prefix="/cases", tags=["Fraud Cases & Evidence Vault"])
api_router.include_router(extraction.router, prefix="/extraction", tags=["AI Evidence Extraction (Module 3)"])
api_router.include_router(verification.router, prefix="/verification", tags=["Smart Evidence Verification Engine (Module 4)"])
api_router.include_router(assistant.router, prefix="/assistant", tags=["Multilingual AI Emergency Assistant (Module 5)"])
api_router.include_router(complaints.router, prefix="/complaints", tags=["AI Fraud Complaint Generation (Module 6)"])
api_router.include_router(tracking.router, prefix="/tracking", tags=["Emergency Response and Case Tracking (Module 7)"])
api_router.include_router(evidence.router, prefix="/evidence", tags=["Evidence & AI Extraction"])
api_router.include_router(fraud_report.router, prefix="/fraud-report", tags=["Fraud Complaints & Drafting"])
api_router.include_router(emergency.router, prefix="/emergency", tags=["Emergency Golden Hour Assistance"])
