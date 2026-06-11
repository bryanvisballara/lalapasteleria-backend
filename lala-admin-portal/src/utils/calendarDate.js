const COLOMBIA_TZ = "America/Bogota";

export const getColombiaTodayInputValue = () => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: COLOMBIA_TZ }).format(new Date());
};

export const toCalendarDateInputValue = (dateValue) => {
  if (!dateValue) {
    return getColombiaTodayInputValue();
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return getColombiaTodayInputValue();
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatCalendarDateColombia = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    day: "numeric",
    month: "numeric",
    year: "numeric"
  }).format(date);
};
