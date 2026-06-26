from __future__ import annotations

import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "auditoria-tecnica-funcional-2026-06-21.md"
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT = OUTPUT_DIR / "auditoria-tecnica-funcional-2026-06-21.pdf"

TEAL = colors.HexColor("#0D3A4E")
CLAY = colors.HexColor("#9D6F4E")
CREAM = colors.HexColor("#F4F1EA")
LIGHT_GRAY = colors.HexColor("#F2F4F7")
MUTED = colors.HexColor("#5E7480")
INK = colors.HexColor("#1D2529")
GRID = colors.HexColor("#D8DEE3")
WHITE = colors.white


def register_fonts() -> tuple[str, str]:
    regular = Path("C:/Windows/Fonts/arial.ttf")
    bold = Path("C:/Windows/Fonts/arialbd.ttf")
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("AuditSans", str(regular)))
        pdfmetrics.registerFont(TTFont("AuditSans-Bold", str(bold)))
        return "AuditSans", "AuditSans-Bold"
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = register_fonts()


def escape_markup(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def inline_markup(text: str) -> str:
    escaped = escape_markup(text)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(
        r"`(.+?)`",
        rf'<font name="{FONT}" color="#0D3A4E">\1</font>',
        escaped,
    )
    return escaped


styles = getSampleStyleSheet()
BODY = ParagraphStyle(
    "AuditBody",
    parent=styles["BodyText"],
    fontName=FONT,
    fontSize=9.3,
    leading=12.2,
    textColor=INK,
    spaceAfter=5,
    splitLongWords=True,
)
H1 = ParagraphStyle(
    "AuditH1",
    parent=styles["Heading1"],
    fontName=FONT_BOLD,
    fontSize=16,
    leading=19,
    textColor=TEAL,
    spaceBefore=15,
    spaceAfter=8,
    keepWithNext=True,
)
H2 = ParagraphStyle(
    "AuditH2",
    parent=styles["Heading2"],
    fontName=FONT_BOLD,
    fontSize=12.5,
    leading=15,
    textColor=TEAL,
    spaceBefore=11,
    spaceAfter=6,
    keepWithNext=True,
)
H3 = ParagraphStyle(
    "AuditH3",
    parent=styles["Heading3"],
    fontName=FONT_BOLD,
    fontSize=10.5,
    leading=13,
    textColor=CLAY,
    spaceBefore=8,
    spaceAfter=4,
    keepWithNext=True,
)
TABLE_HEADER = ParagraphStyle(
    "AuditTableHeader",
    parent=BODY,
    fontName=FONT_BOLD,
    fontSize=6.8,
    leading=8.2,
    textColor=TEAL,
    spaceAfter=0,
)
TABLE_BODY = ParagraphStyle(
    "AuditTableBody",
    parent=BODY,
    fontSize=6.8,
    leading=8.4,
    spaceAfter=0,
)
META_LABEL = ParagraphStyle(
    "MetaLabel",
    parent=BODY,
    fontName=FONT_BOLD,
    fontSize=8.2,
    leading=10,
    textColor=CLAY,
    spaceAfter=0,
)
META_VALUE = ParagraphStyle(
    "MetaValue",
    parent=BODY,
    fontSize=8.2,
    leading=10,
    spaceAfter=0,
)
FOOTER = ParagraphStyle(
    "Footer",
    parent=BODY,
    fontSize=7.5,
    leading=9,
    textColor=MUTED,
)


class AuditDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=letter,
            rightMargin=0.68 * inch,
            leftMargin=0.68 * inch,
            topMargin=0.72 * inch,
            bottomMargin=0.68 * inch,
            title="Auditoria Técnica e Funcional - Plataforma Operacional",
            author="Codex",
            subject="Estado atual do sistema em 21/06/2026",
        )
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            id="normal",
        )
        self.addPageTemplates(
            [PageTemplate(id="audit", frames=frame, onPage=self.draw_header_footer)]
        )

    def draw_header_footer(self, canvas, doc) -> None:
        canvas.saveState()
        if doc.page > 1:
            canvas.setStrokeColor(GRID)
            canvas.setLineWidth(0.5)
            canvas.line(
                self.leftMargin,
                letter[1] - 0.47 * inch,
                letter[0] - self.rightMargin,
                letter[1] - 0.47 * inch,
            )
            canvas.setFont(FONT, 7.5)
            canvas.setFillColor(MUTED)
            canvas.drawString(
                self.leftMargin,
                letter[1] - 0.39 * inch,
                "Plataforma Operacional | Auditoria Técnica e Funcional",
            )
        canvas.setFont(FONT, 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(
            letter[0] - self.rightMargin,
            0.35 * inch,
            f"Página {doc.page}",
        )
        canvas.restoreState()


def parse_table(lines: list[str], start: int) -> tuple[list[list[str]], int]:
    raw_rows: list[str] = []
    index = start
    while index < len(lines) and lines[index].strip().startswith("|"):
        raw_rows.append(lines[index].strip())
        index += 1

    rows: list[list[str]] = []
    for line_number, line in enumerate(raw_rows):
        values = [value.strip() for value in line.strip("|").split("|")]
        if line_number == 1 and all(
            re.fullmatch(r":?-{3,}:?", value) for value in values
        ):
            continue
        rows.append(values)
    return rows, index


def widths_for(columns: int, available: float) -> list[float]:
    ratios = {
        2: [0.27, 0.73],
        3: [0.22, 0.43, 0.35],
        4: [0.18, 0.31, 0.20, 0.31],
        5: [0.17, 0.15, 0.28, 0.25, 0.15],
    }.get(columns, [1 / columns] * columns)
    return [available * ratio for ratio in ratios]


def make_table(rows: list[list[str]], available: float) -> Table:
    columns = max(len(row) for row in rows)
    normalized = [row + [""] * (columns - len(row)) for row in rows]
    data: list[list[Paragraph]] = []
    for row_index, row in enumerate(normalized):
        style = TABLE_HEADER if row_index == 0 else TABLE_BODY
        data.append([Paragraph(inline_markup(value), style) for value in row])

    table = Table(
        data,
        colWidths=widths_for(columns, available),
        repeatRows=1,
        hAlign="LEFT",
        splitByRow=True,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GRAY),
                ("TEXTCOLOR", (0, 0), (-1, 0), TEAL),
                ("GRID", (0, 0), (-1, -1), 0.35, GRID),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def cover_story(doc: AuditDocTemplate) -> list:
    story: list = []
    logo_path = ROOT / "public" / "brand" / "logo-horizontal-fundo-escuro.png"
    if logo_path.exists():
        logo = Image(str(logo_path), width=2.15 * inch, height=0.69 * inch)
        logo.hAlign = "RIGHT"
        story.extend([logo, Spacer(1, 0.42 * inch)])

    story.append(
        Paragraph(
            '<font color="#9D6F4E"><b>RELATÓRIO DE AUDITORIA</b></font>',
            ParagraphStyle(
                "Kicker",
                parent=BODY,
                fontName=FONT_BOLD,
                fontSize=9.5,
                leading=12,
                spaceAfter=5,
            ),
        )
    )
    story.append(
        Paragraph(
            "Auditoria Técnica e Funcional",
            ParagraphStyle(
                "CoverTitle",
                parent=H1,
                fontName=FONT_BOLD,
                fontSize=25,
                leading=29,
                spaceAfter=8,
            ),
        )
    )
    story.append(
        Paragraph(
            "Levantamento do estado atual da Plataforma Operacional Juliana Coutinho",
            ParagraphStyle(
                "CoverSubtitle",
                parent=BODY,
                fontSize=12.5,
                leading=16,
                textColor=MUTED,
                spaceAfter=22,
            ),
        )
    )

    metadata = [
        [
            Paragraph("Sistema", META_LABEL),
            Paragraph("Plataforma Operacional Juliana Coutinho", META_VALUE),
        ],
        [
            Paragraph("Data", META_LABEL),
            Paragraph("21/06/2026", META_VALUE),
        ],
        [
            Paragraph("Escopo", META_LABEL),
            Paragraph(
                "Código, migrations, schema Supabase conectado, dados e integrações versionadas",
                META_VALUE,
            ),
        ],
        [
            Paragraph("Validação", META_LABEL),
            Paragraph(
                "TypeScript e build de produção concluídos sem erro",
                META_VALUE,
            ),
        ],
    ]
    meta_table = Table(
        metadata,
        colWidths=[1.25 * inch, doc.width - 1.25 * inch],
        hAlign="LEFT",
    )
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), CREAM),
                ("GRID", (0, 0), (-1, -1), 0.35, GRID),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.extend([meta_table, PageBreak()])
    return story


def markdown_story(doc: AuditDocTemplate, markdown: str) -> list:
    story: list = []
    lines = markdown.splitlines()
    index = 0
    skipped_title = False

    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue

        if line.startswith("|"):
            rows, index = parse_table(lines, index)
            story.extend([make_table(rows, doc.width), Spacer(1, 7)])
            continue

        if line.startswith("# "):
            if not skipped_title:
                skipped_title = True
            else:
                story.append(Paragraph(inline_markup(line[2:]), H1))
        elif line.startswith("## "):
            story.append(Paragraph(inline_markup(line[3:]), H2))
        elif line.startswith("### "):
            story.append(Paragraph(inline_markup(line[4:]), H3))
        elif line.startswith("- "):
            items: list[ListItem] = []
            while index < len(lines) and lines[index].strip().startswith("- "):
                text = lines[index].strip()[2:]
                items.append(
                    ListItem(
                        Paragraph(inline_markup(text), BODY),
                        leftIndent=12,
                    )
                )
                index += 1
            story.append(
                ListFlowable(
                    items,
                    bulletType="bullet",
                    start="circle",
                    leftIndent=17,
                    bulletFontName=FONT,
                    bulletFontSize=7,
                    spaceAfter=4,
                )
            )
            continue
        elif re.match(r"^\d+\.\s", line):
            items = []
            while index < len(lines) and re.match(r"^\d+\.\s", lines[index].strip()):
                text = re.sub(r"^\d+\.\s", "", lines[index].strip())
                items.append(ListItem(Paragraph(inline_markup(text), BODY), leftIndent=12))
                index += 1
            story.append(
                ListFlowable(
                    items,
                    bulletType="1",
                    leftIndent=20,
                    bulletFontName=FONT,
                    bulletFontSize=8.5,
                    spaceAfter=4,
                )
            )
            continue
        else:
            story.append(Paragraph(inline_markup(line), BODY))
        index += 1

    return story


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    markdown = SOURCE.read_text(encoding="utf-8")
    doc = AuditDocTemplate(str(OUTPUT))
    story = cover_story(doc)
    story.extend(markdown_story(doc, markdown))
    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    main()
