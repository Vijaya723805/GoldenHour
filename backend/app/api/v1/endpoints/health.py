from fastapi import APIRouter
from app.core.config import settings
from app.schemas.common import SystemHealthResponse
from app.db.supabase_client import db_manager
from app.services.claude_service import claude_service
from app.services.ocr_service import ocr_service

router = APIRouter()

@router.get("/health", response_model=SystemHealthResponse)
def get_health_status():
    supabase_info = db_manager.get_status()
    claude_configured = bool(claude_service.client is not None)
    
    return SystemHealthResponse(
        status="operational",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database={
            "provider": "supabase_postgresql",
            "connected": supabase_info["connected"],
            "mode": supabase_info["mode"]
        },
        ai_services={
            "claude_vision": "configured" if claude_configured else "mock_mode_available",
            "ocr_engine": "windows_native_ocr" if getattr(ocr_service, "ocr_engine", None) == "windows_native_ocr" else ("paddleocr" if getattr(ocr_service, "ocr_engine", None) else "native_ocr")
        }
    )
