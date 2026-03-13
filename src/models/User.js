const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  password: {
    type: String,
    default: null
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  role: {
    type: String,
    enum: ["customer", "admin", "seller"],
    default: "customer"
  },
  addresses: [
    {
      label: String,
      street: String,
      neighborhood: String,
      details: String
    }
  ],
  cards: [
    {
      brand: {
        type: String,
        default: "CARD"
      },
      last4: {
        type: String,
        required: true
      },
      maskedNumber: {
        type: String,
        required: true
      },
      expMonth: {
        type: String,
        required: true
      },
      expYear: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, { timestamps: true });

userSchema.set("toJSON", {
  transform: (_, returnedObject) => {
    delete returnedObject.password;
    return returnedObject;
  }
});

module.exports = mongoose.model("User", userSchema);
