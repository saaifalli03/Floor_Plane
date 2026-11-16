import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export interface PdfExportOptions {
  title: string;
  subtitle: string;
  fileName: string;
}

const MARGIN_MM = 12;
const HEADER_MM = 18;

/** Rasterises a DOM element at high resolution and saves it as a landscape A4 PDF. */
export async function exportElementToPdf(
  element: HTMLElement,
  opts: PdfExportOptions,
) {
  const canvas = await html2canvas(element, {
    scale: 3,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(opts.title, MARGIN_MM, MARGIN_MM + 4);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text(opts.subtitle, MARGIN_MM, MARGIN_MM + 10);

  const maxW = pageW - MARGIN_MM * 2;
  const maxH = pageH - MARGIN_MM * 2 - HEADER_MM;
  const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
  const imgW = canvas.width * ratio;
  const imgH = canvas.height * ratio;
  const x = (pageW - imgW) / 2;
  const y = MARGIN_MM + HEADER_MM;

  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    x,
    y,
    imgW,
    imgH,
    undefined,
    "FAST",
  );
  pdf.save(`${opts.fileName}.pdf`);
}
