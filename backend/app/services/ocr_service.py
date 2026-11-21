import os
import io
import asyncio
import concurrent.futures
from pathlib import Path
from typing import Dict, Any, Optional
from PIL import Image, ImageEnhance, ImageOps

# Windows Native OCR support via winsdk
WINSDK_AVAILABLE = False
try:
    from winsdk.windows.graphics.imaging import BitmapDecoder
    from winsdk.windows.media.ocr import OcrEngine
    from winsdk.windows.storage.streams import InMemoryRandomAccessStream, DataWriter
    WINSDK_AVAILABLE = True
except ImportError:
    WINSDK_AVAILABLE = False

# Optional PaddleOCR support
PADDLEOCR_AVAILABLE = False
try:
    from paddleocr import PaddleOCR
    PADDLEOCR_AVAILABLE = True
except ImportError:
    PADDLEOCR_AVAILABLE = False


class OCRService:
    def __init__(self):
        self.paddle_engine = None
        if PADDLEOCR_AVAILABLE:
            try:
                self.paddle_engine = PaddleOCR(use_angle_cls=True, lang="en")
            except Exception:
                self.paddle_engine = None

    @property
    def ocr_engine(self):
        if WINSDK_AVAILABLE:
            return "windows_native_ocr"
        return self.paddle_engine

    def preprocess_image(self, file_path: str) -> Optional[bytes]:
        """
        Preprocesses screenshot with PIL to optimize OCR character extraction:
        - Transposes image orientation based on EXIF metadata (crucial for mobile screenshots).
        - Converts color spaces to standard RGB.
        - Enhances contrast by 25% to make faint text/watermarks clear.
        - Scales up low-resolution screenshots (<900px).
        """
        try:
            with Image.open(file_path) as img:
                # 1. Correct orientation from EXIF orientation tags
                try:
                    img = ImageOps.exif_transpose(img) or img
                except Exception:
                    pass

                # 2. Standardize color channels
                if img.mode != "RGB":
                    img = img.convert("RGB")

                # 3. Scale up if image is low-resolution (<900px)
                w, h = img.size
                if w < 900 or h < 900:
                    scale = max(900 / max(w, 1), 900 / max(h, 1))
                    img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

                # 4. Enhance contrast for faint text
                enhancer = ImageEnhance.Contrast(img)
                img = enhancer.enhance(1.25)

                buf = io.BytesIO()
                img.save(buf, format="PNG")
                return buf.getvalue()
        except Exception as e:
            print(f"[OCRService] Preprocessing error: {e}")
            return None

    def _extract_with_winsdk(self, png_bytes: bytes) -> str:
        """
        Runs Windows 10/11 native OCR engine asynchronously.
        Executes inside an isolated ThreadPoolExecutor to prevent event-loop conflicts
        when invoked from an active async FastAPI event loop.
        """
        async def _run():
            stream = InMemoryRandomAccessStream()
            writer = DataWriter(stream)
            writer.write_bytes(png_bytes)
            await writer.store_async()
            await writer.flush_async()
            stream.seek(0)

            decoder = await BitmapDecoder.create_async(stream)
            bitmap = await decoder.get_software_bitmap_async()
            engine = OcrEngine.try_create_from_user_profile_languages()
            if not engine:
                return ""
            ocr_result = await engine.recognize_async(bitmap)
            return ocr_result.text or ""

        def _worker():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(_run())
            finally:
                loop.close()

        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                return executor.submit(_worker).result(timeout=15)
        except Exception as e:
            print(f"[OCRService] Windows OCR execution error: {e}")
            return ""

    def extract_text(self, file_path: str) -> Dict[str, Any]:
        """
        Extracts raw textual strings from actual transaction screenshots.
        No hardcoded fake mock responses are ever returned.
        If an image cannot be read, it explicitly flags it as unreadable or blurry.
        """
        if not file_path or not os.path.exists(file_path):
            return {
                "engine": "none",
                "text": "",
                "line_count": 0,
                "is_blurry": True,
                "quality_warning": "Evidence file does not exist on disk."
            }

        # Check for PDF
        if file_path.lower().endswith(".pdf"):
            return {
                "engine": "pdf_document",
                "text": "Digital PDF document uploaded. Manual review recommended.",
                "line_count": 1,
                "is_blurry": False,
                "quality_warning": None
            }

        # 1. Preprocess Image
        png_bytes = self.preprocess_image(file_path)
        extracted_text = ""
        engine_used = "none"

        # 2. Try Windows Native OCR
        if WINSDK_AVAILABLE and png_bytes:
            extracted_text = self._extract_with_winsdk(png_bytes)
            if extracted_text and len(extracted_text.strip()) > 10:
                engine_used = "windows_native_ocr"

        # 3. Fallback to PaddleOCR if available
        if (not extracted_text or len(extracted_text.strip()) < 10) and self.paddle_engine:
            try:
                res = self.paddle_engine.ocr(file_path, cls=True)
                lines = []
                if res and res[0]:
                    for item in res[0]:
                        lines.append(item[1][0])
                if lines:
                    extracted_text = "\n".join(lines)
                    engine_used = "paddleocr"
            except Exception as e:
                print(f"[OCRService] PaddleOCR error: {e}")

        clean_text = extracted_text.strip()
        is_blurry = len(clean_text) < 15
        warning = "Screenshot text appears blurry, low-resolution, or unreadable." if is_blurry else None

        return {
            "engine": engine_used,
            "text": clean_text,
            "line_count": len(clean_text.splitlines()) if clean_text else 0,
            "is_blurry": is_blurry,
            "quality_warning": warning
        }


ocr_service = OCRService()
