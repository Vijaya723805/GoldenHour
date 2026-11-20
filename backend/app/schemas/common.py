from typing import Generic, TypeVar, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field

DataT = TypeVar("DataT")


class ApiResponse(BaseModel, Generic[DataT]):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[DataT] = None
    error: Optional[Any] = None


class SystemHealthResponse(BaseModel):
    status: str = "operational"
    service: str = "GoldenHour"
    version: str = "1.0.0"
    environment: str = "development"
    database: Dict[str, Any] = Field(default_factory=dict)
    ai_services: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
