const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

let initialized = false;

const resolveServiceAccount = () => {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inlineJson) {
    try {
      return JSON.parse(inlineJson);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON no es JSON válido");
    }
  }

  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.resolve(process.cwd(), "firebase-service-account.json");

  if (!fs.existsSync(configuredPath)) {
    throw new Error(`No se encontró service account en: ${configuredPath}`);
  }

  return JSON.parse(fs.readFileSync(configuredPath, "utf8"));
};

const getFirebaseAdmin = () => {
  if (!initialized) {
    const serviceAccount = resolveServiceAccount();

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    initialized = true;
  }

  return admin;
};

module.exports = {
  getFirebaseAdmin
};
