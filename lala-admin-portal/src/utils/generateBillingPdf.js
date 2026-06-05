import { jsPDF } from "jspdf";
import { MONEY } from "./printComanda";

const LOGO_URL = `${import.meta.env.BASE_URL || "/"}lalalogo.jpeg`;

const BRAND = {
  primary: [127, 120, 184],
  secondary: [153, 147, 193],
  dark: [109, 103, 159],
  light: [248, 246, 252],
  white: [255, 255, 255],
  text: [17, 24, 39],
  muted: [107, 114, 128],
  border: [229, 231, 235]
};

const BUSINESS = {
  name: "Lala Pastelería Boutique",
  nit: "NIT: 901.812.848-1",
  tax: "No responsable de IVA y/o INC",
  regime: "Régimen simple de tributación",
  address: "Dirección: Cra 67 # 84 138",
  email: "Correo: Lalapasteleriabq@gmail.com",
  phone: "Teléfono: 3004730255",
  web: "web: lalapasteleria.com"
};

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

const addWrappedText = (doc, text, x, y, maxWidth, lineHeight = 3.8) => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
};

const getImageFormat = (dataUrl = "") => {
  const match = String(dataUrl).match(/^data:image\/(\w+);/);
  const format = (match?.[1] || "jpeg").toUpperCase();
  return format === "JPG" ? "JPEG" : format;
};

const getImageDimensions = (dataUrl) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
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

let logoCache = null;

const loadLogoDataUrl = async () => {
  if (logoCache) {
    return logoCache;
  }

  try {
    const response = await fetch(LOGO_URL);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    logoCache = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return logoCache;
  } catch {
    return null;
  }
};

const setFill = (doc, color) => doc.setFillColor(...color);
const setDraw = (doc, color) => doc.setDrawColor(...color);
const setText = (doc, color) => doc.setTextColor(...color);

const drawRoundedRect = (doc, x, y, w, h, r, style = "F") => {
  doc.roundedRect(x, y, w, h, r, r, style);
};

const drawCopyHeader = (doc, { x, y, width, copyLabel, logoDataUrl }) => {
  const headerH = 24;
  setFill(doc, BRAND.primary);
  drawRoundedRect(doc, x, y, width, headerH, 2.5, "F");

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "JPEG", x + 4, y + 3, 18, 18);
    } catch {
      // sin logo
    }
  }

  const textX = logoDataUrl ? x + 25 : x + 6;
  setText(doc, BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(BUSINESS.name, textX, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(BUSINESS.nit, textX, y + 13.5);
  doc.text(`${BUSINESS.tax} · ${BUSINESS.regime}`, textX, y + 17);

  const badgeW = 34;
  const badgeH = 7;
  const badgeX = x + width - badgeW - 4;
  const badgeY = y + 4;
  setFill(doc, BRAND.white);
  drawRoundedRect(doc, badgeX, badgeY, badgeW, badgeH, 2, "F");
  setText(doc, BRAND.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text(copyLabel, badgeX + badgeW / 2, badgeY + 4.8, { align: "center" });

  return y + headerH + 2;
};

const drawBusinessFooter = (doc, { x, y, width }) => {
  setFill(doc, BRAND.light);
  drawRoundedRect(doc, x, y, width, 11, 1.5, "F");
  setDraw(doc, BRAND.border);
  doc.setLineWidth(0.15);
  drawRoundedRect(doc, x, y, width, 11, 1.5, "S");

  setText(doc, BRAND.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.text(BUSINESS.address, x + 3, y + 3.8);
  doc.text(`${BUSINESS.email}  ·  ${BUSINESS.phone}`, x + 3, y + 7.2);
  doc.text(BUSINESS.web, x + width - 3, y + 7.2, { align: "right" });

  return y + 13;
};

const drawItemsTable = (doc, { x, y, width, items, showPrices }) => {
  const colDesc = width * 0.52;
  const colQty = width * 0.12;
  const colPrice = width * 0.18;
  const colTotal = width * 0.18;

  setFill(doc, BRAND.secondary);
  drawRoundedRect(doc, x, y, width, 6, 1, "F");
  setText(doc, BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Descripción", x + 2, y + 4.2);
  doc.text("Cant.", x + colDesc + 2, y + 4.2);
  if (showPrices) {
    doc.text("Precio", x + colDesc + colQty + 2, y + 4.2);
    doc.text("Subtotal", x + colDesc + colQty + colPrice + 2, y + 4.2);
  }

  let rowY = y + 6;
  setText(doc, BRAND.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);

  (items || []).forEach((item, index) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitSalePrice) || 0;
    const lineTotal = quantity * unitPrice;
    const rowH = 6;
    const fill = index % 2 === 0 ? BRAND.white : BRAND.light;

    setFill(doc, fill);
    doc.rect(x, rowY, width, rowH, "F");

    const descLines = doc.splitTextToSize(String(item.description || ""), colDesc - 4);
    doc.text(descLines.slice(0, 2), x + 2, rowY + 4);
    doc.text(String(quantity), x + colDesc + 2, rowY + 4);
    if (showPrices) {
      doc.text(MONEY.format(unitPrice), x + colDesc + colQty + 2, rowY + 4);
      doc.text(MONEY.format(lineTotal), x + colDesc + colQty + colPrice + 2, rowY + 4);
    }

    rowY += rowH;
  });

  return rowY + 1;
};

const drawAccountantTotals = (doc, { x, y, width, sale }) => {
  const boxW = width * 0.48;
  const boxX = x + width - boxW;

  setDraw(doc, BRAND.border);
  doc.setLineWidth(0.2);
  drawRoundedRect(doc, boxX, y, boxW, 22, 1.5, "S");

  const rows = [
    ["Venta total", MONEY.format(Number(sale.totalSale) || 0), true],
    ["Costo total", MONEY.format(Number(sale.totalCost) || 0), false],
    ["Utilidad", MONEY.format(Number(sale.profit) || 0), true]
  ];

  let rowY = y + 5;
  rows.forEach(([label, value, bold]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(7);
    setText(doc, BRAND.text);
    doc.text(label, boxX + 3, rowY);
    doc.text(value, boxX + boxW - 3, rowY, { align: "right" });
    rowY += 5.5;
  });

  return y + 24;
};

const drawInspirationThumb = async (doc, { x, y, maxWidth, maxHeight, imageDataUrl }) => {
  if (!imageDataUrl) {
    return y;
  }

  try {
    const { width, height } = await getImageDimensions(imageDataUrl);
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);
    const renderWidth = width * scale;
    const renderHeight = height * scale;

    setDraw(doc, BRAND.secondary);
    doc.setLineWidth(0.3);
    drawRoundedRect(doc, x, y, renderWidth + 4, renderHeight + 8, 1.5, "S");

    setText(doc, BRAND.dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text("Referencia del cliente", x + 2, y + 3.5);

    doc.addImage(
      imageDataUrl,
      getImageFormat(imageDataUrl),
      x + 2,
      y + 5,
      renderWidth,
      renderHeight
    );

    return y + renderHeight + 10;
  } catch {
    return y;
  }
};

const drawInvoiceHalf = async (doc, {
  sale,
  imageDataUrl,
  x,
  yStart,
  width,
  yEnd,
  mode,
  logoDataUrl
}) => {
  const isAccountant = mode === "accountant";
  const copyLabel = isAccountant ? "COPIA CONTADORA" : "COMANDA";
  let y = drawCopyHeader(doc, { x, y: yStart, width, copyLabel, logoDataUrl });

  setText(doc, BRAND.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Cliente: ${sale.customerName || "Sin nombre"}`, x, y + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  setText(doc, BRAND.muted);
  const dateLine = `${formatSaleDate(sale.saleDate || sale.createdAt)} · ${formatSaleTime(sale.createdAt || new Date())}`;
  doc.text(dateLine, x, y + 6.5);
  y += 10;

  y = drawItemsTable(doc, {
    x,
    y,
    width,
    items: sale.items || [],
    showPrices: true
  });

  if (Number(sale.additionalCosts) > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    setText(doc, BRAND.text);
    doc.text("Costos adicionales", x + 2, y + 3);
    doc.text(MONEY.format(Number(sale.additionalCosts)), x + width - 2, y + 3, { align: "right" });
    y += 6;
  }

  if (isAccountant) {
    y = drawAccountantTotals(doc, { x, y, width, sale });
  } else {
    setFill(doc, BRAND.primary);
    drawRoundedRect(doc, x, y, width, 8, 1.5, "F");
    setText(doc, BRAND.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Total venta:", x + 4, y + 5.5);
    doc.text(MONEY.format(Number(sale.totalSale) || 0), x + width - 4, y + 5.5, { align: "right" });
    y += 11;
  }

  if (sale.notes) {
    setText(doc, BRAND.dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(isAccountant ? "Notas" : "Instrucciones / detalle", x, y + 2);
    setText(doc, BRAND.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    y = addWrappedText(doc, String(sale.notes), x, y + 5.5, width, 3.5);
    y += 2;
  }

  if (!isAccountant && imageDataUrl && y < yEnd - 35) {
    y = await drawInspirationThumb(doc, {
      x,
      y: y + 2,
      maxWidth: Math.min(42, width * 0.35),
      maxHeight: yEnd - y - 16,
      imageDataUrl
    });
  }

  if (isAccountant && imageDataUrl && y < yEnd - 30) {
    y = await drawInspirationThumb(doc, {
      x: x + width - Math.min(42, width * 0.35) - 4,
      y: y + 2,
      maxWidth: Math.min(42, width * 0.35),
      maxHeight: yEnd - y - 14,
      imageDataUrl
    });
  }

  drawBusinessFooter(doc, { x, y: yEnd - 12, width });
};

const drawCutLine = (doc, pageWidth, midY, margin) => {
  setDraw(doc, BRAND.muted);
  doc.setLineWidth(0.35);
  if (typeof doc.setLineDashPattern === "function") {
    doc.setLineDashPattern([2, 2], 0);
  }
  doc.line(margin, midY, pageWidth - margin, midY);
  if (typeof doc.setLineDashPattern === "function") {
    doc.setLineDashPattern([], 0);
  }

  setText(doc, BRAND.muted);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("— Recortar aquí —", pageWidth / 2, midY - 1.5, { align: "center" });
};

export const generateBillingPdf = async (sale, imageDataUrl = "") => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const midY = pageHeight / 2;
  const gap = 6;

  const logoDataUrl = await loadLogoDataUrl();

  setFill(doc, BRAND.white);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  await drawInvoiceHalf(doc, {
    sale,
    imageDataUrl,
    x: margin,
    yStart: margin,
    width: contentWidth,
    yEnd: midY - gap / 2,
    mode: "accountant",
    logoDataUrl
  });

  drawCutLine(doc, pageWidth, midY, margin);

  await drawInvoiceHalf(doc, {
    sale,
    imageDataUrl,
    x: margin,
    yStart: midY + gap / 2,
    width: contentWidth,
    yEnd: pageHeight - margin,
    mode: "comanda",
    logoDataUrl
  });

  const customerSlug = sanitizeFileName(sale.customerName || "cliente");
  const dateSlug = sanitizeFileName(formatSaleDate(sale.saleDate || sale.createdAt));
  doc.save(`factura-lala-${customerSlug}-${dateSlug}.pdf`);
};
