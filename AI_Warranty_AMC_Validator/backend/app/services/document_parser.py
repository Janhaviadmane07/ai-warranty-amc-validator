import os
import re
import hashlib
from datetime import datetime
from typing import Dict, Any, List
import pymupdf  # PyMuPDF
from PIL import Image

try:
    import pytesseract
except ImportError:
    pytesseract = None

class DocumentParserService:
    @staticmethod
    def compute_sha256(file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    @staticmethod
    def extract_text_from_file(file_path: str, mime_type: str) -> str:
        """Extract text using PyMuPDF for PDFs or pytesseract for images."""
        text = ""
        if "pdf" in mime_type.lower() or file_path.lower().endswith(".pdf"):
            try:
                doc = pymupdf.open(file_path)
                for page in doc:
                    text += page.get_text() + "\n"
                doc.close()
            except Exception as e:
                text = f"[PDF Parsing Error: {str(e)}]"

            # If PDF text is very short/scanned, attempt OCR fallback if pytesseract is available
            if len(text.strip()) < 30 and pytesseract:
                try:
                    doc = pymupdf.open(file_path)
                    for page in doc:
                        pix = page.get_pixmap()
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        text += pytesseract.image_to_string(img) + "\n"
                    doc.close()
                except Exception:
                    pass

        elif any(ext in mime_type.lower() for ext in ["image", "jpg", "jpeg", "png"]) or file_path.lower().endswith((".png", ".jpg", ".jpeg")):
            if pytesseract:
                try:
                    img = Image.open(file_path)
                    text = pytesseract.image_to_string(img)
                except Exception as e:
                    text = f"[OCR Image Error: {str(e)}]"
            else:
                text = "[OCR Engine Not Available for Scanned Image]"

        return text.strip()

    @staticmethod
    def parse_contract_fields(raw_text: str, category: str = "Warranty Card") -> List[Dict[str, Any]]:
        """
        Deterministic, rule-based field extractor with confidence scoring.
        Works without any paid API key.
        """
        results = []

        # 1. Serial Number Extraction
        sn_match = re.search(r"(?:serial\s*(?:no|number|#)?[:\-]?\s*)([A-Z0-9\-_]{5,25})", raw_text, re.IGNORECASE)
        if sn_match:
            results.append({
                "field_name": "serial_number",
                "extracted_value": sn_match.group(1).strip().upper(),
                "confidence": 0.92,
                "field_category": "Identifier",
                "is_ambiguous": False
            })
        else:
            # Fallback search for token like SN-XXXXXX
            sn_fallback = re.search(r"\b(SN-[0-9]{4,10}|[A-Z]{2,4}[0-9]{5,10})\b", raw_text)
            if sn_fallback:
                results.append({
                    "field_name": "serial_number",
                    "extracted_value": sn_fallback.group(1).strip().upper(),
                    "confidence": 0.75,
                    "field_category": "Identifier",
                    "is_ambiguous": True
                })

        # 2. Contract Number
        contract_match = re.search(r"(?:contract\s*(?:no|number|#)?[:\-]?\s*|amc\s*(?:no|number|#)?[:\-]?\s*)([A-Z0-9\-_/]{4,25})", raw_text, re.IGNORECASE)
        if contract_match:
            results.append({
                "field_name": "contract_number",
                "extracted_value": contract_match.group(1).strip(),
                "confidence": 0.90,
                "field_category": "Identifier",
                "is_ambiguous": False
            })

        # 3. Invoice Number
        invoice_match = re.search(r"(?:invoice\s*(?:no|number|#)[:\-]\s*)([A-Z0-9\-_/]{4,25})", raw_text, re.IGNORECASE)
        if invoice_match:
            results.append({
                "field_name": "invoice_number",
                "extracted_value": invoice_match.group(1).strip(),
                "confidence": 0.88,
                "field_category": "Identifier",
                "is_ambiguous": False
            })

        # 3. Vendor / Manufacturer
        vendor_match = re.search(r"(?:vendor|supplier|contractor|seller)[:\-]?\s*([A-Za-z0-9\s&.,]{3,40})", raw_text, re.IGNORECASE)
        if vendor_match:
            v_val = vendor_match.group(1).strip().split("\n")[0]
            results.append({
                "field_name": "vendor_name",
                "extracted_value": v_val,
                "confidence": 0.85,
                "field_category": "General",
                "is_ambiguous": False
            })

        # 4. Dates: Start Date, End Date, Purchase Date
        # Match YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
        date_pattern = r"\b(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b"
        all_dates = re.findall(date_pattern, raw_text)
        
        # Look for explicit labels
        start_match = re.search(r"(?:start\s*date|effective\s*from|commencement)[:\-]?\s*(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})", raw_text, re.IGNORECASE)
        end_match = re.search(r"(?:end\s*date|expiry\s*date|valid\s*upto|expiration)[:\-]?\s*(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})", raw_text, re.IGNORECASE)
        
        if start_match:
            norm_date = DocumentParserService._normalize_date(start_match.group(1))
            results.append({
                "field_name": "warranty_start_date" if "warranty" in category.lower() else "start_date",
                "extracted_value": norm_date,
                "confidence": 0.90,
                "field_category": "Date",
                "is_ambiguous": False
            })
        elif len(all_dates) >= 1:
            results.append({
                "field_name": "warranty_start_date" if "warranty" in category.lower() else "start_date",
                "extracted_value": DocumentParserService._normalize_date(all_dates[0]),
                "confidence": 0.65,
                "field_category": "Date",
                "is_ambiguous": True
            })

        if end_match:
            norm_date = DocumentParserService._normalize_date(end_match.group(1))
            results.append({
                "field_name": "warranty_end_date" if "warranty" in category.lower() else "end_date",
                "extracted_value": norm_date,
                "confidence": 0.90,
                "field_category": "Date",
                "is_ambiguous": False
            })
        elif len(all_dates) >= 2:
            results.append({
                "field_name": "warranty_end_date" if "warranty" in category.lower() else "end_date",
                "extracted_value": DocumentParserService._normalize_date(all_dates[1]),
                "confidence": 0.60,
                "field_category": "Date",
                "is_ambiguous": True
            })

        # 5. Financial Amount
        amount_match = re.search(r"(?:total|amount|sum|cost|price|inr|rs\.?|₹)[:\-]?\s*([0-9,]+(?:\.\d{2})?)", raw_text, re.IGNORECASE)
        if amount_match:
            clean_amt = amount_match.group(1).replace(",", "")
            results.append({
                "field_name": "total_amount",
                "extracted_value": clean_amt,
                "confidence": 0.85,
                "field_category": "Financial",
                "is_ambiguous": False
            })

        # 6. Service Scope / Coverage description
        if re.search(r"non-comprehensive", raw_text, re.IGNORECASE):
            coverage = "Non-Comprehensive (Labor only, parts excluded)"
            conf = 0.95
        elif re.search(r"comprehensive", raw_text, re.IGNORECASE):
            coverage = "Comprehensive (Includes labor, spares, and routine preventive visits)"
            conf = 0.95
        else:
            coverage = "Standard Commercial Coverage"
            conf = 0.50

        results.append({
            "field_name": "coverage_description",
            "extracted_value": coverage,
            "confidence": conf,
            "field_category": "Scope",
            "is_ambiguous": (conf < 0.7)
        })

        # 7. PM Frequency
        if re.search(r"quarterly", raw_text, re.IGNORECASE):
            pm = "Quarterly"
        elif re.search(r"monthly", raw_text, re.IGNORECASE):
            pm = "Monthly"
        elif re.search(r"bi-annual|half-yearly", raw_text, re.IGNORECASE):
            pm = "Bi-Annual"
        elif re.search(r"annual", raw_text, re.IGNORECASE):
            pm = "Annual"
        else:
            pm = "Not Specified"

        results.append({
            "field_name": "preventive_maintenance_frequency",
            "extracted_value": pm,
            "confidence": 0.85 if pm != "Not Specified" else 0.40,
            "field_category": "Scope",
            "is_ambiguous": (pm == "Not Specified")
        })

        return results

    @staticmethod
    def _normalize_date(date_str: str) -> str:
        """Converts DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD."""
        date_str = date_str.strip().replace("/", "-")
        parts = date_str.split("-")
        if len(parts) == 3:
            if len(parts[0]) == 4:  # YYYY-MM-DD
                return f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
            elif len(parts[2]) == 4:  # DD-MM-YYYY
                return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
        return date_str
