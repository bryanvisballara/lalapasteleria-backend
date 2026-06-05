const IMPULSA_WINDOW_DAYS = 14;
const CONTACTED_VISIBLE_DAYS = 5;
/** Días entre registro y fecha de torta: si es menor, es cotización reciente (no IMPULSA). */
const FRESH_QUOTE_MAX_DAYS_BEFORE_NEEDED = 14;

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
};

const parseReferenceDate = (raw) => {
  if (!raw) {
    return startOfDay(new Date());
  }

  const match = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return startOfDay(new Date());
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return startOfDay(new Date(year, month, day));
};

const getCalendarMonthDay = (dateValue) => {
  const source = new Date(dateValue);

  return {
    month: source.getUTCMonth(),
    day: source.getUTCDate()
  };
};

const projectNeededDateToYear = (neededDate, year) => {
  const { month, day } = getCalendarMonthDay(neededDate);
  return startOfDay(new Date(year, month, day));
};

const isInImpulsaWindow = (neededDate, referenceDate) => {
  const projected = projectNeededDateToYear(neededDate, referenceDate.getFullYear());
  const windowEnd = addDays(referenceDate, IMPULSA_WINDOW_DAYS);
  return projected >= referenceDate && projected <= windowEnd;
};

const dayDiff = (later, earlier) => {
  return Math.round((startOfDay(later) - startOfDay(earlier)) / (1000 * 60 * 60 * 24));
};

/** Registro histórico: la fecha de torta original es anterior a cuando se cargó el cliente. */
const isHistoricalBackfill = (inquiry) => {
  if (!inquiry.createdAt || !inquiry.neededDate) {
    return false;
  }

  return startOfDay(inquiry.neededDate) < startOfDay(inquiry.createdAt);
};

/** Cliente recién cotizado (hoy o hace pocos días para fecha cercana): no va a IMPULSA. */
const isActiveFreshQuote = (inquiry, referenceDate, windowEnd) => {
  if (!inquiry.createdAt) {
    return false;
  }

  if (isHistoricalBackfill(inquiry)) {
    return false;
  }

  const created = startOfDay(inquiry.createdAt);
  const ref = startOfDay(referenceDate);
  const end = startOfDay(windowEnd);
  const projected = projectNeededDateToYear(inquiry.neededDate, referenceDate.getFullYear());

  if (created >= ref && created <= end) {
    return true;
  }

  const daysFromCreateToNeeded = dayDiff(projected, created);

  if (
    daysFromCreateToNeeded >= 0
    && daysFromCreateToNeeded <= FRESH_QUOTE_MAX_DAYS_BEFORE_NEEDED
    && created.getFullYear() === projected.getFullYear()
  ) {
    return true;
  }

  return false;
};

const getContactedVisibleUntil = (impulsaContactedAt) => {
  if (!impulsaContactedAt) {
    return null;
  }

  return addDays(startOfDay(impulsaContactedAt), CONTACTED_VISIBLE_DAYS);
};

const isInContactedSection = (impulsaContactedAt, today = startOfDay(new Date())) => {
  const visibleUntil = getContactedVisibleUntil(impulsaContactedAt);

  if (!visibleUntil) {
    return false;
  }

  return today <= visibleUntil;
};

const splitImpulsaInquiries = (inquiries, referenceDateRaw) => {
  const referenceDate = parseReferenceDate(referenceDateRaw);
  const windowEnd = addDays(referenceDate, IMPULSA_WINDOW_DAYS);
  const today = startOfDay(new Date());

  const upcoming = [];
  const contacted = [];

  for (const inquiry of inquiries) {
    if (isInContactedSection(inquiry.impulsaContactedAt, today)) {
      contacted.push({
        inquiry,
        visibleUntil: getContactedVisibleUntil(inquiry.impulsaContactedAt)
      });
    }

    const inWindow = isInImpulsaWindow(inquiry.neededDate, referenceDate);
    const freshQuote = isActiveFreshQuote(inquiry, referenceDate, windowEnd);

    if (
      inWindow
      && !freshQuote
      && !isInContactedSection(inquiry.impulsaContactedAt, today)
    ) {
      upcoming.push({
        inquiry,
        projectedNeededDate: projectNeededDateToYear(inquiry.neededDate, referenceDate.getFullYear())
      });
    }
  }

  upcoming.sort((first, second) => first.projectedNeededDate - second.projectedNeededDate);
  contacted.sort((first, second) => new Date(second.inquiry.impulsaContactedAt) - new Date(first.inquiry.impulsaContactedAt));

  return {
    referenceDate,
    windowEnd,
    windowDays: IMPULSA_WINDOW_DAYS,
    upcoming,
    contacted
  };
};

module.exports = {
  IMPULSA_WINDOW_DAYS,
  CONTACTED_VISIBLE_DAYS,
  parseReferenceDate,
  splitImpulsaInquiries,
  isInImpulsaWindow,
  isInContactedSection,
  isActiveFreshQuote,
  isHistoricalBackfill
};
