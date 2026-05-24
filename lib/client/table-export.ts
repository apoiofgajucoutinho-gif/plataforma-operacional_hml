"use client";

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function normalizeCell(value: string | number | null | undefined) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportRowsAsCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const csv = [
    columns.map((column) => csvEscape(column.header)).join(","),
    ...rows.map((row) =>
      columns.map((column) => csvEscape(normalizeCell(column.value(row)))).join(","),
    ),
  ].join("\r\n");

  downloadBlob(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

export function exportRowsAsPdf<T>(title: string, columns: ExportColumn<T>[], rows: T[]) {
  const htmlRows = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column) => `<td>${xmlEscape(normalizeCell(column.value(row)))}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${xmlEscape(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0D3A4E; }
    h1 { font-size: 18px; margin: 0 0 16px; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; }
    th { background: #F4DCE0; color: #9D6F4E; text-align: left; }
    th, td { border-bottom: 1px solid #EFDDE1; padding: 8px; vertical-align: top; }
    @page { margin: 16mm; }
  </style>
</head>
<body>
  <h1>${xmlEscape(title)}</h1>
  <table>
    <thead><tr>${columns.map((column) => `<th>${xmlEscape(column.header)}</th>`).join("")}</tr></thead>
    <tbody>${htmlRows}</tbody>
  </table>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  window.open(url, "_blank");
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function exportRowsAsXlsx<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const tableRows = [
    columns.map((column) => column.header),
    ...rows.map((row) => columns.map((column) => normalizeCell(column.value(row)))),
  ];
  const worksheetRows = tableRows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, columnIndex) => {
          const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
          return `<c r="${reference}" t="inlineStr"><is><t>${xmlEscape(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  const files: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Exportacao" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${worksheetRows}</sheetData>
</worksheet>`,
  };

  downloadBlob(createZip(files), `${filename}.xlsx`);
}

function columnName(index: number) {
  let name = "";
  let next = index + 1;
  while (next > 0) {
    const modulo = (next - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    next = Math.floor((next - modulo) / 26);
  }

  return name;
}

function createZip(files: Record<string, string>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  Object.entries(files).forEach(([path, content]) => {
    const name = encoder.encode(path);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = zipHeader(0x04034b50, name, data.length, crc, offset);
    const central = zipHeader(0x02014b50, name, data.length, crc, offset);

    localParts.push(local, name, data);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = endCentralDirectory(Object.keys(files).length, centralSize, offset);
  const blobParts = [...localParts, ...centralParts, end];

  return new Blob(blobParts.map(toArrayBuffer), {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function toArrayBuffer(part: Uint8Array) {
  const copy = new Uint8Array(part.byteLength);
  copy.set(part);

  return copy.buffer;
}

function zipHeader(signature: number, name: Uint8Array, size: number, crc: number, offset: number) {
  const isCentral = signature === 0x02014b50;
  const length = isCentral ? 46 : 30;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  view.setUint32(0, signature, true);
  if (isCentral) {
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, size, true);
    view.setUint32(24, size, true);
    view.setUint16(28, name.length, true);
    view.setUint32(42, offset, true);
  } else {
    view.setUint16(4, 20, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, name.length, true);
  }

  return new Uint8Array(buffer);
}

function endCentralDirectory(entries: number, centralSize: number, centralOffset: number) {
  const buffer = new ArrayBuffer(22);
  const view = new DataView(buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, entries, true);
  view.setUint16(10, entries, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);

  return new Uint8Array(buffer);
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
