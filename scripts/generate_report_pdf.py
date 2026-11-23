from pathlib import Path
import re
from xml.sax.saxutils import escape

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "REPORT.md"
OUTPUT = ROOT / "REPORT.pdf"
SCREENSHOTS = ROOT / "screenshots"


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


def fit_image(path, max_width_mm, max_height_mm):
    """Return a reportlab Image scaled to fit within max dimensions."""
    img = PILImage.open(str(path))
    w_px, h_px = img.size
    aspect = w_px / h_px
    max_w = max_width_mm
    max_h = max_height_mm
    w = max_w
    h = w / aspect
    if h > max_h:
        h = max_h
        w = h * aspect
    return Image(str(path), width=w * mm, height=h * mm)


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
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=stylesheet["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=30,
            textColor=colors.HexColor("#153d32"),
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=stylesheet["Normal"],
            fontSize=11,
            leading=17,
            textColor=colors.HexColor("#35765e"),
            alignment=TA_CENTER,
            spaceAfter=7,
        ),
        "cover_meta": ParagraphStyle(
            "CoverMeta",
            parent=stylesheet["Normal"],
            fontSize=11,
            leading=18,
            textColor=colors.HexColor("#26332c"),
            alignment=TA_CENTER,
            spaceAfter=4,
        ),
        "caption": ParagraphStyle(
            "Caption",
            parent=stylesheet["Normal"],
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#53645a"),
            alignment=TA_CENTER,
            spaceBefore=4,
            spaceAfter=10,
        ),
    }

    content = SOURCE.read_text(encoding="utf-8").splitlines()
    story = []
    in_code = False
    code_lines = []
    title_seen = False

    # ---- Cover page ----
    story.append(Spacer(1, 20 * mm))
    story.append(
        Paragraph(
            "AmataSettle: An Offline-Ready Blockchain-Based "
            "Micro-Settlement Infrastructure for Rwanda\\u2019s Dairy Supply Chain",
            styles["cover_title"],
        )
    )
    story.append(Spacer(1, 6 * mm))
    story.append(
        Paragraph(
            "Academic Project Report &bull; Finance, Supply Chain Management, Social Impact",
            styles["cover_subtitle"],
        )
    )
    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width="60%", color=colors.HexColor("#dce4dc")))
    story.append(Spacer(1, 8 * mm))
    story.append(
        Paragraph("Author: Student Project &mdash; AmataSettle Team", styles["cover_meta"])
    )
    story.append(
        Paragraph("Course: Blockchain and Distributed Ledger Technologies", styles["cover_meta"])
    )
    story.append(
        Paragraph("Institution: University of Rwanda &mdash; School of Computing", styles["cover_meta"])
    )
    story.append(
        Paragraph("Date: November 23, 2026", styles["cover_meta"])
    )
    story.append(Spacer(1, 12 * mm))
    story.append(
        Paragraph(
            "Blockchain: Ethereum Sepolia (chain ID 11155111) &bull; "
            "AmataSettle: 0x21ffE6b376cF3BCBae2326e12967d40BA3a5d9B6 &bull; "
            "MockRWF: 0x96db7708B29Ff274DA4672B10a2C1D873E8e2a8f",
            styles["cover_meta"],
        )
    )
    story.append(Spacer(1, 6 * mm))
    story.append(
        Paragraph(
            "mRWF is a simulated six-decimal ERC-20 test token. "
            "It has no monetary value and is not redeemable for Rwandan francs.",
            styles["cover_meta"],
        )
    )
    story.append(PageBreak())
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

        # Insert screenshots after relevant sections
        if stripped == "The test suite passed locally (38 Hardhat tests), and the frontend production build succeeded. AmataSettle has been deployed to Ethereum Sepolia; contract addresses and deployment transaction hashes are recorded in `deployments/sepolia.json`. Live browser demonstration results are documented separately; deployment screenshots remain pending.":
            for shot in ["01-sepolia-deployment.png", "05-tests-passing.png"]:
                sp = SCREENSHOTS / shot
                if sp.exists():
                    story.append(fit_image(sp, 160 * mm, 90 * mm))
                    story.append(Paragraph(
                        f"Figure: {shot.replace('.png', '').replace('-', ' ').title()}",
                        styles["caption"],
                    ))

        if stripped == "Recording allocates and reserves the obligation. Claiming transfers the payment and lowers the reserve by the same amount. Raising a dispute makes the allocation unclaimable but leaves its reserve locked. Upholding restores claimability; rejecting the payment reduces the reserve without transferring tokens. Admin withdrawals cannot exceed available funds.":
            for shot in ["02-treasury-dashboard.png", "03-farmer-payments.png"]:
                sp = SCREENSHOTS / shot
                if sp.exists():
                    story.append(fit_image(sp, 160 * mm, 90 * mm))
                    story.append(Paragraph(
                        f"Figure: {shot.replace('.png', '').replace('-', ' ').title()}",
                        styles["caption"],
                    ))

        if stripped == "While paused, deposits, withdrawals, delivery recording, and farmer payment claims are blocked. Dispute creation, dispute resolution, and role management remain available. The paused state is read directly from the deployed contract via the `paused()` view function, and the administrator frontend provides Pause Contract and Resume Contract buttons.":
            sp = SCREENSHOTS / "04-emergency-pause.png"
            if sp.exists():
                story.append(fit_image(sp, 160 * mm, 90 * mm))
                story.append(Paragraph(
                    "Figure: Emergency pause interface &mdash; administrator pause/resume controls",
                    styles["caption"],
                ))

    # ---- Dedicated figures section ----
    story.append(PageBreak())
    story.append(Paragraph("Figures", styles["h1"]))
    story.append(Spacer(1, 4 * mm))
    figure_captions = [
        ("01-sepolia-deployment.png", "Sepolia deployment confirmation &mdash; contract addresses and deployment transactions."),
        ("05-tests-passing.png", "Hardhat test results &mdash; 38 passing tests."),
        ("02-treasury-dashboard.png", "Cooperative treasury dashboard &mdash; balances, reserves, and available funds."),
        ("03-farmer-payments.png", "Farmer payments interface &mdash; claimable amounts and claim history."),
        ("04-emergency-pause.png", "Emergency pause controls &mdash; administrator Pause Contract and Resume Contract buttons."),
        ("contract.png", "Contract interface &mdash; deployed AmataSettle contract view."),
    ]
    for shot, caption in figure_captions:
        sp = SCREENSHOTS / shot
        if sp.exists():
            story.append(fit_image(sp, 150 * mm, 85 * mm))
            story.append(Paragraph(caption, styles["caption"]))

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
