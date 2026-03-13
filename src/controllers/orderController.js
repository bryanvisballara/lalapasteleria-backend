const Order = require("../models/Order");
const Product = require("../models/Product");
const Neighborhood = require("../models/Neighborhood");
const User = require("../models/User");
const { getIO } = require("../socket/socket");
const { sendPushToUser } = require("../services/pushService");

const STATUS_PUSH_MESSAGES = {
  accepted: {
    title: "Lala Pasteleria: ¡Tu pedido fue aceptado!",
    subtitle: "Nuestro equipo empezará a prepararlo"
  },
  preparing: {
    title: "Lala Pasteleria: ¡Estamos preparando tu pedido!",
    subtitle: "En este momento lo estamos cocinando"
  },
  ready: {
    title: "Lala Pasteleria: ¡Tu pedido esta listo!",
    subtitle: "Pronto se lo entregaremos al domiciliario"
  },
  on_the_way: {
    title: "Lala Pasteleria: ¡Tu pedido va en camino!",
    subtitle: "Nuestro domiciliario llegará pronto a tu dirección"
  },
  delivered: {
    title: "Lala Pasteleria: ¡Tu pedido fue entregado!",
    subtitle: "¡Buen provecho! Gracias por pedir en Lala Pasteleria"
  }
};

const createOrder = async (req, res) => {
  try {
    const { items, addressId, paymentMethod, customerComment, cashPaymentAmount } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Debes enviar al menos un item" });
    }

    if (!addressId) {
      return res.status(400).json({ message: "addressId es obligatorio" });
    }

    if (!["card", "cash", "pse"].includes(paymentMethod)) {
      return res.status(400).json({ message: "paymentMethod inválido" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (!user.phone) {
      return res.status(400).json({
        requiresPhone: true,
        message: "Debes registrar un teléfono antes de continuar"
      });
    }

    const selectedAddress = user.addresses.id(addressId);
    if (!selectedAddress) {
      return res.status(400).json({ message: "addressId no pertenece al usuario" });
    }

    const productIds = items.flatMap((item) => {
      const base = [item.productId];
      const extras = Array.isArray(item.extras) ? item.extras : [];
      return [...base, ...extras];
    });
    const products = await Product.find({
      _id: { $in: productIds },
      available: true
    });

    const productsMap = new Map(products.map((product) => [product._id.toString(), product]));

    let subtotal = 0;

    const orderItems = items.map((item) => {
      const product = productsMap.get(item.productId);
      const quantity = Number(item.quantity);
      const extrasIds = Array.from(new Set((Array.isArray(item.extras) ? item.extras : [])
        .map((extraId) => String(extraId || ""))
        .filter(Boolean)));

      if (!product) {
        throw new Error(`Producto inválido o no disponible: ${item.productId}`);
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Cantidad inválida para producto: ${item.productId}`);
      }

      const unitPrice = product.price;
      const normalizedExtras = extrasIds.map((extraId) => {
        const extraProduct = productsMap.get(extraId);

        if (!extraProduct) {
          throw new Error(`Extra inválido o no disponible: ${extraId}`);
        }

        return {
          product: extraProduct._id,
          price: Number(extraProduct.price || 0)
        };
      });

      const extrasTotal = normalizedExtras.reduce((accumulator, extra) => accumulator + Number(extra.price || 0), 0);

      subtotal += (unitPrice + extrasTotal) * quantity;

      return {
        product: product._id,
        quantity,
        price: unitPrice,
        extras: normalizedExtras
      };
    });

    const neighborhood = await Neighborhood.findOne({
      name: selectedAddress.neighborhood,
      active: true
    });

    if (!neighborhood) {
      return res.status(400).json({ message: "El barrio de la dirección no está disponible para domicilios" });
    }

    const deliveryFee = neighborhood.deliveryFee;
    const total = subtotal + deliveryFee;
    const normalizedCashPaymentAmount = paymentMethod === "cash"
      ? String(cashPaymentAmount || "").trim().slice(0, 60)
      : "";

    const order = await Order.create({
      user: user._id,
      address: {
        street: selectedAddress.street,
        neighborhood: selectedAddress.neighborhood
      },
      items: orderItems,
      subtotal,
      deliveryFee,
      total,
      paymentMethod,
      customerComment: typeof customerComment === "string" ? customerComment.trim().slice(0, 500) : "",
      cashPaymentAmount: normalizedCashPaymentAmount,
      paymentStatus: "pending",
      status: "pending"
    });

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "firstName lastName phone")
      .populate("items.product", "name price image")
      .populate("items.extras.product", "name price image");

    try {
      const io = getIO();
      io.to("sellers").emit("new_order", populatedOrder);
    } catch (error) {
      console.error("Socket emit error (new_order):", error.message);
    }

    return res.status(201).json(populatedOrder);
  } catch (error) {
    return res.status(400).json({ message: "Error creando orden", error: error.message });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "firstName lastName phone")
      .populate("items.product", "name price image")
      .populate("items.extras.product", "name price image")
      .sort({ createdAt: -1 });

    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo órdenes", error: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product", "name price image")
      .populate("items.extras.product", "name price image")
      .sort({ createdAt: -1 });

    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo mis órdenes", error: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "accepted", "preparing", "ready", "on_the_way", "delivered", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    const currentOrder = await Order.findById(req.params.id);

    if (!currentOrder) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    if (currentOrder.status === status) {
      const unchangedOrder = await Order.findById(currentOrder._id)
        .populate("user", "firstName lastName phone")
        .populate("items.product", "name price image")
        .populate("items.extras.product", "name price image");

      return res.status(200).json(unchangedOrder);
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate("user", "firstName lastName phone")
      .populate("items.product", "name price image")
      .populate("items.extras.product", "name price image");

    try {
      const io = getIO();
      const customerId = order.user?._id ? order.user._id.toString() : order.user.toString();

      io.to(`user_${customerId}`).emit("order_status_updated", {
        orderId: order._id,
        status: order.status
      });

      const pushMessage = STATUS_PUSH_MESSAGES[order.status];
      if (pushMessage) {
        const pushResult = await sendPushToUser(customerId, {
          title: pushMessage.title,
          subtitle: pushMessage.subtitle,
          data: {
            orderId: order._id,
            status: order.status,
            link: `/my-orders?orderId=${order._id}`
          }
        });

        if (pushResult?.sent > 0) {
          console.log("Push enviado", {
            orderId: order._id?.toString(),
            status: order.status,
            sent: pushResult.sent,
            failed: pushResult.failed || 0
          });
        } else {
          console.warn("Push no enviado", {
            orderId: order._id?.toString(),
            status: order.status,
            reason: pushResult?.reason || "unknown",
            detail: pushResult?.detail || ""
          });
        }
      }
    } catch (error) {
      console.error("Socket emit error (order_status_updated):", error.message);
    }

    return res.status(200).json(order);
  } catch (error) {
    return res.status(500).json({ message: "Error actualizando estado", error: error.message });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getMyOrders,
  updateOrderStatus
};
