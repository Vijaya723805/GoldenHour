import uuid
import hashlib
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from app.schemas.auth import UserProfile, UserRegisterRequest, UserLoginRequest, ProfileUpdateRequest, LanguagePreference
from app.db.supabase_client import db_manager

USER_STORE_FILE = Path(__file__).resolve().parent.parent.parent / "uploads" / "users_store.json"


class AuthService:
    def __init__(self):
        # In-memory mock database for fallback and local hackathon execution
        self._mock_users: Dict[str, Dict[str, Any]] = {}
        self._mock_tokens: Dict[str, str] = {}
        self._seed_demo_user()
        self._load_users_from_disk()

    def _hash_password(self, password: str) -> str:
        return hashlib.sha256(password.encode("utf-8")).hexdigest()

    def _seed_demo_user(self):
        """Pre-seeds a realistic fictional user for hackathon testing."""
        demo_id = "user_demo_772"
        demo_user = UserProfile(
            id=demo_id,
            email="victim.demo@goldenhour.in",
            full_name="Vikramaditya Sharma",
            phone_number="+919876543210",
            bank_name="Axis Bank",
            preferred_language=LanguagePreference.ENGLISH,
            created_at=datetime.now() - timedelta(days=12),
            updated_at=datetime.now(),
            email_notifications=True,
            sms_notifications=True
        )
        self._mock_users[demo_user.email] = {
            "profile": demo_user,
            "password_hash": self._hash_password("Demo@1234")
        }

    def _save_users_to_disk(self):
        try:
            USER_STORE_FILE.parent.mkdir(parents=True, exist_ok=True)
            data = {}
            for email, rec in self._mock_users.items():
                prof = rec["profile"]
                data[email] = {
                    "profile": prof.dict() if hasattr(prof, "dict") else prof.model_dump(),
                    "password_hash": rec["password_hash"]
                }
            with open(USER_STORE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, default=str, indent=2)
        except Exception as e:
            print(f"[AuthService] Could not persist users: {e}")

    def _load_users_from_disk(self):
        try:
            if USER_STORE_FILE.exists():
                with open(USER_STORE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for email, rec in data.items():
                        prof_data = rec["profile"]
                        if isinstance(prof_data.get("created_at"), str):
                            prof_data["created_at"] = datetime.fromisoformat(prof_data["created_at"])
                        if isinstance(prof_data.get("updated_at"), str):
                            prof_data["updated_at"] = datetime.fromisoformat(prof_data["updated_at"])
                        self._mock_users[email] = {
                            "profile": UserProfile(**prof_data),
                            "password_hash": rec["password_hash"]
                        }
        except Exception as e:
            print(f"[AuthService] Could not load users: {e}")

    def register(self, req: UserRegisterRequest) -> UserProfile:
        email = req.email.strip().lower()
        if email in self._mock_users:
            raise ValueError("An account with this email address already exists.")

        user_id = str(uuid.uuid4())
        now = datetime.now()
        profile = UserProfile(
            id=user_id,
            email=email,
            full_name=req.full_name,
            phone_number=req.phone_number,
            bank_name=req.bank_name,
            preferred_language=req.preferred_language,
            created_at=now,
            updated_at=now,
            email_notifications=True,
            sms_notifications=True
        )

        self._mock_users[email] = {
            "profile": profile,
            "password_hash": self._hash_password(req.password)
        }
        self._save_users_to_disk()

        # Attempt Supabase cloud sync if configured
        if db_manager.is_connected and db_manager.client:
            try:
                db_manager.client.auth.sign_up({
                    "email": email,
                    "password": req.password,
                    "options": {
                        "data": {
                            "full_name": req.full_name,
                            "phone_number": req.phone_number,
                            "bank_name": req.bank_name,
                            "preferred_language": req.preferred_language.value
                        }
                    }
                })
            except Exception:
                pass

        return profile

    def login(self, req: UserLoginRequest) -> Dict[str, Any]:
        email = req.email.strip().lower()
        user_record = self._mock_users.get(email)
        
        # Verify credentials - accept registered password hash or universal demo password
        is_valid = False
        if user_record:
            if user_record["password_hash"] == self._hash_password(req.password):
                is_valid = True
            elif req.password in ("Demo@1234", "Pragnya@123", "GoldenHour@123"):
                is_valid = True

        if not is_valid:
            raise ValueError("Invalid email or password.")

        token = f"gh_token_{uuid.uuid4().hex}"
        self._mock_tokens[token] = email
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user_record["profile"]
        }

    def get_current_user(self, token: str) -> Optional[UserProfile]:
        if not token:
            return None
        email = self._mock_tokens.get(token)
        if not email:
            return None
        return self._mock_users.get(email, {}).get("profile")

    def update_profile(self, user_id: str, updates: ProfileUpdateRequest) -> UserProfile:
        for email, rec in self._mock_users.items():
            if rec["profile"].id == user_id:
                prof: UserProfile = rec["profile"]
                if updates.full_name is not None:
                    prof.full_name = updates.full_name
                if updates.phone_number is not None:
                    prof.phone_number = updates.phone_number
                if updates.bank_name is not None:
                    prof.bank_name = updates.bank_name
                if updates.preferred_language is not None:
                    prof.preferred_language = updates.preferred_language
                if updates.email_notifications is not None:
                    prof.email_notifications = updates.email_notifications
                if updates.sms_notifications is not None:
                    prof.sms_notifications = updates.sms_notifications
                prof.updated_at = datetime.now()
                self._save_users_to_disk()
                return prof
        raise ValueError("User not found.")


auth_service = AuthService()
