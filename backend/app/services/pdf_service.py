import io
import re
from datetime import datetime
from typing import Dict, Any, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether
)
from reportlab.pdfgen import canvas

from app.schemas.complaint import ComplaintDocType, DocumentLanguage


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Page X of Y'
    along with GoldenHour branding and mandatory legal disclaimer in footer.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 7)
        self.setFillColor(colors.HexColor("#64748b"))  # Slate-500

        # Footer divider line
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(40, 42, 572, 42)

        # Footer Text: Mandatory Legal Disclaimer
        disclaimer = (
            "LEGAL NOTICE: AI-assisted draft for citizen self-filing. GoldenHour does not auto-submit complaints or freeze accounts. "
            "Only authorized banks and law enforcement authorities possess statutory power to freeze accounts."
        )
        self.drawString(40, 30, disclaimer[:110])
        self.drawString(40, 20, disclaimer[110:])

        # Page Number
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 20, page_str)
        self.restoreState()


class PdfService:
    def __init__(self):
        self._init_styles()

    def _init_styles(self):
        self.styles = getSampleStyleSheet()

        # Navy header title
        self.styles.add(ParagraphStyle(
            name="GoldenTitle",
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            textColor=colors.HexColor("#0f172a"),  # Deep Navy
            alignment=0
        ))

        # Subtitle / Document Category
        self.styles.add(ParagraphStyle(
            name="GoldenSubtitle",
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#6b21a8"),  # Purple
            alignment=0,
            spaceAfter=6
        ))

        # Meta tag / Case ID style
        self.styles.add(ParagraphStyle(
            name="GoldenMeta",
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#475569")
        ))

        # Body paragraph style
        self.styles.add(ParagraphStyle(
            name="GoldenBody",
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=6
        ))

        # Bold Field Label
        self.styles.add(ParagraphStyle(
            name="GoldenLabel",
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#334155")
        ))

        # Field Value
        self.styles.add(ParagraphStyle(
            name="GoldenValue",
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#0f172a")
        ))

        # Callout Text (for warnings / action items)
        self.styles.add(ParagraphStyle(
            name="GoldenCallout",
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#b45309")  # Amber-700
        ))

    def _clean_text_for_pdf(self, text: str) -> str:
        """
        Escapes special XML chars and safely converts non-ASCII Unicode
        into clean representations so ReportLab standard Helvetica can render reliably.
        """
        if not text:
            return ""
        # Replace Rupee symbol with 'INR '
        text = text.replace("₹", "INR ")
        # Escape XML entities for Paragraph
        text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        
        # Replace non-ascii with latin representation if needed
        # Standard reportlab helvetica only supports latin1.
        clean_chars = []
        for ch in text:
            if ord(ch) < 256:
                clean_chars.append(ch)
            else:
                # Transliterate or encode safe fallback
                clean_chars.append(f"&#{ord(ch)};" if ord(ch) < 65536 else "?")
        return "".join(clean_chars)

    def generate_complaint_pdf(
        self,
        case_number: str,
        doc_type: ComplaintDocType,
        title: str,
        content: str,
        structured_fields: Dict[str, Any],
        missing_fields: List[str],
        action_items: List[str],
        language: DocumentLanguage = DocumentLanguage.EN
    ) -> bytes:
        """
        Renders a publication-grade PDF dispute document matching official Indian standards:
        - Ministry of Home Affairs Cyber Crime Reporting Portal Dossier
        - Bank Nodal Officer Dispute & Account Lien Letter
        - 1930 National Helpline Operator Script
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=40,
            rightMargin=40,
            topMargin=40,
            bottomMargin=55
        )

        elements = []

        # -------------------------------------------------------------
        # 1. Header & Brand Banner
        # -------------------------------------------------------------
        now_str = datetime.now().strftime("%d %B %Y, %I:%M %p IST")
        
        header_table_data = [
            [
                Paragraph("<b>GOLDENHOUR CYBER DEFENSE NETWORK</b>", self.styles["GoldenSubtitle"]),
                Paragraph(f"<b>CASE REF:</b> {self._clean_text_for_pdf(case_number)}", self.styles["GoldenMeta"])
            ],
            [
                Paragraph(self._clean_text_for_pdf(title), self.styles["GoldenTitle"]),
                Paragraph(f"<b>GENERATED:</b> {now_str}", self.styles["GoldenMeta"])
            ]
        ]
        
        header_table = Table(header_table_data, colWidths=[380, 152])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(header_table)
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0f172a"), spaceBefore=6, spaceAfter=10))

        # -------------------------------------------------------------
        # 2. Key Dispute Parameters Grid (Structured Table)
        # -------------------------------------------------------------
        utr = structured_fields.get("transaction_id_utr") or structured_fields.get("utr") or "Pending Verification"
        amount = structured_fields.get("amount")
        amount_display = f"INR {amount:,.2f}" if isinstance(amount, (int, float)) else "Pending"
        vpa = structured_fields.get("beneficiary_upi_id") or "Unknown"
        victim_name = structured_fields.get("victim_name") or "Citizen Complainant"
        victim_phone = structured_fields.get("victim_phone") or "Not Specified"
        beneficiary_bank = structured_fields.get("beneficiary_bank") or "Under Investigation"
        sender_bank = structured_fields.get("sender_bank") or "Remitter Bank"

        grid_data = [
            [
                Paragraph("<b>Victim Complainant:</b>", self.styles["GoldenLabel"]),
                Paragraph(self._clean_text_for_pdf(str(victim_name)), self.styles["GoldenValue"]),
                Paragraph("<b>Disputed Amount:</b>", self.styles["GoldenLabel"]),
                Paragraph(f"<b>{self._clean_text_for_pdf(amount_display)}</b>", self.styles["GoldenValue"]),
            ],
            [
                Paragraph("<b>Complainant Contact:</b>", self.styles["GoldenLabel"]),
                Paragraph(self._clean_text_for_pdf(str(victim_phone)), self.styles["GoldenValue"]),
                Paragraph("<b>12-Digit UPI UTR / Ref:</b>", self.styles["GoldenLabel"]),
                Paragraph(f"<b>{self._clean_text_for_pdf(str(utr))}</b>", self.styles["GoldenValue"]),
            ],
            [
                Paragraph("<b>Victim's Bank:</b>", self.styles["GoldenLabel"]),
                Paragraph(self._clean_text_for_pdf(str(sender_bank)), self.styles["GoldenValue"]),
                Paragraph("<b>Beneficiary UPI VPA:</b>", self.styles["GoldenLabel"]),
                Paragraph(self._clean_text_for_pdf(str(vpa)), self.styles["GoldenValue"]),
            ],
            [
                Paragraph("<b>Incident Timeline:</b>", self.styles["GoldenLabel"]),
                Paragraph("Within Golden Hour (Immediate)", self.styles["GoldenValue"]),
                Paragraph("<b>Beneficiary Bank:</b>", self.styles["GoldenLabel"]),
                Paragraph(self._clean_text_for_pdf(str(beneficiary_bank)), self.styles["GoldenValue"]),
            ]
        ]

        grid_table = Table(grid_data, colWidths=[110, 156, 110, 156])
        grid_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),  # Slate-50
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(grid_table)
        elements.append(Spacer(1, 10))

        # -------------------------------------------------------------
        # 3. Missing Information Alert Box (If any fields missing)
        # -------------------------------------------------------------
        if missing_fields:
            missing_items_str = ", ".join(missing_fields)
            missing_box_data = [[
                Paragraph("<b>ATTENTION - MISSING CASE INFORMATION:</b>", self.styles["GoldenCallout"]),
            ], [
                Paragraph(
                    f"The following required fields could not be extracted from submitted evidence: <b>{self._clean_text_for_pdf(missing_items_str)}</b>. "
                    f"Please manually supply these parameters when filing with your bank branch or the 1930 operator.",
                    self.styles["GoldenBody"]
                )
            ]]
            missing_table = Table(missing_box_data, colWidths=[532])
            missing_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#fffbeb")),  # Amber-50
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#fde68a")),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(missing_table)
            elements.append(Spacer(1, 10))

        # -------------------------------------------------------------
        # 4. Main Formal Document Body
        # -------------------------------------------------------------
        # Split text into paragraphs
        raw_paragraphs = content.split("\n\n")
        for para in raw_paragraphs:
            clean_para = para.strip()
            if not clean_para:
                continue

            # Section header
            if clean_para.isupper() and len(clean_para) < 80:
                elements.append(Spacer(1, 4))
                elements.append(Paragraph(f"<b>{self._clean_text_for_pdf(clean_para)}</b>", self.styles["GoldenSubtitle"]))
                elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceBefore=2, spaceAfter=4))
            elif clean_para.startswith("•") or clean_para.startswith("-") or clean_para.startswith("1."):
                # Bullet or list item
                elements.append(Paragraph(self._clean_text_for_pdf(clean_para), self.styles["GoldenBody"]))
            else:
                elements.append(Paragraph(self._clean_text_for_pdf(clean_para), self.styles["GoldenBody"]))

        # -------------------------------------------------------------
        # 5. Required Action Steps Checklist
        # -------------------------------------------------------------
        if action_items:
            elements.append(Spacer(1, 8))
            action_box_data = [
                [Paragraph("<b>RECOMMENDED CITIZEN ACTIONS:</b>", self.styles["GoldenLabel"])]
            ]
            for idx, act in enumerate(action_items, 1):
                action_box_data.append([
                    Paragraph(f"{idx}. {self._clean_text_for_pdf(act)}", self.styles["GoldenBody"])
                ])
            
            action_table = Table(action_box_data, colWidths=[532])
            action_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),  # Slate-100
                ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(action_table)

        # -------------------------------------------------------------
        # 6. Complainant Signature Block
        # -------------------------------------------------------------
        elements.append(Spacer(1, 14))
        sig_data = [
            [
                Paragraph("<b>Complainant Verification & Signature:</b>", self.styles["GoldenLabel"]),
                Paragraph("<b>Receiving Authority Acknowledgement:</b>", self.styles["GoldenLabel"])
            ],
            [
                Paragraph(f"Name: {self._clean_text_for_pdf(str(victim_name))}<br/>Date: {datetime.now().strftime('%d/%m/%Y')}<br/>Status: Citizen Verified Draft", self.styles["GoldenMeta"]),
                Paragraph("Officer Name / Seal:<br/>Branch / Cyber Cell:<br/>Token / SR Number: ____________________", self.styles["GoldenMeta"])
            ]
        ]
        sig_table = Table(sig_data, colWidths=[266, 266])
        sig_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(sig_table)

        # Build document with NumberedCanvas for dynamic footer
        doc.build(elements, canvasmaker=NumberedCanvas)
        return buffer.getvalue()


pdf_service = PdfService()
