from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError


class GoldenHourException(Exception):
    """Base application exception."""
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class SensitiveDataViolationException(GoldenHourException):
    """Raised when an attempt is made to upload or store sensitive secrets (PINs/OTPs)."""
    def __init__(self, message: str = "Submission contains prohibited sensitive credential information (e.g. PIN or OTP)."):
        super().__init__(message=message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


class InvalidFileException(GoldenHourException):
    """Raised when an uploaded file violates safety or format restrictions."""
    def __init__(self, message: str):
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST)


class ResourceNotFoundException(GoldenHourException):
    """Raised when requested resource does not exist."""
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND)


async def goldenhour_exception_handler(request: Request, exc: GoldenHourException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "message": exc.message,
                "type": exc.__class__.__name__,
                "details": exc.details
            }
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        errors.append({
            "field": field,
            "message": err.get("msg", "Invalid value"),
            "type": err.get("type", "validation_error")
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "message": "Input validation error",
                "type": "ValidationError",
                "details": {"fields": errors}
            }
        }
    )
