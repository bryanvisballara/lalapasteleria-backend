const CustomerInquiry = require("../models/CustomerInquiry");
const { splitImpulsaInquiries } = require("../services/impulsaService");

const normalizePayload = (body = {}) => {
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const cakeRecipient = typeof body.cakeRecipient === "string" ? body.cakeRecipient.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const observations = typeof body.observations === "string" ? body.observations.trim() : "";
  const neededDateRaw = body.neededDate;

  if (!firstName || !lastName || !cakeRecipient || !neededDateRaw) {
    return {
      error: "Nombre, apellido, destinatario de la torta y fecha requerida son obligatorios"
    };
  }

  const neededDate = (() => {
    const match = String(neededDateRaw).match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    }

    return new Date(neededDateRaw);
  })();

  if (Number.isNaN(neededDate.getTime())) {
    return { error: "La fecha requerida no es válida" };
  }

  return {
    firstName,
    lastName,
    phone,
    cakeRecipient,
    neededDate,
    observations
  };
};

const listCustomerInquiries = async (req, res) => {
  try {
    const inquiries = await CustomerInquiry.find()
      .populate("createdBy", "firstName lastName email")
      .sort({ neededDate: 1, createdAt: -1 });

    return res.status(200).json(inquiries);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo registros de clientes", error: error.message });
  }
};

const createCustomerInquiry = async (req, res) => {
  try {
    const normalized = normalizePayload(req.body);

    if (normalized.error) {
      return res.status(400).json({ message: normalized.error });
    }

    const inquiry = await CustomerInquiry.create({
      ...normalized,
      createdBy: req.user?.id || req.user?._id
    });

    await inquiry.populate("createdBy", "firstName lastName email");

    return res.status(201).json(inquiry);
  } catch (error) {
    return res.status(500).json({ message: "Error creando registro de cliente", error: error.message });
  }
};

const updateCustomerInquiry = async (req, res) => {
  try {
    const normalized = normalizePayload(req.body);

    if (normalized.error) {
      return res.status(400).json({ message: normalized.error });
    }

    const inquiry = await CustomerInquiry.findByIdAndUpdate(
      req.params.id,
      normalized,
      { new: true, runValidators: true }
    ).populate("createdBy", "firstName lastName email");

    if (!inquiry) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    return res.status(200).json(inquiry);
  } catch (error) {
    return res.status(500).json({ message: "Error actualizando registro de cliente", error: error.message });
  }
};

const deleteCustomerInquiry = async (req, res) => {
  try {
    const inquiry = await CustomerInquiry.findByIdAndDelete(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    return res.status(200).json({ message: "Registro eliminado" });
  } catch (error) {
    return res.status(500).json({ message: "Error eliminando registro de cliente", error: error.message });
  }
};

const getImpulsaInteractions = async (req, res) => {
  try {
    const inquiries = await CustomerInquiry.find()
      .populate("createdBy", "firstName lastName email")
      .sort({ neededDate: 1, createdAt: -1 });

    const result = splitImpulsaInquiries(inquiries, req.query.referenceDate);

    return res.status(200).json({
      referenceDate: result.referenceDate,
      windowEnd: result.windowEnd,
      windowDays: result.windowDays,
      upcoming: result.upcoming.map((entry) => ({
        ...entry.inquiry.toObject(),
        projectedNeededDate: entry.projectedNeededDate
      })),
      contacted: result.contacted.map((entry) => ({
        ...entry.inquiry.toObject(),
        visibleUntil: entry.visibleUntil
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo interacciones IMPULSA", error: error.message });
  }
};

const markImpulsaContacted = async (req, res) => {
  try {
    const inquiry = await CustomerInquiry.findByIdAndUpdate(
      req.params.id,
      { impulsaContactedAt: new Date() },
      { new: true, runValidators: true }
    ).populate("createdBy", "firstName lastName email");

    if (!inquiry) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    return res.status(200).json(inquiry);
  } catch (error) {
    return res.status(500).json({ message: "Error marcando contacto IMPULSA", error: error.message });
  }
};

module.exports = {
  listCustomerInquiries,
  createCustomerInquiry,
  updateCustomerInquiry,
  deleteCustomerInquiry,
  getImpulsaInteractions,
  markImpulsaContacted
};
