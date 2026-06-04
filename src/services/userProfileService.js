const BirthdayProfile = require("../models/BirthdayProfile");

const normalizeBirthdayInput = (value) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  // Normalize to midnight UTC to keep a stable calendar date.
  parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
};

const isBirthdayValid = (birthdayDate) => {
  if (!birthdayDate) return false;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return birthdayDate <= today;
};

const toBirthdayString = (birthdayDate) => {
  if (!birthdayDate) return null;
  return new Date(birthdayDate).toISOString().slice(0, 10);
};

const getBirthdayForUser = async (userId) => {
  const birthdayDoc = await BirthdayProfile.findOne({ userId }).select("birthday").lean();
  return birthdayDoc?.birthday || null;
};

const attachBirthdayToUser = async (user) => {
  if (!user) return null;

  const userJson = typeof user.toJSON === "function" ? user.toJSON() : { ...user };
  const birthday = await getBirthdayForUser(user._id || user.id);
  userJson.birthday = toBirthdayString(birthday);

  return userJson;
};

const upsertBirthdayForUser = async (userId, birthdayValue) => {
  const normalized = normalizeBirthdayInput(birthdayValue);

  if (!isBirthdayValid(normalized)) {
    return { error: "Fecha de cumpleaños inválida" };
  }

  const birthdayDoc = await BirthdayProfile.findOneAndUpdate(
    { userId },
    { userId, birthday: normalized },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return { birthday: birthdayDoc.birthday };
};

module.exports = {
  normalizeBirthdayInput,
  isBirthdayValid,
  toBirthdayString,
  getBirthdayForUser,
  attachBirthdayToUser,
  upsertBirthdayForUser
};
