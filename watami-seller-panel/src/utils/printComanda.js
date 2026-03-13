const MONEY = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

export const getAmounts = (order) => {
  const subtotal = Number(order?.subtotal || 0);
  const deliveryFee = Number(order?.deliveryFee || 0);
  const total = subtotal + deliveryFee;

  return {
    subtotal,
    deliveryFee,
    total
  };
};

const escapeHtml = (value = "") => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const PAYMENT_METHOD_LABELS = {
  cash: "Efectivo",
  card: "Tarjeta",
  pse: "PSE"
};

export const printComanda = (order) => {
  if (!order) return;

  const { subtotal, deliveryFee, total } = getAmounts(order);
  const customerName = order.user
    ? `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim()
    : "Cliente";
  const customerPhone = order.user?.phone || "No registrado";
  const street = order.address?.street || "Sin dirección";
  const neighborhood = order.address?.neighborhood || "";
  const orderCode = order._id ? order._id.slice(-6) : "";
  const paymentMethod = PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod || "No definido";
  const customerComment = String(order.customerComment || "").trim();
  const cashPaymentAmount = String(order.cashPaymentAmount || "").trim();

  const itemsHtml = (order.items || [])
    .map((item) => {
      const itemName = escapeHtml(item.product?.name || "Producto");
      const itemQty = Number(item.quantity || 0);
      const extras = (item.extras || [])
        .map((extra) => escapeHtml(extra.product?.name || "Extra"))
        .filter(Boolean)
        .join(", ");

      const extrasLine = extras ? `<div class="extras">+ ${extras}</div>` : "";

      return `<li>${itemQty} x ${itemName}${extrasLine}</li>`;
    })
    .join("");

  const printableHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Comanda Lala Pasteleria #${escapeHtml(orderCode)}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: "Courier New", Courier, monospace;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
            width: 80mm;
          }

          .ticket {
            width: 72mm;
            margin: 0 auto;
            padding: 4mm 2mm 6mm;
          }

          h1 {
            margin: 0 0 4px;
            font-size: 12px;
            text-align: center;
          }

          p {
            margin: 2px 0;
            font-size: 11px;
            line-height: 1.25;
          }

          hr {
            border: 0;
            border-top: 1px dashed #000;
            margin: 6px 0;
          }

          ul {
            margin: 4px 0;
            padding-left: 14px;
          }

          li {
            margin: 2px 0;
            font-size: 11px;
          }

          .extras {
            margin-top: 1px;
            color: #444;
            font-size: 10px;
          }

          .line {
            display: flex;
            justify-content: space-between;
            gap: 6px;
            margin: 2px 0;
            font-size: 11px;
          }

          .line span:last-child {
            text-align: right;
          }

          .total {
            font-weight: 700;
            font-size: 12px;
          }

          .footer {
            margin-top: 8px;
            font-weight: 600;
            text-align: center;
          }

          @media print {
            body {
              width: 80mm;
            }
          }
        </style>
      </head>
      <body>
        <section class="ticket">
          <h1>LALA PASTELERIA - COMANDA #${escapeHtml(orderCode)}</h1>
          <p><strong>Cliente:</strong> ${escapeHtml(customerName || "Cliente")}</p>
          <p><strong>Teléfono:</strong> ${escapeHtml(customerPhone)}</p>
          <p><strong>Dirección:</strong> ${escapeHtml(street)}${neighborhood ? ` - ${escapeHtml(neighborhood)}` : ""}</p>
          <p><strong>Método de pago:</strong> ${escapeHtml(paymentMethod)}</p>
          ${order.paymentMethod === "cash" ? `<p><strong>Cambio para:</strong> ${escapeHtml(cashPaymentAmount || "No indicado")}</p>` : ""}
          <p><strong>Observaciones:</strong> ${escapeHtml(customerComment || "Sin observaciones")}</p>
          <hr />
          <p><strong>Productos:</strong></p>
          <ul>${itemsHtml}</ul>
          <hr />
          <div class="line"><span>Valor pedido:</span><strong>${MONEY.format(subtotal)}</strong></div>
          <div class="line"><span>Valor domicilio:</span><strong>${MONEY.format(deliveryFee)}</strong></div>
          <div class="line total"><span>Total:</span><span>${MONEY.format(total)}</span></div>
          <p class="footer">Gracias por tu compra! #LalaPasteleria</p>
        </section>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=720,height=900");

  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(printableHtml);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

export { MONEY };