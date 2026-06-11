const COLOMBIA_TZ = "America/Bogota";

const getColombiaTodayString = () => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: COLOMBIA_TZ }).format(new Date());
};

const parseCalendarDateInput = (raw) => {
  const match = String(raw || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    return new Date(Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      12,
      0,
      0,
      0
    ));
  }

  if (raw) {
    const parsed = new Date(raw);

    if (!Number.isNaN(parsed.getTime())) {
      return new Date(Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
        12,
        0,
        0,
        0
      ));
    }
  }

  const today = getColombiaTodayString();
  const todayMatch = today.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return new Date(Date.UTC(
    Number(todayMatch[1]),
    Number(todayMatch[2]) - 1,
    Number(todayMatch[3]),
    12,
    0,
    0,
    0
  ));
};

const getMonthRangeInColombia = (year, month) => {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999))
  };
};

const getColombiaYearMonth = () => {
  const today = getColombiaTodayString();
  const [year, month] = today.split("-").map(Number);
  return { year, month };
};

module.exports = {
  COLOMBIA_TZ,
  parseCalendarDateInput,
  getMonthRangeInColombia,
  getColombiaYearMonth,
  getColombiaTodayString
};
