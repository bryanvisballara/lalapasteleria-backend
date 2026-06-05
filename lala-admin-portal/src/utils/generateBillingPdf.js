import { jsPDF } from "jspdf";
import { MONEY } from "./printComanda";

const formatSaleDate = (value) => {
  const date = new Date(value);
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

const formatSaleTime = (value) => {
  const date = new Date(value);
  return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
};

const addWrappedText = (doc, text, x, y, maxWidth, lineHeight = 5) => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
};

const getImageFormat = (dataUrl = "") => {
  const match = String(dataUrl).match(/^data:image\/(\w+);/);
  const format = (match?.[1] || "jpeg").toUpperCase();

  if (format === "JPG") {
    return "JPEG";
  }

  return format;
};

const getImageDimensions = (dataUrl) => {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };

    image.onerror = () => reject(new Error("No se pudo leer la imagen"));
    image.src = dataUrl;
  });
};

const sanitizeFileName = (value = "") => {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
};

export const generateBillingPdf = async (sale, imageDataUrl = "") => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("LALA PASTELERÍA", pageWidth / 2, y, { align: "center" });

  y += 8;
  doc.setFontSize(12);
  doc.text("Factura interna", pageWidth / 2, y, { align: "center" });

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Fecha: ${formatSaleDate(sale.saleDate || sale.createdAt)}`, margin, y);
  doc.text(`Hora: ${formatSaleTime(sale.createdAt || new Date())}`, pageWidth - margin, y, { align: "right" });

  y += 7;
  doc.text(`Cliente: ${sale.customerName || "Sin nombre"}`, margin, y);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Productos", margin, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y - 4, contentWidth, 7, "F");
  doc.text("Descripción", margin + 2, y);
  doc.text("Cant.", margin + 95, y);
  doc.text("Precio", margin + 112, y);
  doc.text("Subtotal", margin + 140, y);

  y += 7;
  (sale.items || []).forEach((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitSalePrice) || 0;
    const lineTotal = quantity * unitPrice;

    doc.text(String(item.description || ""), margin + 2, y);
    doc.text(String(quantity), margin + 95, y);
    doc.text(MONEY.format(unitPrice), margin + 112, y);
    doc.text(MONEY.format(lineTotal), margin + 140, y);
    y += 6;
  });

  if (Number(sale.additionalCosts) > 0) {
    y += 2;
    doc.text("Costos adicionales", margin + 2, y);
    doc.text(MONEY.format(Number(sale.additionalCosts)), margin + 140, y);
    y += 6;
  }

  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Venta total:", margin + 2, y);
  doc.text(MONEY.format(Number(sale.totalSale) || 0), margin + 140, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text("Costo total:", margin + 2, y);
  doc.text(MONEY.format(Number(sale.totalCost) || 0), margin + 140, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Utilidad:", margin + 2, y);
  doc.text(MONEY.format(Number(sale.profit) || 0), margin + 140, y);

  if (sale.notes) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Notas", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    y = addWrappedText(doc, String(sale.notes), margin, y, contentWidth);
  }

  if (imageDataUrl) {
    try {
      const { width, height } = await getImageDimensions(imageDataUrl);
      const maxWidth = contentWidth;
      const maxHeight = Math.min(90, pageHeight - y - margin);
      const scale = Math.min(maxWidth / width, maxHeight / height, 1);
      const renderWidth = width * scale;
      const renderHeight = height * scale;

      if (y + renderHeight + 12 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Foto de inspiración del cliente", margin, y);
      y += 5;
      doc.addImage(
        imageDataUrl,
        getImageFormat(imageDataUrl),
        margin,
        y,
        renderWidth,
        renderHeight
      );
    } catch {
      y += 8;
      doc.setFont("helvetica", "italic");
      doc.text("No se pudo incluir la foto en el PDF.", margin, y);
    }
  }

  const customerSlug = sanitizeFileName(sale.customerName || "cliente");
  const dateSlug = sanitizeFileName(formatSaleDate(sale.saleDate || sale.createdAt));
  doc.save(`factura-lala-${customerSlug}-${dateSlug}.pdf`);
};
