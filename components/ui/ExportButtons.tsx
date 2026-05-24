"use client";

import { Download } from "lucide-react";
import {
  exportRowsAsCsv,
  exportRowsAsPdf,
  exportRowsAsXlsx,
  type ExportColumn,
} from "@/lib/client/table-export";

export function ExportButtons<T>({
  label,
  filename,
  columns,
  rows,
}: {
  label: string;
  filename: string;
  columns: ExportColumn<T>[];
  rows: T[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={label}>
      <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-brand-teal/55">
        <Download className="h-3.5 w-3.5" />
        Exportar
      </span>
      <ExportButton onClick={() => exportRowsAsCsv(filename, columns, rows)}>CSV</ExportButton>
      <ExportButton onClick={() => exportRowsAsXlsx(filename, columns, rows)}>XLSX</ExportButton>
      <ExportButton onClick={() => exportRowsAsPdf(label, columns, rows)}>PDF</ExportButton>
    </div>
  );
}

function ExportButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 rounded-md border border-[#E9CBD1] bg-white px-2.5 text-xs font-bold text-brand-teal transition hover:bg-[#FFF7F8]"
    >
      {children}
    </button>
  );
}
