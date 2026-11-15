from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "REPORT.md"
OUTPUT = ROOT / "REPORT.pdf"


def inline_markup(text: str) -> str:
    text = escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`(.+?)`", r'<font name="Courier">\1</font>', text)
    text = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        r'<link href="\2" color="#35765e">\1</link>',
        text,
    )
    return text


def draw_page(canvas, document) -> None:
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#dce4dc"))
    canvas.line(18 * mm, 15 * mm, 192 * mm, 15 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#647068"))
    canvas.drawString(18 * mm, 10 * mm, "AmataSettle | Academic project report")
    canvas.drawRightString(192 * mm, 10 * mm, f"Page {document.page}")
    canvas.restoreState()


def main() -> None:
    stylesheet = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "ReportTitle",
            parent=stylesheet["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=30,
            textColor=colors.HexColor("#153d32"),
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "subtitle": ParagraphStyle(
            "ReportSubtitle",
            parent=stylesheet["Normal"],
            fontSize=11,
            leading=17,
            textColor=colors.HexColor("#53645a"),
            alignment=TA_CENTER,
            spaceAfter=7,
        ),
        "h1": ParagraphStyle(
            "ReportH1",
            parent=stylesheet["Heading1"],
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#153d32"),
            spaceBefore=15,
            spaceAfter=8,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "ReportH2",
            parent=stylesheet["Heading2"],
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#35765e"),
            spaceBefore=10,
            spaceAfter=5,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "ReportBody",
            parent=stylesheet["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#26332c"),
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "ReportBullet",
            parent=stylesheet["BodyText"],
            fontSize=9,
            leading=13,
            leftIndent=12,
            firstLineIndent=-8,
            spaceAfter=4,
        ),
        "code": ParagraphStyle(
            "ReportCode",
            parent=stylesheet["Code"],
            fontName="Courier",
            fontSize=7.5,
            leading=10,
            backColor=colors.HexColor("#f1f3ee"),
            borderPadding=6,
            spaceBefore=4,
            spaceAfter=8,
        ),
    }

    content = SOURCE.read_text(encoding="utf-8").splitlines()
    story = []
    in_code = False
    code_lines = []
    title_seen = False
    for line in content:
        stripped = line.strip()
        if stripped.startswith("```"):
            if in_code:
                story.append(
                    Preformatted("\n".join(code_lines), styles["code"], maxLineLength=100)
                )
                code_lines = []
                in_code = False
            else:
                in_code = True
            continue
        if in_code:
            code_lines.append(line)
            continue
        if not stripped:
            story.append(Spacer(1, 2))
            continue
        if stripped == "---":
            story.append(HRFlowable(width="100%", color=colors.HexColor("#dce4dc")))
            story.append(Spacer(1, 5))
            continue
        if stripped.startswith("# "):
            story.append(Paragraph(inline_markup(stripped[2:]), styles["title"]))
            if not title_seen:
                story.append(Spacer(1, 12))
                title_seen = True
            continue
        if stripped.startswith("## "):
            story.append(Paragraph(inline_markup(stripped[3:]), styles["h1"]))
            continue
        if stripped.startswith("### "):
            story.append(Paragraph(inline_markup(stripped[4:]), styles["h2"]))
            continue
        if stripped.startswith("> "):
            story.append(
                Paragraph(
                    inline_markup(stripped[2:]),
                    ParagraphStyle(
                        "ReportCallout",
                        parent=styles["body"],
                        borderColor=colors.HexColor("#d9e7dc"),
                        borderWidth=0.6,
                        borderPadding=7,
                        backColor=colors.HexColor("#f1f6f0"),
                    ),
                )
            )
            continue
        if stripped.startswith("|"):
            story.append(Paragraph(inline_markup(stripped.replace("|", "   |   ")), styles["code"]))
            continue
        if stripped.startswith("- "):
            story.append(Paragraph("• " + inline_markup(stripped[2:]), styles["bullet"]))
            continue
        if re.match(r"^\d+\.\s", stripped):
            story.append(Paragraph(inline_markup(stripped), styles["bullet"]))
            continue
        story.append(Paragraph(inline_markup(stripped), styles["body"]))

    if in_code and code_lines:
        story.append(Preformatted("\n".join(code_lines), styles["code"], maxLineLength=100))

    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=17 * mm,
        bottomMargin=20 * mm,
        title="AmataSettle Project Report",
        author="AmataSettle",
    )
    document.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()
