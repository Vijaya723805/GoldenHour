from typing import Optional, Dict, Any
from app.core.config import settings

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = Any  # type: ignore

class SupabaseManager:
    def __init__(self):
        self.client: Optional[Client] = None
        self.is_connected: bool = False
        self._initialize()

    def _initialize(self):
        if not SUPABASE_AVAILABLE:
            return

        if (
            settings.SUPABASE_URL 
            and "your-project" not in settings.SUPABASE_URL
            and settings.SUPABASE_KEY
            and "your-anon" not in settings.SUPABASE_KEY
        ):
            try:
                self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                self.is_connected = True
            except Exception as e:
                # Fallback to local mock mode if connection fails
                self.client = None
                self.is_connected = False

    def get_status(self) -> Dict[str, Any]:
        return {
            "configured": bool(settings.SUPABASE_URL and "your-project" not in settings.SUPABASE_URL),
            "connected": self.is_connected,
            "mode": "supabase_cloud" if self.is_connected else "local_mock_fallback"
        }

db_manager = SupabaseManager()
