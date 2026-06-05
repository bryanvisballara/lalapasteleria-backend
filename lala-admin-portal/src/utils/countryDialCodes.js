/** Códigos de marcación internacionales (E.164), Colombia primero. */
export const COUNTRY_DIAL_CODES = [
  { code: "+57", label: "Colombia", flag: "🇨🇴" },
  { code: "+1", label: "Estados Unidos / Canadá", flag: "🇺🇸" },
  { code: "+52", label: "México", flag: "🇲🇽" },
  { code: "+54", label: "Argentina", flag: "🇦🇷" },
  { code: "+55", label: "Brasil", flag: "🇧🇷" },
  { code: "+56", label: "Chile", flag: "🇨🇱" },
  { code: "+51", label: "Perú", flag: "🇵🇪" },
  { code: "+58", label: "Venezuela", flag: "🇻🇪" },
  { code: "+593", label: "Ecuador", flag: "🇪🇨" },
  { code: "+591", label: "Bolivia", flag: "🇧🇴" },
  { code: "+595", label: "Paraguay", flag: "🇵🇾" },
  { code: "+598", label: "Uruguay", flag: "🇺🇾" },
  { code: "+507", label: "Panamá", flag: "🇵🇦" },
  { code: "+506", label: "Costa Rica", flag: "🇨🇷" },
  { code: "+502", label: "Guatemala", flag: "🇬🇹" },
  { code: "+503", label: "El Salvador", flag: "🇸🇻" },
  { code: "+504", label: "Honduras", flag: "🇭🇳" },
  { code: "+505", label: "Nicaragua", flag: "🇳🇮" },
  { code: "+53", label: "Cuba", flag: "🇨🇺" },
  { code: "+1809", label: "Rep. Dominicana", flag: "🇩🇴" },
  { code: "+1787", label: "Puerto Rico", flag: "🇵🇷" },
  { code: "+34", label: "España", flag: "🇪🇸" },
  { code: "+44", label: "Reino Unido", flag: "🇬🇧" },
  { code: "+49", label: "Alemania", flag: "🇩🇪" },
  { code: "+33", label: "Francia", flag: "🇫🇷" },
  { code: "+39", label: "Italia", flag: "🇮🇹" },
  { code: "+351", label: "Portugal", flag: "🇵🇹" },
  { code: "+31", label: "Países Bajos", flag: "🇳🇱" },
  { code: "+41", label: "Suiza", flag: "🇨🇭" },
  { code: "+86", label: "China", flag: "🇨🇳" },
  { code: "+81", label: "Japón", flag: "🇯🇵" },
  { code: "+82", label: "Corea del Sur", flag: "🇰🇷" },
  { code: "+91", label: "India", flag: "🇮🇳" },
  { code: "+61", label: "Australia", flag: "🇦🇺" }
];

export const DEFAULT_DIAL_CODE = "+57";

const codesByLength = [...COUNTRY_DIAL_CODES].sort(
  (first, second) => second.code.length - first.code.length
);

export const parseStoredPhone = (phone = "") => {
  const trimmed = typeof phone === "string" ? phone.trim() : "";

  if (!trimmed) {
    return { phoneCountryCode: DEFAULT_DIAL_CODE, phoneLocal: "" };
  }

  const normalized = trimmed.replace(/\s+/g, " ");

  for (const entry of codesByLength) {
    if (normalized.startsWith(entry.code)) {
      return {
        phoneCountryCode: entry.code,
        phoneLocal: normalized.slice(entry.code.length).trim()
      };
    }
  }

  if (normalized.startsWith("+")) {
    const spaceIndex = normalized.indexOf(" ");
    if (spaceIndex > 0) {
      return {
        phoneCountryCode: normalized.slice(0, spaceIndex),
        phoneLocal: normalized.slice(spaceIndex + 1).trim()
      };
    }
  }

  return { phoneCountryCode: DEFAULT_DIAL_CODE, phoneLocal: normalized };
};

export const formatPhoneForStorage = (countryCode, localNumber) => {
  const local = typeof localNumber === "string" ? localNumber.trim() : "";

  if (!local) {
    return "";
  }

  const code = countryCode || DEFAULT_DIAL_CODE;
  return `${code} ${local}`;
};
