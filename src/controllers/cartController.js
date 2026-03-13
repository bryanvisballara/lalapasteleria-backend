const Cart = require("../models/Cart");
const Product = require("../models/Product");

const buildItemKey = (productId, extras = []) => {
  const extrasKey = [...extras].sort().join(",");
  return `${productId}::${extrasKey}`;
};

const toPayload = async (cart) => {
  const populated = await Cart.findById(cart._id)
    .populate("items.product", "name price image available")
    .populate("items.extras", "name price image available")
    .lean();

  return {
    _id: populated._id,
    user: populated.user,
    items: (populated.items || []).filter((item) => item.product)
  };
};

const ensureCart = async (userId) => {
  const existing = await Cart.findOne({ user: userId });
  if (existing) return existing;
  return Cart.create({ user: userId, items: [] });
};

const normalizeItems = async (incomingItems) => {
  if (!Array.isArray(incomingItems)) {
    throw new Error("items debe ser un array");
  }

  if (!incomingItems.length) {
    return [];
  }

  const productIds = incomingItems.flatMap((item) => {
    const base = [item.productId];
    const extras = Array.isArray(item.extras) ? item.extras : [];
    return [...base, ...extras];
  });
  const products = await Product.find({ _id: { $in: productIds }, available: true }).select("_id").lean();
  const validProductIds = new Set(products.map((product) => product._id.toString()));

  const mergedByProduct = new Map();

  incomingItems.forEach((item) => {
    const productId = String(item.productId || "");
    const quantity = Number(item.quantity);
    const extras = Array.from(new Set((Array.isArray(item.extras) ? item.extras : [])
      .map((extraId) => String(extraId || ""))
      .filter(Boolean)))
      .sort();

    if (!validProductIds.has(productId)) {
      throw new Error(`Producto inválido o no disponible: ${productId}`);
    }

    extras.forEach((extraId) => {
      if (!validProductIds.has(extraId)) {
        throw new Error(`Extra inválido o no disponible: ${extraId}`);
      }
    });

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Cantidad inválida para producto: ${productId}`);
    }

    const key = buildItemKey(productId, extras);
    const current = mergedByProduct.get(key);

    if (current) {
      current.quantity += quantity;
      return;
    }

    mergedByProduct.set(key, {
      product: productId,
      quantity,
      extras
    });
  });

  return Array.from(mergedByProduct.values());
};

const getCart = async (req, res) => {
  try {
    const cart = await ensureCart(req.user.id);
    const payload = await toPayload(cart);
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo carrito", error: error.message });
  }
};

const syncCart = async (req, res) => {
  try {
    const mode = req.body.mode === "replace" ? "replace" : "merge";
    const normalizedIncoming = await normalizeItems(req.body.items || []);
    const cart = await ensureCart(req.user.id);

    if (mode === "replace") {
      cart.items = normalizedIncoming;
    } else {
      const currentByProduct = new Map((cart.items || []).map((item) => {
        const productId = String(item.product);
        const extras = Array.isArray(item.extras) ? item.extras.map((extraId) => String(extraId)).sort() : [];
        const key = buildItemKey(productId, extras);

        return [key, {
          product: productId,
          quantity: Number(item.quantity || 0),
          extras
        }];
      }));

      normalizedIncoming.forEach((item) => {
        const productId = String(item.product);
        const extras = Array.isArray(item.extras) ? item.extras.map((extraId) => String(extraId)).sort() : [];
        const key = buildItemKey(productId, extras);
        const current = currentByProduct.get(key);

        if (current) {
          current.quantity += item.quantity;
          return;
        }

        currentByProduct.set(key, {
          product: productId,
          quantity: item.quantity,
          extras
        });
      });

      cart.items = Array.from(currentByProduct.values())
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          product: item.product,
          quantity: item.quantity,
          extras: item.extras
        }));
    }

    await cart.save();
    const payload = await toPayload(cart);

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(400).json({ message: "Error sincronizando carrito", error: error.message });
  }
};

const clearCart = async (req, res) => {
  try {
    const cart = await ensureCart(req.user.id);
    cart.items = [];
    await cart.save();
    const payload = await toPayload(cart);
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ message: "Error limpiando carrito", error: error.message });
  }
};

module.exports = {
  getCart,
  syncCart,
  clearCart
};
