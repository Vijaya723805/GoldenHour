from typing import List, Optional, Any
from fastapi import APIRouter, Header, HTTPException, status
from app.schemas.common import ApiResponse
from app.schemas.dashboard import DashboardStats, FraudCaseSummary, CreateCaseRequest
from app.services.dashboard_service import dashboard_service
from app.services.auth_service import auth_service

router = APIRouter()


def extract_token(auth_header: Any = None) -> str:
    if isinstance(auth_header, str):
        return auth_header.replace("Bearer ", "").strip()
    return ""


@router.get("/stats", response_model=ApiResponse[DashboardStats])
def get_dashboard_stats(authorization: Optional[str] = Header(None)):
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    stats = dashboard_service.get_user_stats(victim_id)
    return ApiResponse(
        success=True,
        message="Dashboard statistics retrieved.",
        data=stats
    )


@router.get("/cases", response_model=ApiResponse[List[FraudCaseSummary]])
def get_recent_cases(limit: int = 10, authorization: Optional[str] = Header(None)):
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    cases = dashboard_service.get_recent_cases(victim_id, limit=limit)
    return ApiResponse(
        success=True,
        message="Recent fraud cases retrieved.",
        data=cases
    )


@router.post("/cases", response_model=ApiResponse[FraudCaseSummary])
def create_new_case(req: CreateCaseRequest, authorization: Optional[str] = Header(None)):
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    new_case = dashboard_service.create_case(victim_id, req)
    return ApiResponse(
        success=True,
        message="New fraud case initialized.",
        data=new_case
    )
