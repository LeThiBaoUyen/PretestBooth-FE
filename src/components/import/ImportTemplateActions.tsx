"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";

type ImportTemplateActionsProps = {
  onDownloadXlsx: () => void;
  onDownloadCsv: () => void;
  className?: string;
};

export function ImportTemplateActions({
  onDownloadXlsx,
  onDownloadCsv,
  className = "",
}: ImportTemplateActionsProps) {
  const [open, setOpen] = useState(false);

  const handleDownload = (handler: () => void) => {
    handler();
    setOpen(false);
  };

  return (
    <details
      className={`relative ${className}`.trim()}
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary
        className="list-none inline-flex min-h-[38px] w-[126px] cursor-pointer items-center justify-between gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
        aria-label="Tải mẫu import"
      >
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <Download className="h-4 w-4 shrink-0" />
          <span className="truncate">Tải mẫu</span>
        </span>
        <ChevronDown className={`h-4 w-4 transition duration-150 ${open ? "rotate-180" : ""}`} />
      </summary>

      <div className="absolute right-0 top-full z-30 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
        <button
          type="button"
          onClick={() => handleDownload(onDownloadXlsx)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Download className="h-4 w-4" />
          </span>
          <span className="font-semibold text-slate-800">XLSX</span>
        </button>
        <button
          type="button"
          onClick={() => handleDownload(onDownloadCsv)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Download className="h-4 w-4" />
          </span>
          <span className="font-semibold text-slate-800">CSV</span>
        </button>
      </div>
    </details>
  );
}
