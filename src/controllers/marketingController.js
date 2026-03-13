const FcmToken = require("../models/FcmToken");

const sendPushCampaign = async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "title y message son obligatorios" });
    }

    const recipientCount = await FcmToken.countDocuments();

    return res.status(200).json({
      status: "queued",
      title,
      message,
      recipientCount,
      sentAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ message: "Error enviando campaña", error: error.message });
  }
};

module.exports = {
  sendPushCampaign
};