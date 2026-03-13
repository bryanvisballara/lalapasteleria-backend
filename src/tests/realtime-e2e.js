const { io } = require("socket.io-client");

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const API_URL = `${BASE_URL}/api`;

const waitForEvent = (socket, eventName, timeoutMs = 10000, matcher = null) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timeout esperando evento ${eventName}`));
    }, timeoutMs);

    const handler = (payload) => {
      if (matcher && !matcher(payload)) {
        return;
      }

      clearTimeout(timeout);
      socket.off(eventName, handler);
      resolve(payload);
    };

    socket.on(eventName, handler);
  });
};

const request = async (path, { method = "GET", body, token } = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
};

const connectSocket = (token, label) => {
  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      transports: ["websocket"],
      autoConnect: false
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`${label} socket timeout de conexión`));
    }, 10000);

    let connected = false;
    let readyPayload = null;

    const tryResolve = () => {
      if (connected && readyPayload) {
        clearTimeout(timeout);
        resolve({ socket, ready: readyPayload });
      }
    };

    socket.on("connect", () => {
      connected = true;
      tryResolve();
    });

    socket.on("socket_ready", (payload) => {
      readyPayload = payload;
      tryResolve();
    });

    socket.on("connect_error", (error) => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(new Error(`${label} connect_error: ${error.message}`));
    });

    socket.connect();
  });
};

const run = async () => {
  const unique = Date.now();
  const customerEmail = `cliente${unique}@test.com`;
  const customerPhone = `3${String(unique).slice(-9)}`;

  const registerBody = {
    firstName: "Bryan",
    lastName: "Cliente",
    email: customerEmail,
    phone: customerPhone,
    password: "123456",
    addresses: [
      {
        label: "Casa",
        street: "Calle 1 #2-3",
        neighborhood: "Centro",
        details: "Apto 101"
      }
    ]
  };

  await request("/auth/register", { method: "POST", body: registerBody });

  const customerLogin = await request("/auth/login", {
    method: "POST",
    body: { email: customerEmail, password: "123456" }
  });

  const sellerLogin = await request("/auth/login", {
    method: "POST",
    body: { email: "seller@lalapasteleria.com", password: "Seller123*" }
  });

  const customerToken = customerLogin.token;
  const sellerToken = sellerLogin.token;

  const customerUser = customerLogin.user;
  const addressId = customerUser.addresses?.[0]?._id;

  if (!addressId) {
    throw new Error("El customer no tiene addressId disponible para crear orden");
  }

  const products = await request("/products");
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("No hay productos para la prueba realtime");
  }

  const productId = products[0]._id;

  const sellerConnection = await connectSocket(sellerToken, "seller");
  const customerConnection = await connectSocket(customerToken, "customer");

  const sellerSocket = sellerConnection.socket;
  const customerSocket = customerConnection.socket;

  const sellerNewOrderPromise = waitForEvent(sellerSocket, "new_order", 10000);

  const createdOrder = await request("/orders", {
    method: "POST",
    token: customerToken,
    body: {
      items: [{ productId, quantity: 2 }],
      addressId,
      paymentMethod: "cash"
    }
  });

  const orderId = createdOrder._id;

  const sellerNewOrder = await sellerNewOrderPromise;
  if (String(sellerNewOrder._id) !== String(orderId)) {
    throw new Error("El evento new_order no corresponde a la orden creada");
  }

  const customerStatusPromise = waitForEvent(
    customerSocket,
    "order_status_updated",
    10000,
    (payload) => String(payload.orderId) === String(orderId)
  );

  const patchedOrder = await request(`/orders/${orderId}/status`, {
    method: "PATCH",
    token: sellerToken,
    body: { status: "on_the_way" }
  });

  const customerStatus = await customerStatusPromise;

  if (patchedOrder.status !== "on_the_way") {
    throw new Error("La orden no cambió al estado on_the_way");
  }

  if (customerStatus.status !== "on_the_way") {
    throw new Error("El evento order_status_updated no llegó con estado on_the_way");
  }

  sellerSocket.disconnect();
  customerSocket.disconnect();

  const result = {
    customerEmail,
    sellerConnected: true,
    customerConnected: true,
    orderId,
    orderStatusCreated: createdOrder.status,
    subtotal: createdOrder.subtotal,
    deliveryFee: createdOrder.deliveryFee,
    total: createdOrder.total,
    sellerReceivedNewOrder: true,
    customerReceivedStatusUpdate: true,
    updatedStatus: customerStatus.status
  };

  console.log("✅ Realtime E2E OK");
  console.log(JSON.stringify(result, null, 2));
};

run().catch((error) => {
  console.error("❌ Realtime E2E FAIL");
  console.error(error.message);
  process.exit(1);
});
