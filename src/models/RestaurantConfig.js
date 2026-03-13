const mongoose = require("mongoose");

const dailyScheduleSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: true
  },
  opensAt: {
    type: String,
    default: "12:00"
  },
  closesAt: {
    type: String,
    default: "22:00"
  }
}, { _id: false });

const extraGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    }
  ]
}, { _id: true });

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  sunThuOpensAt: {
    type: String,
    required: true,
    default: "11:00"
  },
  sunThuClosesAt: {
    type: String,
    required: true,
    default: "23:00"
  },
  friSatOpensAt: {
    type: String,
    required: true,
    default: "11:00"
  },
  friSatClosesAt: {
    type: String,
    required: true,
    default: "00:00"
  }
}, { _id: true });

const restaurantConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: "default"
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  opensAt: {
    type: String,
    default: "12:00"
  },
  closesAt: {
    type: String,
    default: "22:00"
  },
  heroImage: {
    type: String,
    default: ""
  },
  heroProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    default: null
  },
  heroTitle: {
    type: String,
    default: "LALA PASTELERIA",
    trim: true
  },
  heroSubtitle: {
    type: String,
    default: "Elige tu categoría favorita y arma tu pedido",
    trim: true
  },
  heroTitleColor: {
    type: String,
    enum: ["white", "black"],
    default: "white"
  },
  heroSubtitleColor: {
    type: String,
    enum: ["white", "black"],
    default: "white"
  },
  extras: {
    type: [extraGroupSchema],
    default: []
  },
  stores: {
    type: [storeSchema],
    default: []
  },
  weeklySchedule: {
    monday: {
      type: dailyScheduleSchema,
      default: () => ({ enabled: true, opensAt: "12:00", closesAt: "22:00" })
    },
    tuesday: {
      type: dailyScheduleSchema,
      default: () => ({ enabled: true, opensAt: "12:00", closesAt: "22:00" })
    },
    wednesday: {
      type: dailyScheduleSchema,
      default: () => ({ enabled: true, opensAt: "12:00", closesAt: "22:00" })
    },
    thursday: {
      type: dailyScheduleSchema,
      default: () => ({ enabled: true, opensAt: "12:00", closesAt: "22:00" })
    },
    friday: {
      type: dailyScheduleSchema,
      default: () => ({ enabled: true, opensAt: "12:00", closesAt: "22:00" })
    },
    saturday: {
      type: dailyScheduleSchema,
      default: () => ({ enabled: true, opensAt: "12:00", closesAt: "22:00" })
    },
    sunday: {
      type: dailyScheduleSchema,
      default: () => ({ enabled: true, opensAt: "12:00", closesAt: "22:00" })
    }
  }
}, { timestamps: true });

module.exports = mongoose.model("RestaurantConfig", restaurantConfigSchema);