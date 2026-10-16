import io
import csv
from datetime import datetime, date
from typing import List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

class ReportService:
    @staticmethod
    def generate_findings_csv(findings: List[Dict[str, Any]]) -> str:
        """Generate sanitized CSV report with formula injection protection."""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow([
            "Rule ID", "Rule Title", "Category", "Severity", "Definite Conflict",
            "Affected Field", "What Detected", "Why Matters", "Recommended Action", "Status"
        ])

        for f in findings:
            # Defend against CSV injection (cells starting with =, +, -, @)
            def sanitize(val):
                s = str(val or "")
                if s.startswith(("=", "+", "-", "@")):
                    return f"'{s}"
                return s

            writer.writerow([
                sanitize(f.get("rule_id")),
                sanitize(f.get("rule_title")),
                sanitize(f.get("category")),
                sanitize(f.get("severity")),
                "Yes" if f.get("is_definite", True) else "Review Required",
                sanitize(f.get("affected_field")),
                sanitize(f.get("what_detected")),
                sanitize(f.get("why_matters")),
                sanitize(f.get("recommended_action")),
                sanitize(f.get("status"))
            ])

        return output.getvalue()

    @staticmethod
    def generate_validation_pdf(run_data: Dict[str, Any], findings: List[Dict[str, Any]]) -> bytes:
        """Generate PDF audit report using ReportLab."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#475569'),
            spaceAfter=14
        )
        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=10,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#334155'),
            leading=12
        )

        elements = []

        # Title & Meta
        elements.append(Paragraph("WarrantyIQ — Contract Validation Audit Report", title_style))
        gen_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
        elements.append(Paragraph(f"Run ID: {run_data.get('run_identifier')}  |  Generated At: {gen_time}  |  Compliance Engine v1.0", subtitle_style))
        elements.append(Spacer(1, 10))

        # Executive Summary Table
        summary_data = [
            ["Metric", "Value", "Evaluation Context"],
            ["Risk Score", f"{run_data.get('risk_score', 0)} / 100", run_data.get('risk_level', 'Unknown')],
            ["Overall Status", run_data.get('overall_status', 'Pass'), "Deterministic rule evaluation status"],
            ["Total Findings", str(run_data.get('total_issues', 0)), f"Critical: {run_data.get('critical_issues', 0)} | High: {run_data.get('high_issues', 0)} | Med: {run_data.get('medium_issues', 0)}"],
            ["Execution Duration", f"{run_data.get('execution_time_ms', 0)} ms", "Automated backend engine run"]
        ]

        t_summary = Table(summary_data, colWidths=[130, 120, 290])
        t_summary.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ]))
        elements.append(t_summary)
        elements.append(Spacer(1, 15))

        # Findings Section
        elements.append(Paragraph("Identified Rule Inconsistencies & Contract Risks", section_style))

        if not findings:
            elements.append(Paragraph("No non-compliances or risks detected. All configured business rules passed.", body_style))
        else:
            findings_table_data = [["Rule", "Sev", "What Was Detected", "Why It Matters", "Recommended Action"]]
            for f in findings[:25]: # Page limit safeguard
                findings_table_data.append([
                    Paragraph(f"<b>{f.get('rule_id')}</b>", body_style),
                    Paragraph(f"<font color='{ReportService._get_sev_color(f.get('severity'))}'><b>{f.get('severity')}</b></font>", body_style),
                    Paragraph(f.get('what_detected', ''), body_style),
                    Paragraph(f.get('why_matters', ''), body_style),
                    Paragraph(f.get('recommended_action', ''), body_style),
                ])

            t_findings = Table(findings_table_data, colWidths=[45, 55, 150, 150, 140])
            t_findings.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(t_findings)

        elements.append(Spacer(1, 15))
        elements.append(Paragraph(
            "<b>Disclaimer:</b> WarrantyIQ is a decision-support validation tool. "
            "Results are deterministic algorithmic findings based on ingested contracts and asset records, "
            "not a certified legal warranty endorsement.",
            subtitle_style
        ))

        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    @staticmethod
    def _get_sev_color(severity: str) -> str:
        s = str(severity).lower()
        if s == 'critical':
            return '#b91c1c'
        elif s == 'high':
            return '#c2410c'
        elif s == 'medium':
            return '#b45309'
        return '#15803d'
