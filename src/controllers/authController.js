const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const FcmToken = require("../models/FcmToken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client();

const signToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      addresses = []
    } = req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ message: "firstName, lastName, email, phone y password son obligatorios" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(409).json({ message: "El email o teléfono ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role: role || "customer",
      addresses
    });

    const token = signToken(user);
    return res.status(201).json({ token, user: user.toJSON() });
  } catch (error) {
    return res.status(500).json({ message: "Error al registrar usuario", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
      return res.status(400).json({ message: "Debes enviar email o phone, y password" });
    }

    const user = await User.findOne(email ? { email: String(email).toLowerCase().trim() } : { phone: String(phone).trim() });
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    if (!user.password) {
      return res.status(401).json({ message: "Tu cuenta usa Google. Inicia sesión con Google." });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = signToken(user);
    return res.status(200).json({ token, user: user.toJSON() });
  } catch (error) {
    return res.status(500).json({ message: "Error al iniciar sesión", error: error.message });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { idToken, role } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "idToken es obligatorio" });
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "Google auth no está configurado en el servidor" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.email_verified) {
      return res.status(401).json({ message: "No se pudo validar la cuenta de Google" });
    }

    const email = String(payload.email).toLowerCase().trim();
    const firstName = (payload.given_name || payload.name || "Usuario").trim();
    const fallbackLastName = payload.name && payload.given_name
      ? payload.name.replace(payload.given_name, "").trim()
      : "";
    const lastName = (payload.family_name || fallbackLastName || "Google").trim();

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        firstName,
        lastName,
        email,
        role: role || "customer",
        googleId: payload.sub
      });
    } else {
      if (user.googleId && user.googleId !== payload.sub) {
        return res.status(409).json({ message: "Este correo ya está vinculado a otra cuenta de Google" });
      }

      let requiresSave = false;

      if (!user.googleId) {
        user.googleId = payload.sub;
        requiresSave = true;
      }

      if (!user.firstName && firstName) {
        user.firstName = firstName;
        requiresSave = true;
      }

      if (!user.lastName && lastName) {
        user.lastName = lastName;
        requiresSave = true;
      }

      if (requiresSave) {
        await user.save();
      }
    }

    const token = signToken(user);
    return res.status(200).json({ token, user: user.toJSON() });
  } catch (error) {
    return res.status(500).json({ message: "Error al autenticar con Google", error: error.message });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.status(200).json(user.toJSON());
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo perfil", error: error.message });
  }
};

const addAddress = async (req, res) => {
  try {
    const { label, street, neighborhood, details = "" } = req.body;

    if (!label || !street || !neighborhood) {
      return res.status(400).json({ message: "label, street y neighborhood son obligatorios" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (!user.phone) {
      return res.status(400).json({
        requiresPhone: true,
        message: "Debes registrar un teléfono antes de guardar una dirección"
      });
    }

    user.addresses.push({ label, street, neighborhood, details });
    await user.save();

    const createdAddress = user.addresses[user.addresses.length - 1];
    return res.status(201).json(createdAddress);
  } catch (error) {
    return res.status(500).json({ message: "Error agregando dirección", error: error.message });
  }
};

const registerFcmToken = async (req, res) => {
  try {
    const token = String(req.body?.fcmToken || "").trim();

    if (!token) {
      return res.status(400).json({ message: "fcmToken es obligatorio" });
    }

    const stored = await FcmToken.findOneAndUpdate(
      { fcmToken: token },
      { userId: req.user.id, fcmToken: token },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Token registrado",
      tokenId: stored._id
    });
  } catch (error) {
    return res.status(500).json({ message: "Error registrando token push", error: error.message });
  }
};

const deleteFcmToken = async (req, res) => {
  try {
    const token = String(req.body?.fcmToken || "").trim();

    if (!token) {
      return res.status(400).json({ message: "fcmToken es obligatorio" });
    }

    await FcmToken.deleteOne({ userId: req.user.id, fcmToken: token });
    return res.status(200).json({ message: "Token eliminado" });
  } catch (error) {
    return res.status(500).json({ message: "Error eliminando token push", error: error.message });
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  me,
  addAddress,
  registerFcmToken,
  deleteFcmToken
};
