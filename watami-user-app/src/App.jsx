import { useEffect, useMemo, useRef, useState } from "react";
import { getCategories, getNeighborhoods, getProducts, getPublicConfig } from "./api/catalog";
import { addAddress, addMyCard, getMyCards, googleAuth, login, me, register, registerFcmToken, updateMe } from "./api/auth";
import { clearCart, getCart, syncCart } from "./api/cart";
import { createOrder, getMyOrders } from "./api/orders";
import { setAuthToken } from "./api/http";
import { requestFCMToken } from "./firebase";
import { triggerMediumImpact } from "./services/haptics";
import { initPush } from "./services/push";

const TOKEN_KEY = "lala_customer_token";
const GUEST_CART_KEY = "lala_guest_cart_v1";
const NEW_ADDRESS_OPTION = "__new_address__";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const normalizePhone = (value = "") => {
  let digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length === 12) {
    digits = digits.slice(2);
  }
  return digits;
};

const isValidColombianMobile = (value = "") => /^3\d{9}$/.test(value);

const MONEY = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

const DATE_FORMAT = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short"
});

const ORDER_STATUS_META = {
  pending: { label: "Pendiente", tone: "pending" },
  accepted: { label: "Aceptado", tone: "preparing" },
  preparing: { label: "Preparando", tone: "preparing" },
  ready: { label: "Listo", tone: "preparing" },
  on_the_way: { label: "En camino", tone: "on-the-way" },
  delivered: { label: "Entregado", tone: "delivered" },
  cancelled: { label: "Cancelado", tone: "cancelled" }
};

const getOrderStatusMeta = (status) => {
  return ORDER_STATUS_META[status] || { label: "Pendiente", tone: "pending" };
};

const normalizeCardDigits = (value = "") => String(value).replace(/\D/g, "");

const formatCardDisplay = (value = "") => {
  return normalizeCardDigits(value).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
};

const getEntityId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;

  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    if (typeof value.toString === "function") return String(value.toString());
  }

  return String(value);
};

const toGuestPersisted = (items) => {
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    product: {
      _id: item.product._id,
      name: item.product.name,
      price: item.product.price,
      image: item.product.image
    },
    extras: (item.extras || []).map((extra) => ({
      _id: extra._id,
      name: extra.name,
      price: extra.price,
      image: extra.image
    }))
  }));
};

const fromGuestPersisted = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item?.productId && item?.quantity > 0 && item?.product)
    .map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      product: item.product,
      extras: Array.isArray(item.extras) ? item.extras : []
    }));
};

const fromDbCart = (cartData) => {
  return (cartData?.items || [])
    .filter((item) => item?.product?._id)
    .map((item) => ({
      productId: item.product._id,
      quantity: Number(item.quantity),
      product: item.product,
      extras: (item.extras || []).filter(Boolean)
    }));
};

const normalizeExtrasSelection = (extras = []) => {
  return Array.from(new Set((extras || [])
    .map((item) => getEntityId(item))
    .filter(Boolean)
    .map((id) => String(id))))
    .sort();
};

const buildCartItemKey = (productId, extras = []) => {
  const extrasKey = normalizeExtrasSelection(extras).join(",");
  return `${productId}::${extrasKey}`;
};

const getStoredGuestCart = () => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    return fromGuestPersisted(JSON.parse(raw));
  } catch {
    return [];
  }
};

const getNotificationNavigationTarget = () => {
  if (typeof window === "undefined") return null;

  try {
    const url = new URL(window.location.href);
    const orderId = url.searchParams.get("orderId") || "";
    const viewParam = url.searchParams.get("view") || "";
    const isMyOrdersPath = url.pathname === "/my-orders";

    if (isMyOrdersPath || viewParam === "my-orders" || orderId) {
      return {
        openMyOrders: true,
        orderId
      };
    }
  } catch {
    return null;
  }

  return null;
};

export default function App() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [heroConfig, setHeroConfig] = useState({
    image: "",
    productId: "",
    title: "LALA PASTELERIA",
    subtitle: "Elige tu categoría favorita y arma tu pedido",
    titleColor: "white",
    subtitleColor: "white"
  });
  const [extrasConfig, setExtrasConfig] = useState([]);
  const [stores, setStores] = useState([]);

  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);

  const [cartItems, setCartItems] = useState(getStoredGuestCart);
  const [view, setView] = useState("home");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState("register");
  const [authForm, setAuthForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: ""
  });

  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashPaymentAmount, setCashPaymentAmount] = useState("");
  const [orderComment, setOrderComment] = useState("");
  const [checkoutStep, setCheckoutStep] = useState("cart");
  const [addressForm, setAddressForm] = useState({
    label: "Casa",
    street: "",
    neighborhood: "",
    details: ""
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState({});
  const [profilePhone, setProfilePhone] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [myCards, setMyCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [pendingNotificationNav, setPendingNotificationNav] = useState(getNotificationNavigationTarget);
  const [cardForm, setCardForm] = useState({
    cardNumber: "",
    expMonth: "",
    expYear: "",
    cvc: ""
  });
  const googleButtonRef = useRef(null);
  const googleCallbackRef = useRef(null);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [categoriesData, productsData, neighborhoodsData] = await Promise.all([
          getCategories(),
          getProducts(),
          getNeighborhoods()
        ]);

        const publicConfig = await getPublicConfig();

        setCategories(categoriesData);
        setProducts(productsData);
        setNeighborhoods(neighborhoodsData);
        setHeroConfig({
          image: publicConfig?.heroImage || "",
          productId: publicConfig?.heroProduct?._id || publicConfig?.heroProduct || "",
          title: publicConfig?.heroTitle || "LALA PASTELERIA",
          subtitle: publicConfig?.heroSubtitle || "Elige tu categoría favorita y arma tu pedido",
          titleColor: publicConfig?.heroTitleColor || "white",
          subtitleColor: publicConfig?.heroSubtitleColor || "white"
        });
        setExtrasConfig(publicConfig?.extras || []);
        setStores(Array.isArray(publicConfig?.stores) ? publicConfig.stores : []);

        if (categoriesData.length) {
          setActiveCategory(categoriesData[0]._id);
        }
      } catch (loadError) {
        setError(loadError?.response?.data?.message || "No se pudo cargar el catálogo");
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, []);

  useEffect(() => {
    googleCallbackRef.current = async (credential) => {
      if (!credential) return;

      setProcessing(true);
      setError("");

      try {
        const responseData = await googleAuth({
          idToken: credential,
          role: "customer"
        });

        await completeAuth(responseData);
      } catch (authError) {
        setError(authError?.response?.data?.message || "No se pudo registrar con Google");
      } finally {
        setProcessing(false);
      }
    };
  }, []);

  useEffect(() => {
    setAuthToken(token);

    if (!token) {
      setUser(null);
      return;
    }

    const hydrateAuthenticated = async () => {
      try {
        const profile = await me();
        setUser(profile);
        if (!selectedAddressId && profile.addresses?.length) {
          setSelectedAddressId(profile.addresses[0]._id);
        }

        const guestCart = getStoredGuestCart();
        if (guestCart.length) {
          await syncCart(
            guestCart.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              extras: (item.extras || []).map((extra) => getEntityId(extra)).filter(Boolean)
            })),
            "merge"
          );
          localStorage.removeItem(GUEST_CART_KEY);
        }

        const dbCart = await getCart();
        setCartItems(fromDbCart(dbCart));

        try {
          const nativePushHandled = await initPush({
            onToken: async (deviceToken) => {
              await registerFcmToken(deviceToken);
            },
            onPermissionDenied: () => {
              console.log("Push permission denied");
            },
            onRegistrationError: (pushError) => {
              console.error("Push registration error:", pushError);
            },
            onPushReceived: (notification) => {
              console.log("Push received:", notification);
            },
            onPushAction: (notification) => {
              console.log("Push action:", notification);
            }
          });

          if (!nativePushHandled) {
            const fcmToken = await requestFCMToken();
            if (fcmToken) {
              await registerFcmToken(fcmToken);
            }
          }
        } catch {
          // Se ignora para no bloquear el flujo de login/checkout.
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
      }
    };

    hydrateAuthenticated();
  }, [token]);

  useEffect(() => {
    if (!token) {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(toGuestPersisted(cartItems)));
    }
  }, [cartItems, token]);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => product.category?._id === activeCategory);
  }, [products, activeCategory]);

  const activeCategoryName = useMemo(() => {
    const found = categories.find((category) => category._id === activeCategory);
    return found?.name || "Productos";
  }, [categories, activeCategory]);

  const heroProduct = useMemo(() => {
    if (!heroConfig.productId) return null;
    return products.find((product) => product._id === heroConfig.productId) || null;
  }, [heroConfig.productId, products]);

  const normalizedExtras = useMemo(() => {
    return (extrasConfig || []).map((group, index) => {
      const groupId = group?._id || `group-${index}`;
      const groupProducts = (group?.products || []).map((item) => {
        if (!item) return null;
        if (typeof item === "string") {
          return products.find((product) => product._id === item) || null;
        }

        return item;
      }).filter((product) => product && product.available !== false);

      return {
        _id: groupId,
        name: group?.name || "Acompaña con una refrescante bebida",
        products: groupProducts
      };
    }).filter((group) => group.products.length);
  }, [extrasConfig, products]);

  const extrasById = useMemo(() => {
    const map = new Map();

    normalizedExtras.forEach((group) => {
      (group.products || []).forEach((product) => {
        const productId = getEntityId(product?._id || product);
        if (!productId || map.has(productId)) return;

        map.set(productId, {
          _id: productId,
          name: product?.name || "Extra",
          price: Number(product?.price || 0),
          image: product?.image || ""
        });
      });
    });

    return map;
  }, [normalizedExtras]);

  const selectedDetailExtras = useMemo(() => {
    return Object.values(selectedExtras)
      .map((productId) => extrasById.get(getEntityId(productId)))
      .filter(Boolean);
  }, [selectedExtras, extrasById]);

  const selectedDetailExtrasTotal = useMemo(() => {
    return selectedDetailExtras.reduce((sum, extraProduct) => sum + Number(extraProduct.price || 0), 0);
  }, [selectedDetailExtras]);

  const resolveExtraProduct = (extra) => {
    const extraId = getEntityId(extra);
    if (!extraId) return null;

    if (extra?.name && extra?.price !== undefined) {
      return {
        _id: extraId,
        name: extra.name,
        price: Number(extra.price || 0),
        image: extra.image || ""
      };
    }

    const productMatch = extrasById.get(extraId) || products.find((item) => item._id === extraId);
    if (!productMatch) return null;

    return {
      _id: getEntityId(productMatch._id),
      name: productMatch.name,
      price: Number(productMatch.price || 0),
      image: productMatch.image || ""
    };
  };

  const cartCount = useMemo(() => {
    return cartItems.reduce((accumulator, item) => accumulator + item.quantity, 0);
  }, [cartItems]);

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((accumulator, item) => {
      const extrasTotal = (item.extras || []).reduce((sum, extra) => {
        const resolved = resolveExtraProduct(extra);
        return sum + Number(resolved?.price || 0);
      }, 0);
      return accumulator + (Number(item.product?.price || 0) + extrasTotal) * item.quantity;
    }, 0);
  }, [cartItems, products]);

  const selectedAddress = useMemo(() => {
    if (!selectedAddressId || !user?.addresses?.length) return null;
    return user.addresses.find((address) => address._id === selectedAddressId) || null;
  }, [selectedAddressId, user]);

  const deliveryFee = useMemo(() => {
    if (!selectedAddress?.neighborhood) return 0;
    const found = neighborhoods.find((item) => item.name === selectedAddress.neighborhood);
    return Number(found?.deliveryFee || 0);
  }, [selectedAddress, neighborhoods]);

  const total = cartSubtotal + deliveryFee;
  const showFloatingCartButton = cartCount > 0 && (view === "home" || view === "category");

  const updateCart = async (nextItems) => {
    if (!token) {
      setCartItems(nextItems);
      return;
    }

    const payload = nextItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      extras: (item.extras || []).map((extra) => getEntityId(extra)).filter(Boolean)
    }));

    const synced = await syncCart(payload, "replace");
    setCartItems(fromDbCart(synced));
  };

  const addToCart = async (product, quantityToAdd = 1, selectedExtraProducts = []) => {
    setError("");
    const safeQuantity = Number.isFinite(Number(quantityToAdd)) ? Number(quantityToAdd) : 1;
    const quantity = Math.max(1, safeQuantity);
    const normalizedExtras = normalizeExtrasSelection(selectedExtraProducts);
    const selectedMap = new Map(
      (selectedExtraProducts || [])
        .map((extra) => {
          const extraId = getEntityId(extra);
          if (!extraId) return null;

          return [extraId, {
            _id: extraId,
            name: extra?.name || extrasById.get(extraId)?.name || "Extra",
            price: Number(extra?.price ?? extrasById.get(extraId)?.price ?? 0),
            image: extra?.image || extrasById.get(extraId)?.image || ""
          }];
        })
        .filter(Boolean)
    );

    const nextExtras = normalizedExtras
      .map((extraId) => (
        selectedMap.get(extraId)
        || extrasById.get(extraId)
        || resolveExtraProduct(extraId)
        || { _id: extraId, name: "Extra", price: 0, image: "" }
      ));
    const targetKey = buildCartItemKey(product._id, normalizedExtras);
    const existing = cartItems.find((item) => buildCartItemKey(item.productId, item.extras) === targetKey);
    let next;

    if (existing) {
      next = cartItems.map((item) =>
        buildCartItemKey(item.productId, item.extras) === targetKey
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      next = [
        ...cartItems,
        {
          productId: product._id,
          quantity,
          product: {
            _id: product._id,
            name: product.name,
            price: product.price,
            image: product.image
          },
          extras: nextExtras
        }
      ];
    }

    try {
      await updateCart(next);
      await triggerMediumImpact();
      setSuccess(`${product.name} agregado al carrito`);
      setTimeout(() => setSuccess(""), 1600);
    } catch (cartError) {
      setError(cartError?.response?.data?.message || "No se pudo actualizar el carrito");
    }
  };

  const changeQuantity = async (productId, extras, delta) => {
    const targetKey = buildCartItemKey(productId, extras);
    const next = cartItems
      .map((item) => (
        buildCartItemKey(item.productId, item.extras) === targetKey
          ? { ...item, quantity: item.quantity + delta }
          : item
      ))
      .filter((item) => item.quantity > 0);

    try {
      await updateCart(next);
    } catch (cartError) {
      setError(cartError?.response?.data?.message || "No se pudo actualizar cantidad");
    }
  };

  const removeCartItem = async (productId, extras) => {
    const targetKey = buildCartItemKey(productId, extras);
    const next = cartItems.filter((item) => buildCartItemKey(item.productId, item.extras) !== targetKey);

    try {
      await updateCart(next);
    } catch (cartError) {
      setError(cartError?.response?.data?.message || "No se pudo eliminar el producto");
    }
  };

  const openCart = () => {
    setError("");
    setSuccess("");

    if (!cartItems.length) {
      setError("Tu carrito está vacío");
      return;
    }

    if (!token) {
      setView("auth");
      return;
    }

    if (user && !user.phone) {
      setView("complete-profile");
      setError("Debes registrar tu teléfono antes de continuar");
      return;
    }

    setCheckoutStep("cart");
    setView("checkout");
  };

  const clearAllCartItems = async () => {
    try {
      setError("");
      if (token) {
        await clearCart();
      }

      setCartItems([]);
    } catch (cartError) {
      setError(cartError?.response?.data?.message || "No se pudo limpiar el carrito");
    }
  };

  const openCategory = (categoryId) => {
    setActiveCategory(categoryId);
    setView("category");
  };

  const openProductDetail = (product) => {
    setSelectedProduct(product);
    setDetailQuantity(1);
    setSelectedExtras({});
    setView("product-detail");
  };

  const addSelectedProductToCart = async () => {
    if (!selectedProduct) return;
    const selectedExtraIds = Object.values(selectedExtras)
      .map((value) => getEntityId(value))
      .filter(Boolean);

    await addToCart(selectedProduct, detailQuantity, selectedExtraIds);
    setView("category");
  };

  const openHeroTarget = () => {
    if (!heroProduct) return;
    setActiveCategory(heroProduct.category?._id || heroProduct.category || "");
    setView("category");
  };

  const completeAuth = async (responseData) => {
    localStorage.setItem(TOKEN_KEY, responseData.token);
    setToken(responseData.token);
    setUser(responseData.user || null);
    setShowAuthForm(false);
    if (!responseData?.user?.phone) {
      setProfilePhone("");
      setView("complete-profile");
    } else {
      setView("checkout");
      setCheckoutStep("details");
    }
    setAuthForm({ firstName: "", lastName: "", phone: "", email: "", password: "" });
  };

  const submitProfilePhone = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setError("");

    const normalizedPhone = normalizePhone(profilePhone);
    if (!isValidColombianMobile(normalizedPhone)) {
      setProcessing(false);
      setError("Ingresa un celular colombiano válido (10 dígitos, empieza por 3)");
      return;
    }

    try {
      const updatedUser = await updateMe({ phone: normalizedPhone });
      setUser(updatedUser);
      setProfilePhone(updatedUser.phone || "");
      setSuccess("Teléfono guardado correctamente");
      setTimeout(() => setSuccess(""), 1800);

      if (cartItems.length) {
        setCheckoutStep("details");
        setView("checkout");
      } else {
        setView("home");
      }
    } catch (profileError) {
      setError(profileError?.response?.data?.message || "No se pudo guardar tu teléfono");
    } finally {
      setProcessing(false);
    }
  };

  const submitAccountPhone = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setError("");

    const normalizedPhone = normalizePhone(accountPhone);
    if (!isValidColombianMobile(normalizedPhone)) {
      setProcessing(false);
      setError("Ingresa un celular colombiano válido (10 dígitos, empieza por 3)");
      return;
    }

    try {
      const updatedUser = await updateMe({ phone: normalizedPhone });
      setUser(updatedUser);
      setAccountPhone(updatedUser.phone || "");
      setSuccess("Teléfono actualizado correctamente");
      setTimeout(() => setSuccess(""), 1800);
    } catch (profileError) {
      setError(profileError?.response?.data?.message || "No se pudo actualizar tu teléfono");
    } finally {
      setProcessing(false);
    }
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setError("");

    try {
      let responseData;

      if (authMode === "register") {
        responseData = await register({
          firstName: authForm.firstName,
          lastName: authForm.lastName,
          phone: authForm.phone,
          email: authForm.email,
          password: authForm.password,
          role: "customer"
        });
      } else {
        responseData = await login({ email: authForm.email, password: authForm.password });
      }

      await completeAuth(responseData);
    } catch (authError) {
      setError(authError?.response?.data?.message || "No se pudo autenticar");
    } finally {
      setProcessing(false);
    }
  };

  const saveAddress = async (event) => {
    event.preventDefault();

    if (!user?.phone) {
      setView("complete-profile");
      setError("Debes registrar tu teléfono antes de guardar dirección");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const created = await addAddress(addressForm);
      const profile = await me();
      setUser(profile);
      setSelectedAddressId(created._id);
      setShowNewAddressForm(false);
      setAddressForm({ label: "Casa", street: "", neighborhood: "", details: "" });
      setSuccess("Dirección agregada");
      setTimeout(() => setSuccess(""), 1800);
    } catch (addressError) {
      setError(addressError?.response?.data?.message || "No se pudo guardar la dirección");
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckoutAddressChange = (event) => {
    const nextValue = event.target.value;

    if (nextValue === NEW_ADDRESS_OPTION) {
      setShowNewAddressForm(true);
      setSelectedAddressId("");
      return;
    }

    setShowNewAddressForm(false);
    setSelectedAddressId(nextValue);
  };

  useEffect(() => {
    if (view !== "checkout" || checkoutStep !== "details") return;

    if (!(user?.addresses || []).length) {
      setShowNewAddressForm(true);
      setSelectedAddressId("");
    }
  }, [view, checkoutStep, user]);

  const submitCheckout = async (event) => {
    event.preventDefault();

    if (!user?.phone) {
      setView("complete-profile");
      setError("Debes registrar tu teléfono antes de continuar");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      if (!selectedAddressId) {
        throw new Error("Selecciona o crea una dirección para continuar");
      }

      if (!cartItems.length) {
        throw new Error("Tu carrito está vacío");
      }

      if (paymentMethod === "cash" && !String(cashPaymentAmount || "").trim()) {
        throw new Error("Indica con cuánto pagas para pedidos en efectivo");
      }

      await createOrder({
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          extras: (item.extras || []).map((extra) => getEntityId(extra)).filter(Boolean)
        })),
        addressId: selectedAddressId,
        paymentMethod,
        cashPaymentAmount: paymentMethod === "cash" ? String(cashPaymentAmount || "").trim() : "",
        customerComment: orderComment.trim()
      });

      if (token) {
        await clearCart();
      } else {
        localStorage.removeItem(GUEST_CART_KEY);
      }

      setCartItems([]);
      setOrderComment("");
      setCashPaymentAmount("");
      setCheckoutStep("cart");
      setView("home");
      await triggerMediumImpact();
      setSuccess("Pedido creado con éxito");
      setTimeout(() => setSuccess(""), 2500);
    } catch (checkoutError) {
      setError(checkoutError?.response?.data?.message || checkoutError.message || "No se pudo procesar el pago");
    } finally {
      setProcessing(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setIsSideMenuOpen(false);
    setView("home");
  };

  const openMyOrders = async () => {
    setLoadingOrders(true);
    setError("");

    try {
      const orders = await getMyOrders();
      const normalizedOrders = Array.isArray(orders) ? orders : [];
      setMyOrders(normalizedOrders);
      setView("my-orders");
      return normalizedOrders;
    } catch (ordersError) {
      setError(ordersError?.response?.data?.message || "No se pudieron cargar tus órdenes");
      return [];
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (!pendingNotificationNav?.openMyOrders) return;

    const pendingOrderId = pendingNotificationNav.orderId;

    const handleNotificationNavigation = async () => {
      const orders = await openMyOrders();

      if (pendingOrderId) {
        const selected = orders.find((order) => order?._id === pendingOrderId);
        if (selected) {
          setSelectedOrder(selected);
          setView("order-detail");
        }
      }

      setPendingNotificationNav(null);

      if (typeof window !== "undefined") {
        const cleanUrl = `${window.location.origin}/`;
        window.history.replaceState({}, "", cleanUrl);
      }
    };

    handleNotificationNavigation();
  }, [token, pendingNotificationNav]);

  const openOrderDetail = (order) => {
    setSelectedOrder(order);
    setView("order-detail");
  };

  const openMyCards = async () => {
    setLoadingCards(true);
    setError("");

    try {
      const cards = await getMyCards();
      setMyCards(Array.isArray(cards) ? cards : []);
      setView("my-cards");
    } catch (cardsError) {
      setError(cardsError?.response?.data?.message || "No se pudieron cargar tus tarjetas");
    } finally {
      setLoadingCards(false);
    }
  };

  const openMyAddresses = async () => {
    setError("");

    try {
      const profile = await me();
      setUser(profile);
      setAddressForm({ label: "Casa", street: "", neighborhood: "", details: "" });
      setView("my-addresses");
    } catch (addressError) {
      setError(addressError?.response?.data?.message || "No se pudieron cargar tus direcciones");
    }
  };

  const openAddCard = () => {
    setCardForm({ cardNumber: "", expMonth: "", expYear: "", cvc: "" });
    setView("add-card");
  };

  const submitAddCard = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setError("");

    try {
      await addMyCard({
        cardNumber: normalizeCardDigits(cardForm.cardNumber),
        expMonth: normalizeCardDigits(cardForm.expMonth).slice(0, 2),
        expYear: normalizeCardDigits(cardForm.expYear).slice(0, 4),
        cvc: normalizeCardDigits(cardForm.cvc).slice(0, 4)
      });

      const cards = await getMyCards();
      setMyCards(Array.isArray(cards) ? cards : []);
      setSuccess("Tarjeta agregada correctamente");
      setTimeout(() => setSuccess(""), 1800);
      setView("my-cards");
    } catch (cardError) {
      setError(cardError?.response?.data?.message || "No se pudo agregar la tarjeta");
    } finally {
      setProcessing(false);
    }
  };

  const openSideMenu = () => {
    setIsAddressPickerOpen(false);
    setIsSideMenuOpen(true);
  };

  const closeSideMenu = () => {
    setIsSideMenuOpen(false);
  };

  const handleHeaderAddressChange = async (addressId) => {
    setIsAddressPickerOpen(false);

    if (addressId === NEW_ADDRESS_OPTION) {
      await openMyAddresses();
      return;
    }

    setSelectedAddressId(addressId);
  };

  const onSideMenuSelect = (action) => {
    closeSideMenu();

    if (action === "logout") {
      logout();
      return;
    }

    if (action === "home") {
      setView("home");
      return;
    }

    if (action === "addresses") {
      if (!user?.phone) {
        setView("complete-profile");
        setError("Debes registrar tu teléfono antes de gestionar direcciones");
        return;
      }

      openMyAddresses();
      return;
    }

    if (action === "orders") {
      openMyOrders();
      return;
    }

    if (action === "cards") {
      openMyCards();
      return;
    }

    if (action === "stores") {
      setView("stores");
      return;
    }

    if (action === "account") {
      setAccountPhone(normalizePhone(user?.phone || ""));
      setView("account");
      setError("");
    }
  };

  useEffect(() => {
    if (!token) {
      setIsSideMenuOpen(false);
    }
  }, [token]);

  useEffect(() => {
    setIsAddressPickerOpen(false);
  }, [view, token]);

  const openRegister = () => {
    setAuthMode("register");
    setShowAuthForm(false);
    setView("register");
    setError("");
    setProfilePhone("");
  };

  const openLogin = () => {
    setAuthMode("login");
    setShowAuthForm(false);
    setView("login");
    setError("");
    setProfilePhone("");
  };

  useEffect(() => {
    if (view !== "register") return;
    if (!GOOGLE_CLIENT_ID) return;
    if (!googleButtonRef.current) return;

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: ({ credential }) => {
          googleCallbackRef.current?.(credential);
        }
      });

      googleButtonRef.current.innerHTML = "";

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signup_with",
        width: 320
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return;
    }

    const existingScript = document.getElementById("google-identity-script");
    if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.head.appendChild(script);
  }, [view]);

  return (
    <main className={`customer-app ${view === "register" ? "register-mode" : ""} ${view === "login" ? "login-mode" : ""}`}>
      {view === "auth" || view === "register" || view === "login" || view === "checkout" || view === "complete-profile" ? null : view === "category" || view === "product-detail" || view === "my-orders" || view === "order-detail" || view === "my-cards" || view === "my-addresses" || view === "add-card" || view === "stores" || view === "account" ? (
        <header className="top-bar products-top-bar">
          <button
            type="button"
            className="icon-btn back-btn"
            aria-label="Volver"
            onClick={() => {
              if (view === "product-detail") {
                setView("category");
                return;
              }

              if (view === "order-detail") {
                setView("my-orders");
                return;
              }

              if (view === "add-card") {
                setView("my-cards");
                return;
              }

              setView("home");
            }}
          >
            ←
          </button>
          <strong className="products-title">{view === "product-detail" ? "" : view === "my-orders" ? "Mis órdenes" : view === "order-detail" ? "Detalle" : view === "my-cards" ? "Mis tarjetas" : view === "my-addresses" ? "Mis direcciones" : view === "add-card" ? "Agregar tarjeta" : view === "stores" ? "Tiendas" : view === "account" ? "Mi cuenta" : "Productos"}</strong>
          {view === "product-detail" || view === "order-detail" || view === "my-cards" || view === "my-addresses" || view === "add-card" || view === "stores" || view === "account" ? <span /> : (
            <button type="button" className="icon-btn cart-btn" onClick={openCart} aria-label="Carrito">
              🛒
              {cartCount ? <em>{cartCount}</em> : null}
            </button>
          )}
        </header>
      ) : (
        <header className={`top-bar ${token ? "with-menu" : "guest"}`}>
          {token ? (
            <button type="button" className="icon-btn menu-btn" aria-label="Abrir menú" onClick={openSideMenu}>☰</button>
          ) : null}

          {token ? (
            selectedAddress ? (
              <div className="address-head">
                <strong>{selectedAddress.street}</strong>
                <button
                  type="button"
                  className="address-change-btn"
                  onClick={() => setIsAddressPickerOpen((current) => !current)}
                >
                  Cambiar dirección ▾
                </button>
              </div>
            ) : (
              <div className="brand-head with-menu">
                <strong>#LalaPasteleria</strong>
              </div>
            )
          ) : (
            <div className="brand-head">
              <strong>#LalaPasteleria</strong>
            </div>
          )}

          <button type="button" className="icon-btn cart-btn" onClick={openCart} aria-label="Carrito">
            🛒
            {cartCount ? <em>{cartCount}</em> : null}
          </button>
        </header>
      )}

      {token && isAddressPickerOpen ? (
        <>
          <button
            type="button"
            className="address-picker-backdrop"
            aria-label="Cerrar selector de dirección"
            onClick={() => setIsAddressPickerOpen(false)}
          />
          <section className="address-picker-panel" aria-label="Direcciones guardadas">
            {(user?.addresses || []).map((address) => (
              <button
                key={address._id}
                type="button"
                className={`address-picker-option ${selectedAddressId === address._id ? "active" : ""}`}
                onClick={() => handleHeaderAddressChange(address._id)}
              >
                <strong>{address.label || "Dirección"}</strong>
                <span>{address.street} ({address.neighborhood})</span>
              </button>
            ))}

            <button
              type="button"
              className="address-picker-option add-new"
              onClick={() => handleHeaderAddressChange(NEW_ADDRESS_OPTION)}
            >
              + Agregar nueva dirección
            </button>
          </section>
        </>
      ) : null}

      {token && isSideMenuOpen ? (
        <>
          <button type="button" className="side-menu-backdrop" aria-label="Cerrar menú" onClick={closeSideMenu} />
          <aside className="side-menu-panel" aria-label="Menú de opciones">
            <img className="side-menu-logo" src="/assets/watamilogonegro.png" alt="Lala Pasteleria" />

            <nav className="side-menu-list">
              <button type="button" onClick={() => onSideMenuSelect("home")}><span>🏠</span><strong>Inicio</strong></button>
              <button type="button" onClick={() => onSideMenuSelect("orders")}><span>📦</span><strong>Mis ordenes</strong></button>
              <button type="button" onClick={() => onSideMenuSelect("cards")}><span>💳</span><strong>Mis tarjetas</strong></button>
              <button type="button" onClick={() => onSideMenuSelect("addresses")}><span>📍</span><strong>Mis direcciones</strong></button>
              <button type="button" onClick={() => onSideMenuSelect("stores")}><span>🏬</span><strong>Tiendas</strong></button>
              <button type="button" onClick={() => onSideMenuSelect("account")}><span>👤</span><strong>Mi cuenta</strong></button>
              <button type="button" onClick={() => onSideMenuSelect("logout")}><span>⨯</span><strong>Cerrar sesion</strong></button>
            </nav>
          </aside>
        </>
      ) : null}

      {error ? (
        <div className="alert error alert-with-close" role="alert">
          <span>{error}</span>
          <button type="button" className="alert-dismiss" aria-label="Cerrar mensaje" onClick={() => setError("")}>×</button>
        </div>
      ) : null}
      {success ? (
        <div className="alert success alert-with-close" role="status">
          <span>{success}</span>
          <button type="button" className="alert-dismiss" aria-label="Cerrar mensaje" onClick={() => setSuccess("")}>×</button>
        </div>
      ) : null}

      {showFloatingCartButton ? (
        <button type="button" className="floating-cart-btn" onClick={openCart}>
          Ver carrito ({cartCount})
        </button>
      ) : null}

      {view === "home" ? (
        <>
          <button
            type="button"
            className={`hero-banner ${heroProduct ? "clickable" : ""}`}
            onClick={openHeroTarget}
            disabled={!heroProduct}
          >
            {heroConfig.image ? <img className="hero-image" src={heroConfig.image} alt="Hero promoción" /> : null}
            <div className="hero-overlay">
              <h1 style={{ color: heroConfig.titleColor === "black" ? "#111827" : "#ffffff" }}>
                {heroConfig.title || "LALA PASTELERIA"}
              </h1>
              <p style={{ color: heroConfig.subtitleColor === "black" ? "#111827" : "#ffffff" }}>
                {heroConfig.subtitle || (heroProduct
                  ? `${heroProduct.name} · Toca para ver producto`
                  : "Elige tu categoría favorita y arma tu pedido")}
              </p>
            </div>
          </button>

          <section className="section-head">
            <h2>Categorías</h2>
          </section>

          {loading ? <p className="muted">Cargando menú...</p> : null}

          <section className="category-grid">
            {categories.map((category) => (
              <button
                key={category._id}
                type="button"
                className={`category-card ${activeCategory === category._id ? "active" : ""}`}
                onClick={() => openCategory(category._id)}
              >
                <img src={category.image || "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=60"} alt={category.name} />
                <strong>{category.name}</strong>
              </button>
            ))}
          </section>
        </>
      ) : null}

      {view === "category" ? (
        <section className="products-page">
          <p className="products-page-category">{activeCategoryName}</p>

          <div className="products-list">
            {visibleProducts.map((product) => (
              <button
                key={product._id}
                type="button"
                className="product-list-item"
                onClick={() => openProductDetail(product)}
              >
                <img
                  src={product.image || "https://images.unsplash.com/photo-1548365328-9f547fb0953d?auto=format&fit=crop&w=800&q=60"}
                  alt={product.name}
                />
                <div className="product-list-copy">
                  <h3>{product.name}</h3>
                  <p>{product.description || "Producto disponible"}</p>
                  <strong>{MONEY.format(product.price)}</strong>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {view === "product-detail" && selectedProduct ? (
        <section className="product-detail-page">
          <img
            className="product-detail-image"
            src={selectedProduct.image || "https://images.unsplash.com/photo-1548365328-9f547fb0953d?auto=format&fit=crop&w=1200&q=60"}
            alt={selectedProduct.name}
          />

          <article className="product-detail-copy">
            <h2>{selectedProduct.name}</h2>
            <p>{selectedProduct.description || "Producto disponible"}</p>
          </article>

          {normalizedExtras.map((group) => (
            <article key={group._id} className="product-extra-group">
              <h3>{group.name || "Acompaña con una refrescante bebida"}</h3>
              <div className="product-extra-options">
                {group.products.map((extraProduct) => (
                  <label key={`${group._id}-${extraProduct._id}`} className="product-extra-option">
                    <input
                      type="radio"
                      name={`extra-${group._id}`}
                      checked={getEntityId(selectedExtras[group._id]) === getEntityId(extraProduct._id)}
                      onChange={() => setSelectedExtras((current) => ({ ...current, [group._id]: getEntityId(extraProduct._id) }))}
                    />
                    <span>{extraProduct.name}</span>
                    <strong>{MONEY.format(Number(extraProduct.price || 0))}</strong>
                  </label>
                ))}
              </div>
            </article>
          ))}

          <article className="product-comment-group">
            <h3>Comentarios</h3>
            <textarea
              placeholder="Ej: sin cebolla, poco picante, etc."
              value={orderComment}
              onChange={(event) => setOrderComment(event.target.value)}
            />
          </article>

          <div className="product-detail-footer">
            <div className="detail-qty-controls">
              <button type="button" onClick={() => setDetailQuantity((current) => Math.max(1, current - 1))}>-</button>
              <span>{detailQuantity}</span>
              <button type="button" onClick={() => setDetailQuantity((current) => current + 1)}>+</button>
            </div>
            <button type="button" className="detail-add-btn" onClick={addSelectedProductToCart}>
              Agregar {MONEY.format((Number(selectedProduct.price || 0) + selectedDetailExtrasTotal) * detailQuantity)}
            </button>
          </div>
        </section>
      ) : null}

      {view === "my-orders" ? (
        <section className="my-orders-page">
          {loadingOrders ? <p className="muted">Cargando tus órdenes...</p> : null}

          {!loadingOrders && !myOrders.length ? (
            <article className="orders-empty">
              <h3>Aún no tienes pedidos</h3>
              <p>Explora tiendas y haz tu primera orden 🍣</p>
            </article>
          ) : null}

          <div className="orders-list">
            {myOrders.map((order) => {
              const statusMeta = getOrderStatusMeta(order.status);
              return (
                <article key={order._id} className="order-card">
                  <div className="order-card-top">
                    <h3>Lala Pasteleria</h3>
                    <span className={`order-status ${statusMeta.tone}`}>{statusMeta.label}</span>
                  </div>

                  <div className="order-card-meta">
                    <p>📅 {DATE_FORMAT.format(new Date(order.createdAt))}</p>
                    <p>💰 {MONEY.format(Number(order.total || 0))}</p>
                  </div>

                  <button type="button" className="order-detail-btn" onClick={() => openOrderDetail(order)}>Ver detalle</button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {view === "my-cards" ? (
        <section className="my-cards-page">
          {loadingCards ? <p className="muted">Cargando tus tarjetas...</p> : null}

          {!loadingCards && !myCards.length ? (
            <div className="cards-empty-wrap">
              <div className="cards-empty-icon" aria-hidden="true">
                <span />
                <small />
              </div>
              <p>No tienes tarjetas registradas</p>
            </div>
          ) : null}

          {myCards.length ? (
            <div className="cards-list">
              {myCards.map((card) => (
                <article key={card._id} className="saved-card-item">
                  <strong>{card.brand || "CARD"}</strong>
                  <p>{card.maskedNumber || `**** **** **** ${card.last4}`}</p>
                  <span>Vence {card.expMonth}/{String(card.expYear || "").slice(-2)}</span>
                </article>
              ))}
            </div>
          ) : null}

          <button type="button" className="cards-primary-btn" onClick={openAddCard}>Agregar tarjetas</button>
        </section>
      ) : null}

      {view === "my-addresses" ? (
        <section className="my-addresses-page">
          {!user?.addresses?.length ? (
            <article className="orders-empty">
              <h3>No tienes direcciones registradas</h3>
              <p>Agrega una dirección para agilizar tu pedido.</p>
            </article>
          ) : null}

          {(user?.addresses || []).length ? (
            <div className="addresses-list">
              {(user?.addresses || []).map((address) => (
                <article key={address._id} className="saved-address-item">
                  <strong>{address.label || "Dirección"}</strong>
                  <p>{address.street}</p>
                  <span>{address.neighborhood}</span>
                  {address.details ? <small>{address.details}</small> : null}
                </article>
              ))}
            </div>
          ) : null}

          <article className="checkout-card">
            <h3>Agregar nueva dirección</h3>
            <form className="address-form" onSubmit={saveAddress}>
              <input
                placeholder="Etiqueta (Casa, Oficina...)"
                value={addressForm.label}
                onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))}
                required
              />
              <input
                placeholder="Dirección"
                value={addressForm.street}
                onChange={(event) => setAddressForm((current) => ({ ...current, street: event.target.value }))}
                required
              />
              <select
                value={addressForm.neighborhood}
                onChange={(event) => setAddressForm((current) => ({ ...current, neighborhood: event.target.value }))}
                required
              >
                <option value="">Selecciona barrio</option>
                {neighborhoods.map((item) => (
                  <option key={item._id} value={item.name}>{item.name}</option>
                ))}
              </select>
              <input
                placeholder="Detalles adicionales"
                value={addressForm.details}
                onChange={(event) => setAddressForm((current) => ({ ...current, details: event.target.value }))}
              />
              <button type="submit" disabled={processing}>{processing ? "Guardando..." : "Guardar dirección"}</button>
            </form>
          </article>
        </section>
      ) : null}

      {view === "add-card" ? (
        <section className="add-card-page">
          <h2>Ingresa los datos de tu tarjeta</h2>

          <form className="add-card-form" onSubmit={submitAddCard}>
            <input
              placeholder="Número de tarjeta"
              inputMode="numeric"
              value={formatCardDisplay(cardForm.cardNumber)}
              onChange={(event) => setCardForm((current) => ({
                ...current,
                cardNumber: normalizeCardDigits(event.target.value).slice(0, 19)
              }))}
              required
            />

            <div className="card-mini-grid">
              <input
                placeholder="mes"
                inputMode="numeric"
                value={cardForm.expMonth}
                onChange={(event) => setCardForm((current) => ({
                  ...current,
                  expMonth: normalizeCardDigits(event.target.value).slice(0, 2)
                }))}
                required
              />
              <input
                placeholder="año"
                inputMode="numeric"
                value={cardForm.expYear}
                onChange={(event) => setCardForm((current) => ({
                  ...current,
                  expYear: normalizeCardDigits(event.target.value).slice(0, 4)
                }))}
                required
              />
              <input
                placeholder="CVC"
                inputMode="numeric"
                value={cardForm.cvc}
                onChange={(event) => setCardForm((current) => ({
                  ...current,
                  cvc: normalizeCardDigits(event.target.value).slice(0, 4)
                }))}
                required
              />
            </div>

            <button type="submit" className="cards-primary-btn" disabled={processing}>{processing ? "Guardando..." : "Agregar tarjeta"}</button>
          </form>
        </section>
      ) : null}

      {view === "stores" ? (
        <section className="stores-page">
          {(stores || []).map((store) => (
            <article key={store._id || `${store.name}-${store.address}`} className="store-row">
              <div className="store-copy">
                <h3>{store.name}</h3>
                <p>{store.address}</p>
                <p>{store.city}</p>
                <p className="store-hours">Domingo - Jueves: {store.sunThuOpensAt} - {store.sunThuClosesAt}.&nbsp; Viernes - Sábado: {store.friSatOpensAt} - {store.friSatClosesAt}</p>
              </div>
              <button
                type="button"
                className="store-call-btn"
                aria-label={`Llamar a ${store.name}`}
                onClick={() => {
                  const cleanPhone = String(store.phone || "").replace(/[^\d+]/g, "");
                  if (!cleanPhone) return;
                  window.location.href = `tel:${cleanPhone}`;
                }}
                disabled={!store.phone}
              >
                📞
              </button>
            </article>
          ))}

          {!stores.length ? <p className="muted">No hay tiendas configuradas.</p> : null}
        </section>
      ) : null}

      {view === "order-detail" && selectedOrder ? (
        <section className="order-detail-page">
          <article className="order-detail-card">
            <h3>Estado</h3>
            <p className={`order-status big ${getOrderStatusMeta(selectedOrder.status).tone}`}>{getOrderStatusMeta(selectedOrder.status).label}</p>
          </article>

          <article className="order-detail-card">
            <h3>Resumen</h3>
            <p><strong>Fecha:</strong> {DATE_FORMAT.format(new Date(selectedOrder.createdAt))}</p>
            <p><strong>Total:</strong> {MONEY.format(Number(selectedOrder.total || 0))}</p>
            <p><strong>Método de pago:</strong> {selectedOrder.paymentMethod === "cash" ? "Efectivo" : selectedOrder.paymentMethod === "card" ? "Tarjeta" : "PSE"}</p>
          </article>

          <article className="order-detail-card">
            <h3>Dirección</h3>
            <p>{selectedOrder.address?.street || "Sin dirección"}</p>
            <p>{selectedOrder.address?.neighborhood || ""}</p>
          </article>

          <article className="order-detail-card">
            <h3>Productos</h3>
            <ul className="order-detail-items">
              {(selectedOrder.items || []).map((item) => (
                <li key={item._id || `${item.product?._id || item.product}-${item.quantity}`}>
                  <span>{item.quantity}x {item.product?.name || "Producto"}</span>
                  <strong>{MONEY.format((Number(item.price || 0) + (item.extras || []).reduce((sum, extra) => sum + Number(extra.price || 0), 0)) * Number(item.quantity || 0))}</strong>
                </li>
              ))}
            </ul>
          </article>

          <article className="order-detail-card">
            <h3>Teléfono tienda</h3>
            <p>No disponible</p>
          </article>
        </section>
      ) : null}

      {view === "checkout" ? (
        checkoutStep === "cart" ? (
          <section className="cart-screen">
            <header className="cart-screen-header">
              <button type="button" className="icon-btn back-btn" onClick={() => setView("home")} aria-label="Volver">←</button>
              <h2>Carrito</h2>
              <button type="button" className="icon-btn" onClick={clearAllCartItems} aria-label="Vaciar carrito">🗑️</button>
            </header>

            <section className="cart-screen-list">
              {cartItems.map((item) => (
                <article key={buildCartItemKey(item.productId, item.extras)} className="cart-screen-item">
                  <img src={item.product.image || "https://images.unsplash.com/photo-1548365328-9f547fb0953d?auto=format&fit=crop&w=800&q=60"} alt={item.product.name} />
                  <div className="cart-screen-copy">
                    <button
                      type="button"
                      className="cart-item-remove"
                      onClick={() => removeCartItem(item.productId, item.extras)}
                      aria-label={`Quitar ${item.product.name} del carrito`}
                    >
                      ×
                    </button>
                    <strong>{item.product.name}</strong>
                    <p>{MONEY.format(Number(item.product.price || 0))}</p>
                    {(item.extras || []).length ? (
                      <small className="cart-item-extras">
                        {item.extras
                          .map((extra) => resolveExtraProduct(extra) || { _id: getEntityId(extra), name: "Extra" })
                          .map((extra) => extra.name)
                          .join(" · ")}
                      </small>
                    ) : null}
                  </div>
                  <div className="cart-screen-qty">
                    <button type="button" onClick={() => changeQuantity(item.productId, item.extras, -1)}>-</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => changeQuantity(item.productId, item.extras, 1)}>+</button>
                  </div>
                </article>
              ))}
              {!cartItems.length ? <p className="muted">Tu carrito está vacío</p> : null}
            </section>

            <footer className="cart-screen-footer">
              <div className="summary-row"><span>Domicilio</span><strong>{MONEY.format(deliveryFee)}</strong></div>
              <div className="summary-row"><span>Subtotal</span><strong>{MONEY.format(cartSubtotal)}</strong></div>
              <div className="summary-row total"><span>Total</span><strong>{MONEY.format(total)}</strong></div>
              <button type="button" disabled={!cartItems.length} onClick={() => setCheckoutStep("details")}>Continuar</button>
            </footer>
          </section>
        ) : (
          <section className="checkout-wrap">
            <div className="section-head">
              <h2>Resumen de la orden:</h2>
              <button type="button" onClick={() => setCheckoutStep("cart")}>Volver al carrito</button>
            </div>

            <article className="checkout-card">
              <h3>Dirección de entrega</h3>
              <select
                value={showNewAddressForm ? NEW_ADDRESS_OPTION : selectedAddressId}
                onChange={handleCheckoutAddressChange}
              >
                <option value="">Selecciona una dirección</option>
                {(user?.addresses || []).map((address) => (
                  <option key={address._id} value={address._id}>
                    {address.label} - {address.street} ({address.neighborhood})
                  </option>
                ))}
                <option value={NEW_ADDRESS_OPTION}>Agregar nueva dirección</option>
              </select>

              {showNewAddressForm ? (
                <form className="address-form" onSubmit={saveAddress}>
                  <input
                    placeholder="Etiqueta (Casa, Oficina...)"
                    value={addressForm.label}
                    onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))}
                    required
                  />
                  <input
                    placeholder="Dirección"
                    value={addressForm.street}
                    onChange={(event) => setAddressForm((current) => ({ ...current, street: event.target.value }))}
                    required
                  />
                  <select
                    value={addressForm.neighborhood}
                    onChange={(event) => setAddressForm((current) => ({ ...current, neighborhood: event.target.value }))}
                    required
                  >
                    <option value="">Selecciona barrio</option>
                    {neighborhoods.map((item) => (
                      <option key={item._id} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Detalles adicionales"
                    value={addressForm.details}
                    onChange={(event) => setAddressForm((current) => ({ ...current, details: event.target.value }))}
                  />
                  <button type="submit" disabled={processing}>Guardar dirección</button>
                </form>
              ) : null}
            </article>

            <form className="checkout-card" onSubmit={submitCheckout}>
              <h3>Pago</h3>
              <select
                value={paymentMethod}
                onChange={(event) => {
                  const nextMethod = event.target.value;
                  setPaymentMethod(nextMethod);
                  if (nextMethod !== "cash") {
                    setCashPaymentAmount("");
                  }
                }}
              >
                <option value="cash">Efectivo</option>
                <option value="dataphone">Datafono</option>
                <option value="card">Tarjeta</option>
                <option value="pse">PSE</option>
              </select>

              {paymentMethod === "cash" ? (
                <input
                  type="text"
                  inputMode="text"
                  placeholder="¿Con cuanto pagas?"
                  value={cashPaymentAmount}
                  onChange={(event) => setCashPaymentAmount(event.target.value)}
                />
              ) : null}

              <label htmlFor="checkoutComment">Comentarios</label>
              <textarea
                id="checkoutComment"
                placeholder="Instrucciones para tu pedido"
                value={orderComment}
                onChange={(event) => setOrderComment(event.target.value)}
              />

              <div className="summary-row"><span>Subtotal</span><strong>{MONEY.format(cartSubtotal)}</strong></div>
              <div className="summary-row"><span>Domicilio</span><strong>{MONEY.format(deliveryFee)}</strong></div>
              <div className="summary-row total"><span>Total</span><strong>{MONEY.format(total)}</strong></div>

              <button type="submit" disabled={processing}>Pagar ahora</button>
            </form>

            {token ? <button type="button" className="logout-link" onClick={logout}>Cerrar sesión</button> : null}
          </section>
        )
      ) : null}

      {view === "auth" ? (
        <section className="auth-page">
          <button
            type="button"
            className="auth-page-back"
            aria-label="Volver"
            onClick={() => {
              setShowAuthForm(false);
              setView("home");
            }}
          >
            ←
          </button>

          <div className="auth-page-logo-wrap">
            <img className="auth-page-logo-image" src="/assets/watamilogo.png" alt="Lala Pasteleria" />
          </div>

          <div className="auth-page-actions">
            <button type="button" className="auth-page-register" onClick={openRegister}>Registrarse</button>
            <button type="button" className="auth-page-login" onClick={openLogin}>Iniciar sesión</button>
          </div>

          {showAuthForm ? (
            <div className="auth-sheet">
              <h3>{authMode === "register" ? "Crear cuenta" : "Iniciar sesión"}</h3>
              <form onSubmit={submitAuth} className="auth-form">
                {authMode === "register" ? (
                  <>
                    <input
                      placeholder="Nombre"
                      value={authForm.firstName}
                      onChange={(event) => setAuthForm((current) => ({ ...current, firstName: event.target.value }))}
                      required
                    />
                    <input
                      placeholder="Apellido"
                      value={authForm.lastName}
                      onChange={(event) => setAuthForm((current) => ({ ...current, lastName: event.target.value }))}
                      required
                    />
                    <input
                      placeholder="Teléfono"
                      value={authForm.phone}
                      onChange={(event) => setAuthForm((current) => ({ ...current, phone: event.target.value }))}
                      required
                    />
                  </>
                ) : null}

                <input
                  type="email"
                  placeholder="Email"
                  value={authForm.email}
                  onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
                <button type="submit" disabled={processing}>{processing ? "Procesando..." : "Continuar"}</button>
              </form>
            </div>
          ) : null}
        </section>
      ) : null}

      {view === "register" ? (
        <section className="register-page">
          <button
            type="button"
            className="register-page-back"
            aria-label="Volver"
            onClick={() => {
              setView("auth");
              setError("");
            }}
          >
            ←
          </button>

          <h2>Registrar usuario</h2>

          <form onSubmit={submitAuth} className="register-form">
            <input
              placeholder="Nombres"
              value={authForm.firstName}
              onChange={(event) => setAuthForm((current) => ({ ...current, firstName: event.target.value }))}
              required
            />
            <input
              placeholder="Apellidos"
              value={authForm.lastName}
              onChange={(event) => setAuthForm((current) => ({ ...current, lastName: event.target.value }))}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
            <input
              placeholder="Teléfono"
              value={authForm.phone}
              onChange={(event) => setAuthForm((current) => ({ ...current, phone: event.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={authForm.password}
              onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
              required
            />

            <button type="submit" disabled={processing}>{processing ? "Procesando..." : "Registrarse"}</button>
          </form>

          <div className="register-google-wrap">
            <p className="register-google-label">o regístrate con</p>
            {GOOGLE_CLIENT_ID ? (
              <div className="register-google-button" ref={googleButtonRef} />
            ) : (
              <button type="button" className="register-google-unavailable" disabled>Google no configurado</button>
            )}
          </div>

          <img className="register-page-logo" src="/assets/watamilogonegro.png" alt="Lala Pasteleria" />
        </section>
      ) : null}

      {view === "complete-profile" ? (
        <section className="complete-profile-page">
          <button
            type="button"
            className="complete-profile-back"
            aria-label="Volver"
            onClick={() => {
              setView("home");
              setError("");
            }}
          >
            ←
          </button>

          <h2>Completa tu perfil</h2>
          <p>Necesitamos tu celular para que el domiciliario pueda contactarte al llegar.</p>

          <form onSubmit={submitProfilePhone} className="complete-profile-form">
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Ej: 3001234567"
              value={profilePhone}
              onChange={(event) => setProfilePhone(normalizePhone(event.target.value))}
              maxLength={10}
              required
            />

            <button type="submit" disabled={processing}>{processing ? "Guardando..." : "Guardar teléfono"}</button>
          </form>
        </section>
      ) : null}

      {view === "account" ? (
        <section className="account-page">
          <article className="account-card">
            <h2>Datos del usuario</h2>

            <div className="account-row"><strong>Nombres:</strong><span>{user?.firstName || "No registrado"}</span></div>
            <div className="account-row"><strong>Apellidos:</strong><span>{user?.lastName || "No registrado"}</span></div>
            <div className="account-row"><strong>Email:</strong><span>{user?.email || "No registrado"}</span></div>
            <div className="account-row"><strong>Teléfono:</strong><span>{user?.phone || "No registrado"}</span></div>
            <div className="account-row"><strong>Ciudad:</strong><span>{user?.city || "No registrada"}</span></div>

            <form className="account-phone-form" onSubmit={submitAccountPhone}>
              <label htmlFor="account-phone">Modificar teléfono</label>
              <input
                id="account-phone"
                type="tel"
                inputMode="numeric"
                placeholder="Ej: 3001234567"
                value={accountPhone}
                onChange={(event) => setAccountPhone(normalizePhone(event.target.value))}
                maxLength={10}
                required
              />
              <button type="submit" disabled={processing}>{processing ? "Guardando..." : "Guardar teléfono"}</button>
            </form>
          </article>
        </section>
      ) : null}

      {view === "login" ? (
        <section className="login-page">
          <button
            type="button"
            className="login-page-back"
            aria-label="Volver"
            onClick={() => {
              setView("auth");
              setError("");
            }}
          >
            ←
          </button>

          <h2>Iniciar sesión</h2>

          <form onSubmit={submitAuth} className="login-form">
            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={authForm.password}
              onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
              required
            />

            <button type="submit" disabled={processing}>{processing ? "Procesando..." : "Iniciar sesión"}</button>
          </form>

          <button type="button" className="login-recover-button">Recuperar contraseña</button>
          <img className="login-page-logo" src="/assets/watamilogonegro.png" alt="Lala Pasteleria" />
        </section>
      ) : null}

      <footer className="legal-footer">
        <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy Policy</a>
        <span>·</span>
        <a href="/contact.html" target="_blank" rel="noreferrer">Contact</a>
      </footer>
    </main>
  );
}
