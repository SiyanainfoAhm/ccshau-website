"use client";

import { Printer } from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function collectStylesheetLinks(): string {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((node) => {
      const link = node as HTMLLinkElement;
      if (!link.href) return "";
      return `<link rel="stylesheet" href="${link.href}" />`;
    })
    .join("\n");
}

function buildPrintHtml(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  ${collectStylesheetLinks()}
  <style>
    @page { margin: 12mm; size: auto; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      color: #0f172a !important;
    }
    body {
      padding: 8mm !important;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    .faculty-profile-no-print { display: none !important; }
    .faculty-profile-print-root {
      max-width: none !important;
      max-height: none !important;
      overflow: visible !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      background: #fff !important;
    }
    .faculty-profile-print-body {
      overflow: visible !important;
      max-height: none !important;
    }
    .faculty-profile-print-root img {
      position: static !important;
      width: 112px !important;
      height: 112px !important;
      object-fit: cover !important;
      border-radius: 9999px;
    }
    .faculty-profile-print-root .relative {
      position: relative !important;
      width: 112px !important;
      height: 112px !important;
      overflow: hidden !important;
    }
  </style>
</head>
<body>
  <div class="faculty-profile-print-root">${contentHtml}</div>
</body>
</html>`;
}

function waitForAssets(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  return Promise.all(
    images.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
    ),
  ).then(() => undefined);
}

/** Print only the faculty profile via a temporary iframe (avoids blank about:blank popups). */
function printFacultyProfile(root: HTMLElement) {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".faculty-profile-no-print").forEach((el) => el.remove());

  const title =
    clone.querySelector("h1, h2")?.textContent?.trim() ||
    document.title ||
    "Faculty profile";

  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;",
  );
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = iframe.contentDocument ?? frameWindow?.document;
  if (!frameWindow || !frameDoc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  frameDoc.open();
  frameDoc.write(buildPrintHtml(title, clone.innerHTML));
  frameDoc.close();

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  const runPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      // Give the print dialog time to snapshot content before removing the iframe
      window.setTimeout(cleanup, 1000);
    }
  };

  waitForAssets(frameDoc).then(() => {
    window.setTimeout(runPrint, 200);
  });
}

export function FacultyProfilePrintButton({
  className,
}: {
  className?: string;
}) {
  const { t } = useLanguage();

  function handlePrint() {
    const root =
      document.querySelector<HTMLElement>(
        ".faculty-profile-dialog-root .faculty-profile-print-root",
      ) ?? document.querySelector<HTMLElement>(".faculty-profile-print-root");

    if (!root) {
      window.print();
      return;
    }
    printFacultyProfile(root);
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className={
        className ??
        "faculty-profile-no-print inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
      }
    >
      <Printer className="h-4 w-4" aria-hidden />
      {t("Print profile", "प्रोफ़ाइल प्रिंट करें")}
    </button>
  );
}
