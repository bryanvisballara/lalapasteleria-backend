const User = require("../models/User");

const normalizePhone = (phone = "") => {
  let digits = String(phone).replace(/\D/g, "");

  if (digits.startsWith("57") && digits.length === 12) {
    digits = digits.slice(2);
  }

  return digits;
};

const isValidColombianMobile = (phone = "") => {
  return /^3\d{9}$/.test(phone);
};

const normalizeCardNumber = (value = "") => String(value).replace(/\D/g, "");

const normalizeMonth = (value = "") => String(value).replace(/\D/g, "").slice(0, 2);

const normalizeYear = (value = "") => String(value).replace(/\D/g, "").slice(0, 4);

const normalizeCvc = (value = "") => String(value).replace(/\D/g, "").slice(0, 4);

const detectCardBrand = (cardNumber) => {
  if (/^4/.test(cardNumber)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(cardNumber)) return "MASTERCARD";
  if (/^3[47]/.test(cardNumber)) return "AMEX";
  return "CARD";
};

const isValidLuhn = (value = "") => {
  let sum = 0;
  let shouldDouble = false;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (!Number.isFinite(digit)) return false;

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

const isValidExpiry = (monthRaw, yearRaw) => {
  const month = Number(monthRaw);
  const year = Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw);

  if (!Number.isFinite(month) || !Number.isFinite(year)) return false;
  if (month < 1 || month > 12) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;

  return true;
};

const updateMe = async (req, res) => {
  try {
    const { phone } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!isValidColombianMobile(normalizedPhone)) {
      return res.status(400).json({
        message: "El teléfono debe ser un celular colombiano válido (10 dígitos, inicia en 3)"
      });
    }

    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const existingPhoneOwner = await User.findOne({
      phone: normalizedPhone,
      _id: { $ne: req.user.id }
    });

    if (existingPhoneOwner) {
      return res.status(409).json({ message: "Este teléfono ya está registrado" });
    }

    currentUser.phone = normalizedPhone;
    await currentUser.save();

    return res.status(200).json(currentUser.toJSON());
  } catch (error) {
    return res.status(500).json({ message: "Error actualizando perfil", error: error.message });
  }
};

const getMyCards = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("cards");
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const cards = (user.cards || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(200).json(cards);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo tarjetas", error: error.message });
  }
};

const addCard = async (req, res) => {
  try {
    const cardNumber = normalizeCardNumber(req.body.cardNumber);
    const expMonth = normalizeMonth(req.body.expMonth).padStart(2, "0");
    const expYear = normalizeYear(req.body.expYear);
    const cvc = normalizeCvc(req.body.cvc);

    if (cardNumber.length < 13 || cardNumber.length > 19 || !isValidLuhn(cardNumber)) {
      return res.status(400).json({ message: "Número de tarjeta inválido" });
    }

    if (!isValidExpiry(expMonth, expYear)) {
      return res.status(400).json({ message: "Fecha de expiración inválida" });
    }

    if (cvc.length < 3 || cvc.length > 4) {
      return res.status(400).json({ message: "CVC inválido" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const last4 = cardNumber.slice(-4);
    const maskedNumber = `**** **** **** ${last4}`;
    const brand = detectCardBrand(cardNumber);
    const normalizedYear = expYear.length === 2 ? `20${expYear}` : expYear;

    user.cards.push({
      brand,
      last4,
      maskedNumber,
      expMonth,
      expYear: normalizedYear
    });

    await user.save();

    const createdCard = user.cards[user.cards.length - 1];
    return res.status(201).json(createdCard);
  } catch (error) {
    return res.status(500).json({ message: "Error guardando tarjeta", error: error.message });
  }
};

module.exports = {
  updateMe,
  getMyCards,
  addCard
};
