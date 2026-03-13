const RestaurantConfig = require("../models/RestaurantConfig");
const Product = require("../models/Product");

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const createDefaultDay = () => ({
  enabled: true,
  opensAt: "12:00",
  closesAt: "22:00"
});

const defaultWeeklySchedule = {
  monday: createDefaultDay(),
  tuesday: createDefaultDay(),
  wednesday: createDefaultDay(),
  thursday: createDefaultDay(),
  friday: createDefaultDay(),
  saturday: createDefaultDay(),
  sunday: createDefaultDay()
};

const normalizeWeeklySchedule = (incomingSchedule = {}) => {
  const normalized = {};

  for (const day of validDays) {
    const dayValue = incomingSchedule?.[day];
    const dayDefault = createDefaultDay();

    if (typeof dayValue === "boolean") {
      normalized[day] = {
        ...dayDefault,
        enabled: dayValue
      };
      continue;
    }

    normalized[day] = {
      enabled: typeof dayValue?.enabled === "boolean" ? dayValue.enabled : dayDefault.enabled,
      opensAt: typeof dayValue?.opensAt === "string" ? dayValue.opensAt : dayDefault.opensAt,
      closesAt: typeof dayValue?.closesAt === "string" ? dayValue.closesAt : dayDefault.closesAt
    };
  }

  return normalized;
};

const getOrCreateConfig = async () => {
  const existing = await RestaurantConfig.findOne({ key: "default" });

  if (existing) {
    existing.weeklySchedule = normalizeWeeklySchedule(existing.weeklySchedule || {});
    await existing.save();

    return existing;
  }

  return RestaurantConfig.create({
    key: "default",
    weeklySchedule: normalizeWeeklySchedule(defaultWeeklySchedule)
  });
};

const getRestaurantConfig = async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    await config.populate([
      { path: "heroProduct", select: "name price image" },
      { path: "extras.products", select: "name price image available" }
    ]);
    return res.status(200).json(config);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo configuración", error: error.message });
  }
};

const getPublicRestaurantConfig = async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    await config.populate([
      { path: "heroProduct", select: "name price image" },
      { path: "extras.products", select: "name price image available" }
    ]);

    return res.status(200).json({
      heroImage: config.heroImage || "",
      heroProduct: config.heroProduct || null,
      heroTitle: config.heroTitle || "LALA PASTELERIA",
      heroSubtitle: config.heroSubtitle || "Elige tu categoría favorita y arma tu pedido",
      heroTitleColor: config.heroTitleColor || "white",
      heroSubtitleColor: config.heroSubtitleColor || "white",
      stores: (config.stores || []).map((store) => ({
        _id: store._id,
        name: store.name,
        address: store.address,
        city: store.city,
        phone: store.phone,
        sunThuOpensAt: store.sunThuOpensAt,
        sunThuClosesAt: store.sunThuClosesAt,
        friSatOpensAt: store.friSatOpensAt,
        friSatClosesAt: store.friSatClosesAt
      })),
      extras: (config.extras || []).map((extra) => ({
        _id: extra._id,
        name: extra.name,
        products: (extra.products || []).filter(Boolean)
      })),
      isOpen: config.isOpen,
      opensAt: config.opensAt,
      closesAt: config.closesAt
    });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo configuración pública", error: error.message });
  }
};

const updateRestaurantConfig = async (req, res) => {
  try {
    const {
      isOpen,
      opensAt,
      closesAt,
      weeklySchedule,
      heroImage,
      heroProduct,
      heroTitle,
      heroSubtitle,
      heroTitleColor,
      heroSubtitleColor,
      stores,
      extras
    } = req.body;
    const updates = {};

    if (typeof isOpen === "boolean") {
      updates.isOpen = isOpen;
    }

    if (opensAt !== undefined) {
      if (!timeRegex.test(opensAt)) {
        return res.status(400).json({ message: "opensAt debe tener formato HH:mm" });
      }

      updates.opensAt = opensAt;
    }

    if (closesAt !== undefined) {
      if (!timeRegex.test(closesAt)) {
        return res.status(400).json({ message: "closesAt debe tener formato HH:mm" });
      }

      updates.closesAt = closesAt;
    }

    if (weeklySchedule !== undefined) {
      if (typeof weeklySchedule !== "object" || Array.isArray(weeklySchedule) || !weeklySchedule) {
        return res.status(400).json({ message: "weeklySchedule debe ser un objeto" });
      }

      const normalizedSchedule = normalizeWeeklySchedule(weeklySchedule);

      for (const day of validDays) {
        const dayConfig = normalizedSchedule[day];

        if (typeof dayConfig.enabled !== "boolean") {
          return res.status(400).json({ message: `weeklySchedule.${day}.enabled debe ser boolean` });
        }

        if (!timeRegex.test(dayConfig.opensAt)) {
          return res.status(400).json({ message: `weeklySchedule.${day}.opensAt debe tener formato HH:mm` });
        }

        if (!timeRegex.test(dayConfig.closesAt)) {
          return res.status(400).json({ message: `weeklySchedule.${day}.closesAt debe tener formato HH:mm` });
        }
      }

      updates.weeklySchedule = normalizedSchedule;
    }

    if (heroImage !== undefined) {
      if (heroImage !== null && typeof heroImage !== "string") {
        return res.status(400).json({ message: "heroImage debe ser un string" });
      }

      updates.heroImage = heroImage || "";
    }

    if (heroProduct !== undefined) {
      if (heroProduct === null || heroProduct === "") {
        updates.heroProduct = null;
      } else {
        const productExists = await Product.findById(heroProduct).select("_id");
        if (!productExists) {
          return res.status(400).json({ message: "heroProduct no existe" });
        }

        updates.heroProduct = heroProduct;
      }
    }

    if (heroTitle !== undefined) {
      if (heroTitle !== null && typeof heroTitle !== "string") {
        return res.status(400).json({ message: "heroTitle debe ser un string" });
      }

      updates.heroTitle = heroTitle || "";
    }

    if (heroSubtitle !== undefined) {
      if (heroSubtitle !== null && typeof heroSubtitle !== "string") {
        return res.status(400).json({ message: "heroSubtitle debe ser un string" });
      }

      updates.heroSubtitle = heroSubtitle || "";
    }

    if (heroTitleColor !== undefined) {
      if (!["white", "black"].includes(heroTitleColor)) {
        return res.status(400).json({ message: "heroTitleColor inválido" });
      }

      updates.heroTitleColor = heroTitleColor;
    }

    if (heroSubtitleColor !== undefined) {
      if (!["white", "black"].includes(heroSubtitleColor)) {
        return res.status(400).json({ message: "heroSubtitleColor inválido" });
      }

      updates.heroSubtitleColor = heroSubtitleColor;
    }

    if (extras !== undefined) {
      if (!Array.isArray(extras)) {
        return res.status(400).json({ message: "extras debe ser un array" });
      }

      const normalizedExtras = extras.map((extra, index) => {
        const name = typeof extra?.name === "string" ? extra.name.trim() : "";
        if (!name) {
          throw new Error(`extras[${index}].name es obligatorio`);
        }

        const incomingProducts = Array.isArray(extra?.products) ? extra.products : [];
        const productIds = Array.from(new Set(incomingProducts
          .map((productId) => String(productId || "").trim())
          .filter(Boolean)));

        return {
          name,
          products: productIds
        };
      });

      const allProductIds = Array.from(new Set(normalizedExtras.flatMap((extra) => extra.products)));

      if (allProductIds.length) {
        const existingProducts = await Product.find({ _id: { $in: allProductIds } }).select("_id").lean();
        const existingIds = new Set(existingProducts.map((product) => String(product._id)));
        const missing = allProductIds.find((productId) => !existingIds.has(productId));

        if (missing) {
          return res.status(400).json({ message: `Producto inválido en extras: ${missing}` });
        }
      }

      updates.extras = normalizedExtras;
    }

    if (stores !== undefined) {
      if (!Array.isArray(stores)) {
        return res.status(400).json({ message: "stores debe ser un array" });
      }

      const normalizedStores = stores.map((store, index) => {
        const name = typeof store?.name === "string" ? store.name.trim() : "";
        const address = typeof store?.address === "string" ? store.address.trim() : "";
        const city = typeof store?.city === "string" ? store.city.trim() : "";
        const phone = typeof store?.phone === "string" ? store.phone.trim() : "";
        const sunThuOpensAt = typeof store?.sunThuOpensAt === "string" ? store.sunThuOpensAt : "11:00";
        const sunThuClosesAt = typeof store?.sunThuClosesAt === "string" ? store.sunThuClosesAt : "23:00";
        const friSatOpensAt = typeof store?.friSatOpensAt === "string" ? store.friSatOpensAt : "11:00";
        const friSatClosesAt = typeof store?.friSatClosesAt === "string" ? store.friSatClosesAt : "00:00";

        if (!name) {
          throw new Error(`stores[${index}].name es obligatorio`);
        }

        if (!address) {
          throw new Error(`stores[${index}].address es obligatorio`);
        }

        if (!city) {
          throw new Error(`stores[${index}].city es obligatorio`);
        }

        if (!phone) {
          throw new Error(`stores[${index}].phone es obligatorio`);
        }

        if (!timeRegex.test(sunThuOpensAt)) {
          throw new Error(`stores[${index}].sunThuOpensAt debe tener formato HH:mm`);
        }

        if (!timeRegex.test(sunThuClosesAt)) {
          throw new Error(`stores[${index}].sunThuClosesAt debe tener formato HH:mm`);
        }

        if (!timeRegex.test(friSatOpensAt)) {
          throw new Error(`stores[${index}].friSatOpensAt debe tener formato HH:mm`);
        }

        if (!timeRegex.test(friSatClosesAt)) {
          throw new Error(`stores[${index}].friSatClosesAt debe tener formato HH:mm`);
        }

        return {
          name,
          address,
          city,
          phone,
          sunThuOpensAt,
          sunThuClosesAt,
          friSatOpensAt,
          friSatClosesAt
        };
      });

      updates.stores = normalizedStores;
    }

    const config = await getOrCreateConfig();

    Object.assign(config, updates);
    await config.save();
    await config.populate([
      { path: "heroProduct", select: "name price image" },
      { path: "extras.products", select: "name price image available" }
    ]);

    return res.status(200).json(config);
  } catch (error) {
    if (error.message?.startsWith("extras[") || error.message?.startsWith("stores[")) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Error actualizando configuración", error: error.message });
  }
};

module.exports = {
  getRestaurantConfig,
  getPublicRestaurantConfig,
  updateRestaurantConfig
};