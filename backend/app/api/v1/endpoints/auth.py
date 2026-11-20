from typing import Optional, Any
from fastapi import APIRouter, Header, HTTPException, status
from app.schemas.common import ApiResponse
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserAuthResponse,
    UserProfile,
    ProfileUpdateRequest
)
from app.services.auth_service import auth_service

router = APIRouter()


def extract_token(auth_header: Any = None) -> str:
    if isinstance(auth_header, str):
        return auth_header.replace("Bearer ", "").strip()
    return "demo_session_token"


@router.post("/register", response_model=ApiResponse[UserProfile])
def register_user(req: UserRegisterRequest):
    try:
        profile = auth_service.register(req)
        return ApiResponse(
            success=True,
            message="User account created successfully.",
            data=profile
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=ApiResponse[UserAuthResponse])
def login_user(req: UserLoginRequest):
    try:
        auth_data = auth_service.login(req)
        response_obj = UserAuthResponse(
            access_token=auth_data["access_token"],
            token_type=auth_data["token_type"],
            user=auth_data["user"]
        )
        return ApiResponse(
            success=True,
            message="Login successful.",
            data=response_obj
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/me", response_model=ApiResponse[UserProfile])
def get_current_user_profile(authorization: Optional[str] = Header(None)):
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session.")

    return ApiResponse(
        success=True,
        message="User profile retrieved.",
        data=user
    )


@router.put("/profile", response_model=ApiResponse[UserProfile])
def update_profile(updates: ProfileUpdateRequest, authorization: Optional[str] = Header(None)):
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    try:
        updated = auth_service.update_profile(user.id, updates)
        return ApiResponse(
            success=True,
            message="Profile updated successfully.",
            data=updated
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
