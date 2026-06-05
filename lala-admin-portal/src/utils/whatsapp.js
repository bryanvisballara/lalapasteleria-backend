export const buildWhatsAppUrl = (phone, message = "") => {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  const params = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${params}`;
};

export const buildImpulsaWhatsAppMessage = (inquiry) => {
  const name = [inquiry.firstName, inquiry.lastName].filter(Boolean).join(" ").trim();
  const recipient = inquiry.cakeRecipient || "tu ser querido";

  return `Hola${name ? ` ${name}` : ""}, te escribimos desde Lala Pastelería. Queremos ayudarte con la torta para ${recipient}. ¿Te gustaría cotizar con nosotros?`;
};
