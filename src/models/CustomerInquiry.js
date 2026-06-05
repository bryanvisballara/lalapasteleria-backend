const mongoose = require("mongoose");

const customerInquirySchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    default: ""
  },
  cakeRecipient: {
    type: String,
    required: true,
    trim: true
  },
  neededDate: {
    type: Date,
    required: true
  },
  observations: {
    type: String,
    trim: true,
    default: ""
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  impulsaContactedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

customerInquirySchema.index({ neededDate: 1 });
customerInquirySchema.index({ createdAt: -1 });
customerInquirySchema.index({ impulsaContactedAt: 1 });

module.exports = mongoose.model("CustomerInquiry", customerInquirySchema);
