const mongoose = require("mongoose");

const birthdayProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },
  birthday: {
    type: Date,
    required: true
  }
}, { timestamps: true });

birthdayProfileSchema.index({ birthday: 1 });

module.exports = mongoose.model("BirthdayProfile", birthdayProfileSchema);
