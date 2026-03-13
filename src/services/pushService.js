const FcmToken = require("../models/FcmToken");
const { getFirebaseAdmin } = require("./firebaseAdmin");

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token"
]);

const sendPushToUser = async (userId, { title, subtitle, data = {} }) => {
  let admin;
  try {
    admin = getFirebaseAdmin();
  } catch (error) {
    return { sent: 0, reason: "firebase_admin_not_configured", detail: error.message };
  }

  const tokens = await FcmToken.find({ userId }).lean();
  if (!tokens.length) {
    return { sent: 0, reason: "no_tokens" };
  }

  const registrationIds = Array.from(new Set(tokens.map((item) => item.fcmToken).filter(Boolean)));
  if (!registrationIds.length) {
    return { sent: 0, reason: "no_valid_tokens" };
  }

  const targetLink = typeof data.link === "string" && data.link.trim()
    ? data.link.trim()
    : "/";

  const message = {
    tokens: registrationIds,
    notification: {
      title,
      body: subtitle
    },
    data: {
      title,
      subtitle,
      ...Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value == null ? "" : String(value)])
      )
    },
    android: {
      priority: "high",
      notification: {
        sound: "default"
      }
    },
    webpush: {
      notification: {
        title,
        body: subtitle,
        requireInteraction: false,
        icon: "/assets/logoicono.png",
        badge: "/assets/logoicono.png"
      },
      fcmOptions: {
        link: targetLink
      }
    }
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  const invalidIndexes = (response?.responses || [])
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => {
      const code = result?.error?.code;
      return !result?.success && INVALID_TOKEN_CODES.has(code);
    })
    .map(({ index }) => index);

  if (invalidIndexes.length) {
    const invalidTokens = invalidIndexes.map((index) => registrationIds[index]).filter(Boolean);
    if (invalidTokens.length) {
      await FcmToken.deleteMany({ fcmToken: { $in: invalidTokens } });
    }
  }

  return {
    sent: Number(response?.successCount || 0),
    failed: Number(response?.failureCount || 0),
    total: registrationIds.length
  };
};

module.exports = {
  sendPushToUser
};
