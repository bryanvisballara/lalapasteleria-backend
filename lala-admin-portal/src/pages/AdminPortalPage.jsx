import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";
import { getOrders } from "../api/orders";
import {
  createCategory,
  createNeighborhood,
  createProduct,
  deleteCategory,
  deleteNeighborhood,
  deleteProduct,
  getCategories,
  getNeighborhoods,
  getProducts,
  getRestaurantConfig,
  sendPushCampaign,
  updateCategory,
  updateNeighborhood,
  updateProduct,
  updateRestaurantConfig
} from "../api/admin";
import { MONEY } from "../utils/printComanda";
import LogoutFab from "../components/LogoutFab";
import AdminSidebar from "../components/AdminSidebar";
import CustomerDatabasePanel from "../components/CustomerDatabasePanel";
import ImpulsaPanel from "../components/ImpulsaPanel";
import RecipeBookPanel from "../components/RecipeBookPanel";
import BillingPanel from "../components/BillingPanel";
import AccountingPanel from "../components/AccountingPanel";

const SIDEBAR_SECTIONS = [
  {
    title: "OPERACIONES",
    tabs: [
      { key: "database", label: "Base de datos" },
      { key: "impulsa", label: "IMPULSA" },
      { key: "recipes", label: "Recetario" },
      { key: "billing", label: "Facturación" },
      { key: "accounting", label: "Contabilidad" }
    ]
  },
  {
    title: "APP",
    tabs: [
      { key: "metrics", label: "Métricas" },
      { key: "marketing", label: "Marketing" },
      { key: "hero", label: "Hero" },
      { key: "schedule", label: "Horario" },
      { key: "stores", label: "Tiendas" },
      { key: "extras", label: "Extras" },
      { key: "categories", label: "Categorías" },
      { key: "products", label: "Productos" },
      { key: "delivery", label: "Domicilios" }
    ]
  }
];

const ALL_TABS = SIDEBAR_SECTIONS.flatMap((section) => section.tabs);

const WEEK_DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" }
];

const defaultWeeklySchedule = {
  monday: { enabled: true, opensAt: "12:00", closesAt: "22:00" },
  tuesday: { enabled: true, opensAt: "12:00", closesAt: "22:00" },
  wednesday: { enabled: true, opensAt: "12:00", closesAt: "22:00" },
  thursday: { enabled: true, opensAt: "12:00", closesAt: "22:00" },
  friday: { enabled: true, opensAt: "12:00", closesAt: "22:00" },
  saturday: { enabled: true, opensAt: "12:00", closesAt: "22:00" },
  sunday: { enabled: true, opensAt: "12:00", closesAt: "22:00" }
};

const cloneWeeklySchedule = (source = {}) => {
  return {
    monday: { ...defaultWeeklySchedule.monday, ...(source.monday || {}) },
    tuesday: { ...defaultWeeklySchedule.tuesday, ...(source.tuesday || {}) },
    wednesday: { ...defaultWeeklySchedule.wednesday, ...(source.wednesday || {}) },
    thursday: { ...defaultWeeklySchedule.thursday, ...(source.thursday || {}) },
    friday: { ...defaultWeeklySchedule.friday, ...(source.friday || {}) },
    saturday: { ...defaultWeeklySchedule.saturday, ...(source.saturday || {}) },
    sunday: { ...defaultWeeklySchedule.sunday, ...(source.sunday || {}) }
  };
};

const emptyCategory = { id: "", name: "", image: "", active: true };
const emptyProduct = {
  id: "",
  name: "",
  description: "",
  price: "",
  hasSizes: false,
  sizes: [],
  image: "",
  category: "",
  available: true
};
const emptyNeighborhood = { id: "", name: "", deliveryFee: "", active: true };
const emptyExtra = { id: "", name: "", products: [] };
const emptyStore = {
  id: "",
  name: "",
  address: "",
  city: "Barranquilla",
  phone: "",
  sunThuOpensAt: "11:00",
  sunThuClosesAt: "23:00",
  friSatOpensAt: "11:00",
  friSatClosesAt: "00:00"
};

const startOfDay = (baseDate) => {
  const nextDate = new Date(baseDate);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const addDays = (baseDate, days) => {
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const buildDateKey = (dateValue) => {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getWeekDayLabel = (dateValue) => {
  return dateValue.toLocaleDateString("es-CO", { weekday: "short" });
};

const normalizeProductSizes = (sizes = []) => {
  return (Array.isArray(sizes) ? sizes : [])
    .map((size) => ({
      name: typeof size?.name === "string" ? size.name.trim() : "",
      price: Number(size?.price)
    }))
    .filter((size) => size.name && Number.isFinite(size.price) && size.price >= 0);
};

const getProductDisplayPrice = (product) => {
  const sizes = normalizeProductSizes(product?.sizes || []);

  if (sizes.length > 0) {
    const minPrice = Math.min(...sizes.map((size) => size.price));
    return `Desde ${MONEY.format(minPrice)}`;
  }

  return MONEY.format(Number(product?.price || 0));
};

const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

const getWeekStart = (dateValue) => {
  const nextDate = startOfDay(dateValue);
  const day = nextDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  nextDate.setDate(nextDate.getDate() + diffToMonday);
  return nextDate;
};

const formatDateShort = (dateValue) => {
  return dateValue.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short"
  });
};

const downloadWorkbook = (fileName, sheetName, rows) => {
  const workbook = XLSX.utils.book_new();
  const safeRows = rows.length ? rows : [{ Mensaje: "Sin datos" }];
  const worksheet = XLSX.utils.json_to_sheet(safeRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export default function AdminPortalPage() {
  const { token, user, logout } = useAuth();
  const categoryImageInputRef = useRef(null);
  const productImageInputRef = useRef(null);
  const heroImageInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("database");
  const [metricDetailView, setMetricDetailView] = useState("overview");
  const [selectedHistoryYear, setSelectedHistoryYear] = useState("");
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState("");
  const [selectedHistoryWeek, setSelectedHistoryWeek] = useState("");
  const [selectedHistoryDay, setSelectedHistoryDay] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingCategoryOrder, setSavingCategoryOrder] = useState(false);
  const [savingHero, setSavingHero] = useState(false);

  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [restaurantConfig, setRestaurantConfig] = useState({
    isOpen: true,
    opensAt: "12:00",
    closesAt: "22:00",
    weeklySchedule: cloneWeeklySchedule(),
    heroImage: "",
    heroProduct: "",
    heroTitle: "LALA PASTELERIA",
    heroSubtitle: "Elige tu categoría favorita y arma tu pedido",
    heroTitleColor: "white",
    heroSubtitleColor: "white",
    extras: [],
    stores: []
  });

  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [neighborhoodForm, setNeighborhoodForm] = useState(emptyNeighborhood);
  const [extraForm, setExtraForm] = useState(emptyExtra);
  const [storeForm, setStoreForm] = useState(emptyStore);
  const [marketingForm, setMarketingForm] = useState({ title: "", message: "" });

  const loadData = async () => {
    try {
      setError("");
      const [ordersData, categoriesData, productsData, neighborhoodsData, configData] = await Promise.all([
        getOrders(),
        getCategories(),
        getProducts(),
        getNeighborhoods(),
        getRestaurantConfig()
      ]);

      setOrders(ordersData);
      setCategories(categoriesData);
      setProducts(productsData);
      setNeighborhoods(neighborhoodsData);
      setRestaurantConfig({
        isOpen: configData?.isOpen ?? true,
        opensAt: configData?.opensAt || "12:00",
        closesAt: configData?.closesAt || "22:00",
        weeklySchedule: cloneWeeklySchedule(configData?.weeklySchedule),
        heroImage: configData?.heroImage || "",
        heroProduct: configData?.heroProduct?._id || configData?.heroProduct || "",
        heroTitle: configData?.heroTitle || "LALA PASTELERIA",
        heroSubtitle: configData?.heroSubtitle || "Elige tu categoría favorita y arma tu pedido",
        heroTitleColor: configData?.heroTitleColor || "white",
        heroSubtitleColor: configData?.heroSubtitleColor || "white",
        stores: (configData?.stores || []).map((store) => ({
          _id: store?._id,
          name: store?.name || "",
          address: store?.address || "",
          city: store?.city || "",
          phone: store?.phone || "",
          sunThuOpensAt: store?.sunThuOpensAt || "11:00",
          sunThuClosesAt: store?.sunThuClosesAt || "23:00",
          friSatOpensAt: store?.friSatOpensAt || "11:00",
          friSatClosesAt: store?.friSatClosesAt || "00:00"
        })),
        extras: (configData?.extras || []).map((extra) => ({
          _id: extra?._id,
          name: extra?.name || "",
          products: (extra?.products || []).map((product) => product?._id || product).filter(Boolean)
        }))
      });
    } catch (loadError) {
      setError(loadError?.response?.data?.message || "No se pudo cargar el portal administrativo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    loadData();
  }, [token]);

  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === "delivered"),
    [orders]
  );

  const metrics = useMemo(() => {
    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = addDays(dayStart, -6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const sumTotals = (items) => items.reduce((accumulator, order) => accumulator + Number(order.total || 0), 0);

    const completedToday = completedOrders.filter((order) => new Date(order.createdAt) >= dayStart);
    const daySales = sumTotals(completedToday);
    const weekSales = sumTotals(completedOrders.filter((order) => new Date(order.createdAt) >= weekStart));
    const monthSales = sumTotals(completedOrders.filter((order) => new Date(order.createdAt) >= monthStart));
    const averageTicket = completedToday.length ? daySales / completedToday.length : 0;

    return {
      completedCount: completedToday.length,
      daySales,
      weekSales,
      monthSales,
      averageTicket
    };
  }, [completedOrders]);

  const weeklySalesData = useMemo(() => {
    const today = startOfDay(new Date());
    const days = Array.from({ length: 7 }, (_, index) => {
      const currentDate = addDays(today, index - 6);
      const key = buildDateKey(currentDate);
      const amount = completedOrders
        .filter((order) => buildDateKey(startOfDay(new Date(order.createdAt))) === key)
        .reduce((accumulator, order) => accumulator + Number(order.total || 0), 0);

      return {
        key,
        label: getWeekDayLabel(currentDate),
        dayNumber: currentDate.getDate(),
        amount
      };
    });

    const ordersCount = completedOrders.filter((order) => {
      const createdAt = startOfDay(new Date(order.createdAt));
      return createdAt >= addDays(today, -6);
    }).length;

    const totalAmount = days.reduce((accumulator, item) => accumulator + item.amount, 0);
    const maxAmount = Math.max(...days.map((item) => item.amount), 1);

    return {
      days,
      ordersCount,
      averageTicket: ordersCount ? totalAmount / ordersCount : 0,
      maxAmount
    };
  }, [completedOrders]);

  const monthlySalesData = useMemo(() => {
    const today = startOfDay(new Date());
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const totalDays = today.getDate();

    const days = Array.from({ length: totalDays }, (_, index) => {
      const currentDate = new Date(currentYear, currentMonth, index + 1);
      const key = buildDateKey(currentDate);
      const amount = completedOrders
        .filter((order) => buildDateKey(startOfDay(new Date(order.createdAt))) === key)
        .reduce((accumulator, order) => accumulator + Number(order.total || 0), 0);

      return {
        key,
        label: String(index + 1),
        amount
      };
    });

    const monthOrders = completedOrders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt.getFullYear() === currentYear && createdAt.getMonth() === currentMonth;
    });

    const ordersCount = monthOrders.length;
    const totalAmount = days.reduce((accumulator, item) => accumulator + item.amount, 0);
    const maxAmount = Math.max(...days.map((item) => item.amount), 1);

    return {
      days,
      ordersCount,
      averageTicket: ordersCount ? totalAmount / ordersCount : 0,
      maxAmount
    };
  }, [completedOrders]);

  const salesHistory = useMemo(() => {
    const yearsMap = new Map();

    completedOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const year = orderDate.getFullYear();
      const monthIndex = orderDate.getMonth();
      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

      if (!yearsMap.has(year)) {
        yearsMap.set(year, {
          key: String(year),
          year,
          total: 0,
          ordersCount: 0,
          monthsMap: new Map()
        });
      }

      const yearData = yearsMap.get(year);
      yearData.total += Number(order.total || 0);
      yearData.ordersCount += 1;

      if (!yearData.monthsMap.has(monthKey)) {
        yearData.monthsMap.set(monthKey, {
          key: monthKey,
          monthIndex,
          monthLabel: MONTH_LABELS[monthIndex],
          total: 0,
          ordersCount: 0,
          weeksMap: new Map()
        });
      }

      const monthData = yearData.monthsMap.get(monthKey);
      monthData.total += Number(order.total || 0);
      monthData.ordersCount += 1;

      const weekStart = getWeekStart(orderDate);
      const weekStartKey = buildDateKey(weekStart);
      const weekEnd = addDays(weekStart, 6);
      const weekKey = `${monthKey}-${weekStartKey}`;

      if (!monthData.weeksMap.has(weekKey)) {
        monthData.weeksMap.set(weekKey, {
          key: weekKey,
          weekStart,
          weekEnd,
          weekLabel: `Semana ${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`,
          total: 0,
          ordersCount: 0,
          daysMap: new Map()
        });
      }

      const weekData = monthData.weeksMap.get(weekKey);
      weekData.total += Number(order.total || 0);
      weekData.ordersCount += 1;

      const dayKey = buildDateKey(startOfDay(orderDate));

      if (!weekData.daysMap.has(dayKey)) {
        weekData.daysMap.set(dayKey, {
          key: dayKey,
          date: startOfDay(orderDate),
          dayLabel: startOfDay(orderDate).toLocaleDateString("es-CO", {
            weekday: "long",
            day: "2-digit",
            month: "long"
          }),
          total: 0,
          ordersCount: 0,
          orders: []
        });
      }

      const dayData = weekData.daysMap.get(dayKey);
      dayData.total += Number(order.total || 0);
      dayData.ordersCount += 1;
      dayData.orders.push(order);
    });

    return Array.from(yearsMap.values())
      .sort((a, b) => b.year - a.year)
      .map((yearData) => ({
        key: yearData.key,
        year: yearData.year,
        total: yearData.total,
        ordersCount: yearData.ordersCount,
        months: Array.from(yearData.monthsMap.values())
          .sort((a, b) => b.monthIndex - a.monthIndex)
          .map((monthData) => ({
            key: monthData.key,
            monthIndex: monthData.monthIndex,
            monthLabel: monthData.monthLabel,
            total: monthData.total,
            ordersCount: monthData.ordersCount,
            weeks: Array.from(monthData.weeksMap.values())
              .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
              .map((weekData) => ({
                key: weekData.key,
                weekLabel: weekData.weekLabel,
                weekStart: weekData.weekStart,
                weekEnd: weekData.weekEnd,
                total: weekData.total,
                ordersCount: weekData.ordersCount,
                days: Array.from(weekData.daysMap.values())
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map((dayData) => ({
                    ...dayData,
                    orders: [...dayData.orders].sort(
                      (firstOrder, secondOrder) => new Date(secondOrder.createdAt).getTime() - new Date(firstOrder.createdAt).getTime()
                    )
                  }))
              }))
          }))
      }));
  }, [completedOrders]);

  useEffect(() => {
    if (metricDetailView !== "history") return;

    if (!salesHistory.length) {
      setSelectedHistoryYear("");
      setSelectedHistoryMonth("");
      setSelectedHistoryWeek("");
      setSelectedHistoryDay("");
      return;
    }

    if (!selectedHistoryYear) {
      setSelectedHistoryYear(salesHistory[0].key);
    }
  }, [metricDetailView, salesHistory, selectedHistoryYear]);

  const selectedYearData = useMemo(() => {
    return salesHistory.find((item) => item.key === selectedHistoryYear) || null;
  }, [salesHistory, selectedHistoryYear]);

  const selectedMonthData = useMemo(() => {
    if (!selectedYearData) return null;
    return selectedYearData.months.find((item) => item.key === selectedHistoryMonth) || null;
  }, [selectedYearData, selectedHistoryMonth]);

  const selectedWeekData = useMemo(() => {
    if (!selectedMonthData) return null;
    return selectedMonthData.weeks.find((item) => item.key === selectedHistoryWeek) || null;
  }, [selectedMonthData, selectedHistoryWeek]);

  const selectedDayData = useMemo(() => {
    if (!selectedWeekData) return null;
    return selectedWeekData.days.find((item) => item.key === selectedHistoryDay) || null;
  }, [selectedWeekData, selectedHistoryDay]);

  const exportYear = (yearData) => {
    const rows = yearData.months.map((month) => ({
      Año: yearData.year,
      Mes: month.monthLabel,
      Ordenes: month.ordersCount,
      Total: Number(month.total.toFixed(2)),
      TicketPromedio: Number((month.ordersCount ? month.total / month.ordersCount : 0).toFixed(2))
    }));

    downloadWorkbook(`historial-ventas-${yearData.year}`, `Año ${yearData.year}`, rows);
  };

  const exportMonth = (yearData, monthData) => {
    const rows = monthData.weeks.map((week) => ({
      Año: yearData.year,
      Mes: monthData.monthLabel,
      Semana: week.weekLabel,
      Ordenes: week.ordersCount,
      Total: Number(week.total.toFixed(2)),
      TicketPromedio: Number((week.ordersCount ? week.total / week.ordersCount : 0).toFixed(2))
    }));

    downloadWorkbook(
      `historial-ventas-${yearData.year}-${String(monthData.monthIndex + 1).padStart(2, "0")}`,
      `${monthData.monthLabel}`,
      rows
    );
  };

  const exportWeek = (yearData, monthData, weekData) => {
    const rows = weekData.days.map((day) => ({
      Año: yearData.year,
      Mes: monthData.monthLabel,
      Semana: weekData.weekLabel,
      Día: day.dayLabel,
      Ordenes: day.ordersCount,
      Total: Number(day.total.toFixed(2)),
      TicketPromedio: Number((day.ordersCount ? day.total / day.ordersCount : 0).toFixed(2))
    }));

    downloadWorkbook(
      `historial-ventas-${yearData.year}-${String(monthData.monthIndex + 1).padStart(2, "0")}-semana`,
      "Semana",
      rows
    );
  };

  const exportDay = (yearData, monthData, weekData, dayData) => {
    const rows = dayData.orders.map((order) => ({
      Orden: `#${order._id.slice(-6)}`,
      Fecha: new Date(order.createdAt).toLocaleString("es-CO"),
      Cliente: `${order.user?.firstName || ""} ${order.user?.lastName || ""}`.trim() || "Cliente",
      Teléfono: order.user?.phone || "No registrado",
      Dirección: `${order.address?.street || ""} - ${order.address?.neighborhood || ""}`,
      MétodoPago: order.paymentMethod,
      EstadoPago: order.paymentStatus,
      Subtotal: Number(order.subtotal || 0),
      Domicilio: Number(order.deliveryFee || 0),
      Total: Number(order.total || 0),
      Items: (order.items || [])
        .map((item) => `${item.quantity} x ${item.product?.name || "Producto"}`)
        .join(" | ")
    }));

    downloadWorkbook(
      `historial-ventas-${yearData.year}-${String(monthData.monthIndex + 1).padStart(2, "0")}-${dayData.key}`,
      "Órdenes",
      rows
    );
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 2500);
  };

  const handleSaveSchedule = async (event) => {
    event.preventDefault();

    try {
      setScheduleError("");
      setSuccess("");
      await updateRestaurantConfig(restaurantConfig);
      const confirmed = await getRestaurantConfig();

      setRestaurantConfig({
        isOpen: confirmed.isOpen,
        opensAt: confirmed.opensAt,
        closesAt: confirmed.closesAt,
        weeklySchedule: cloneWeeklySchedule(confirmed.weeklySchedule),
        heroImage: confirmed.heroImage || "",
        heroProduct: confirmed.heroProduct?._id || confirmed.heroProduct || "",
        heroTitle: confirmed.heroTitle || "LALA PASTELERIA",
        heroSubtitle: confirmed.heroSubtitle || "Elige tu categoría favorita y arma tu pedido",
        heroTitleColor: confirmed.heroTitleColor || "white",
        heroSubtitleColor: confirmed.heroSubtitleColor || "white",
        stores: (confirmed?.stores || []).map((store) => ({
          _id: store?._id,
          name: store?.name || "",
          address: store?.address || "",
          city: store?.city || "",
          phone: store?.phone || "",
          sunThuOpensAt: store?.sunThuOpensAt || "11:00",
          sunThuClosesAt: store?.sunThuClosesAt || "23:00",
          friSatOpensAt: store?.friSatOpensAt || "11:00",
          friSatClosesAt: store?.friSatClosesAt || "00:00"
        })),
        extras: (confirmed?.extras || []).map((extra) => ({
          _id: extra?._id,
          name: extra?.name || "",
          products: (extra?.products || []).map((product) => product?._id || product).filter(Boolean)
        }))
      });
      showSuccess("Horario actualizado correctamente");
    } catch (saveError) {
      setScheduleError("No se pudo actualizar el horario.");
    }
  };

  const handleSubmitCategory = async (event) => {
    event.preventDefault();
    const payload = {
      name: categoryForm.name,
      image: categoryForm.image,
      active: categoryForm.active
    };

    try {
      setError("");

      if (categoryForm.id) {
        const updated = await updateCategory(categoryForm.id, payload);
        setCategories((current) => current.map((item) => (item._id === updated._id ? updated : item)));
        showSuccess("Categoría modificada con éxito");
      } else {
        const created = await createCategory(payload);
        setCategories((current) => [created, ...current]);
        showSuccess("Categoría creada con éxito");
      }

      setCategoryForm(emptyCategory);
    } catch (submitError) {
      setError(submitError?.response?.data?.message || "No se pudo guardar la categoría");
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      setError("");
      await deleteCategory(id);
      setCategories((current) => current.filter((item) => item._id !== id));
      showSuccess("Categoría eliminada");
    } catch (deleteError) {
      setError(deleteError?.response?.data?.message || "No se pudo eliminar la categoría");
    }
  };

  const handleMoveCategory = async (index, direction) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= categories.length) {
      return;
    }

    const previousCategories = [...categories];
    const nextCategories = [...categories];
    const [moved] = nextCategories.splice(index, 1);
    nextCategories.splice(nextIndex, 0, moved);

    try {
      setError("");
      setSavingCategoryOrder(true);
      setCategories(nextCategories);

      await Promise.all(
        nextCategories.map((category, order) =>
          updateCategory(category._id, { sortOrder: order })
        )
      );

      showSuccess("Orden de categorías actualizado");
    } catch (moveError) {
      setCategories(previousCategories);
      setError(moveError?.response?.data?.message || "No se pudo reordenar categorías");
    } finally {
      setSavingCategoryOrder(false);
    }
  };

  const handleSubmitProduct = async (event) => {
    event.preventDefault();

    const normalizedSizes = normalizeProductSizes(productForm.sizes);
    const shouldUseSizes = productForm.hasSizes || normalizedSizes.length > 0;

    if (shouldUseSizes && normalizedSizes.length === 0) {
      setError("Debes agregar al menos un tamaño con precio");
      return;
    }

    const fallbackPrice = Number(productForm.price);
    const basePrice = shouldUseSizes
      ? Number(normalizedSizes[0].price)
      : (Number.isFinite(fallbackPrice) ? fallbackPrice : 0);

    const payload = {
      name: productForm.name,
      description: productForm.description,
      price: basePrice,
      hasSizes: shouldUseSizes,
      sizes: shouldUseSizes ? normalizedSizes : [],
      image: productForm.image,
      category: productForm.category,
      available: productForm.available
    };

    try {
      setError("");

      if (productForm.id) {
        const updated = await updateProduct(productForm.id, payload);
        setProducts((current) => current.map((item) => (item._id === updated._id ? updated : item)));
        showSuccess("Producto modificado con éxito");
      } else {
        const created = await createProduct(payload);
        setProducts((current) => [created, ...current]);
        showSuccess("Producto creado con éxito");
      }

      setProductForm(emptyProduct);
    } catch (submitError) {
      setError(submitError?.response?.data?.message || "No se pudo guardar el producto");
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      setError("");
      await deleteProduct(id);
      setProducts((current) => current.filter((item) => item._id !== id));
      showSuccess("Producto eliminado");
    } catch (deleteError) {
      setError(deleteError?.response?.data?.message || "No se pudo eliminar el producto");
    }
  };

  const handleSubmitNeighborhood = async (event) => {
    event.preventDefault();
    const payload = {
      name: neighborhoodForm.name,
      deliveryFee: Number(neighborhoodForm.deliveryFee),
      active: neighborhoodForm.active
    };

    try {
      setError("");

      if (neighborhoodForm.id) {
        const updated = await updateNeighborhood(neighborhoodForm.id, payload);
        setNeighborhoods((current) => current.map((item) => (item._id === updated._id ? updated : item)));
        showSuccess("Barrio actualizado");
      } else {
        const created = await createNeighborhood(payload);
        setNeighborhoods((current) => [created, ...current]);
        showSuccess("Barrio creado");
      }

      setNeighborhoodForm(emptyNeighborhood);
    } catch (submitError) {
      setError(submitError?.response?.data?.message || "No se pudo guardar el barrio");
    }
  };

  const handleDeleteNeighborhood = async (id) => {
    try {
      setError("");
      await deleteNeighborhood(id);
      setNeighborhoods((current) => current.filter((item) => item._id !== id));
      showSuccess("Barrio eliminado");
    } catch (deleteError) {
      setError(deleteError?.response?.data?.message || "No se pudo eliminar el barrio");
    }
  };

  const handleToggleExtraProduct = (productId) => {
    setExtraForm((current) => {
      const exists = current.products.includes(productId);
      if (exists) {
        return {
          ...current,
          products: current.products.filter((id) => id !== productId)
        };
      }

      return {
        ...current,
        products: [...current.products, productId]
      };
    });
  };

  const handleSubmitExtra = async (event) => {
    event.preventDefault();

    const normalizedName = extraForm.name.trim();
    if (!normalizedName) {
      setError("El nombre del extra es obligatorio");
      return;
    }

    try {
      setError("");

      const nextExtras = extraForm.id
        ? (restaurantConfig.extras || []).map((extra) => (
          extra._id === extraForm.id
            ? { ...extra, name: normalizedName, products: extraForm.products }
            : extra
        ))
        : [
          ...(restaurantConfig.extras || []),
          { name: normalizedName, products: extraForm.products }
        ];

      const updated = await updateRestaurantConfig({
        extras: nextExtras.map((extra) => ({
          name: extra.name,
          products: extra.products
        }))
      });

      setRestaurantConfig((current) => ({
        ...current,
        extras: (updated?.extras || []).map((extra) => ({
          _id: extra?._id,
          name: extra?.name || "",
          products: (extra?.products || []).map((product) => product?._id || product).filter(Boolean)
        }))
      }));
      setExtraForm(emptyExtra);
      showSuccess(extraForm.id ? "Extra actualizado" : "Extra creado");
    } catch (submitError) {
      setError(submitError?.response?.data?.message || "No se pudo guardar el extra");
    }
  };

  const handleEditExtra = (extra) => {
    setExtraForm({
      id: extra._id,
      name: extra.name,
      products: [...(extra.products || [])]
    });
  };

  const handleDeleteExtra = async (extraId) => {
    try {
      setError("");

      const nextExtras = (restaurantConfig.extras || []).filter((extra) => extra._id !== extraId);
      const updated = await updateRestaurantConfig({
        extras: nextExtras.map((extra) => ({
          name: extra.name,
          products: extra.products
        }))
      });

      setRestaurantConfig((current) => ({
        ...current,
        extras: (updated?.extras || []).map((extra) => ({
          _id: extra?._id,
          name: extra?.name || "",
          products: (extra?.products || []).map((product) => product?._id || product).filter(Boolean)
        }))
      }));

      if (extraForm.id === extraId) {
        setExtraForm(emptyExtra);
      }

      showSuccess("Extra eliminado");
    } catch (deleteError) {
      setError(deleteError?.response?.data?.message || "No se pudo eliminar el extra");
    }
  };

  const handleSubmitStore = async (event) => {
    event.preventDefault();

    const normalizedName = storeForm.name.trim();
    const normalizedAddress = storeForm.address.trim();
    const normalizedCity = storeForm.city.trim();
    const normalizedPhone = storeForm.phone.trim();

    if (!normalizedName || !normalizedAddress || !normalizedCity || !normalizedPhone) {
      setError("Nombre, dirección, ciudad y teléfono son obligatorios");
      return;
    }

    try {
      setError("");

      const nextStores = storeForm.id
        ? (restaurantConfig.stores || []).map((store) => (
          store._id === storeForm.id
            ? {
              ...store,
              name: normalizedName,
              address: normalizedAddress,
              city: normalizedCity,
              phone: normalizedPhone,
              sunThuOpensAt: storeForm.sunThuOpensAt,
              sunThuClosesAt: storeForm.sunThuClosesAt,
              friSatOpensAt: storeForm.friSatOpensAt,
              friSatClosesAt: storeForm.friSatClosesAt
            }
            : store
        ))
        : [
          ...(restaurantConfig.stores || []),
          {
            name: normalizedName,
            address: normalizedAddress,
            city: normalizedCity,
            phone: normalizedPhone,
            sunThuOpensAt: storeForm.sunThuOpensAt,
            sunThuClosesAt: storeForm.sunThuClosesAt,
            friSatOpensAt: storeForm.friSatOpensAt,
            friSatClosesAt: storeForm.friSatClosesAt
          }
        ];

      const updated = await updateRestaurantConfig({
        stores: nextStores.map((store) => ({
          name: store.name,
          address: store.address,
          city: store.city,
          phone: store.phone,
          sunThuOpensAt: store.sunThuOpensAt,
          sunThuClosesAt: store.sunThuClosesAt,
          friSatOpensAt: store.friSatOpensAt,
          friSatClosesAt: store.friSatClosesAt
        }))
      });

      setRestaurantConfig((current) => ({
        ...current,
        stores: (updated?.stores || []).map((store) => ({
          _id: store?._id,
          name: store?.name || "",
          address: store?.address || "",
          city: store?.city || "",
          phone: store?.phone || "",
          sunThuOpensAt: store?.sunThuOpensAt || "11:00",
          sunThuClosesAt: store?.sunThuClosesAt || "23:00",
          friSatOpensAt: store?.friSatOpensAt || "11:00",
          friSatClosesAt: store?.friSatClosesAt || "00:00"
        }))
      }));

      setStoreForm(emptyStore);
      showSuccess(storeForm.id ? "Tienda actualizada" : "Tienda creada");
    } catch (submitError) {
      setError(submitError?.response?.data?.message || "No se pudo guardar la tienda");
    }
  };

  const handleEditStore = (store) => {
    setStoreForm({
      id: store._id,
      name: store.name,
      address: store.address,
      city: store.city,
      phone: store.phone,
      sunThuOpensAt: store.sunThuOpensAt,
      sunThuClosesAt: store.sunThuClosesAt,
      friSatOpensAt: store.friSatOpensAt,
      friSatClosesAt: store.friSatClosesAt
    });
  };

  const handleDeleteStore = async (storeId) => {
    try {
      setError("");

      const nextStores = (restaurantConfig.stores || []).filter((store) => store._id !== storeId);
      const updated = await updateRestaurantConfig({
        stores: nextStores.map((store) => ({
          name: store.name,
          address: store.address,
          city: store.city,
          phone: store.phone,
          sunThuOpensAt: store.sunThuOpensAt,
          sunThuClosesAt: store.sunThuClosesAt,
          friSatOpensAt: store.friSatOpensAt,
          friSatClosesAt: store.friSatClosesAt
        }))
      });

      setRestaurantConfig((current) => ({
        ...current,
        stores: (updated?.stores || []).map((store) => ({
          _id: store?._id,
          name: store?.name || "",
          address: store?.address || "",
          city: store?.city || "",
          phone: store?.phone || "",
          sunThuOpensAt: store?.sunThuOpensAt || "11:00",
          sunThuClosesAt: store?.sunThuClosesAt || "23:00",
          friSatOpensAt: store?.friSatOpensAt || "11:00",
          friSatClosesAt: store?.friSatClosesAt || "00:00"
        }))
      }));

      if (storeForm.id === storeId) {
        setStoreForm(emptyStore);
      }

      showSuccess("Tienda eliminada");
    } catch (deleteError) {
      setError(deleteError?.response?.data?.message || "No se pudo eliminar la tienda");
    }
  };

  const handleSubmitMarketing = async (event) => {
    event.preventDefault();

    try {
      setError("");
      const response = await sendPushCampaign(marketingForm);
      setMarketingForm({ title: "", message: "" });
      showSuccess(`Campaña enviada. Destinatarios: ${response.recipientCount}`);
    } catch (submitError) {
      setError(submitError?.response?.data?.message || "No se pudo enviar la campaña");
    }
  };

  const handleSaveHero = async (event) => {
    event.preventDefault();

    try {
      setError("");
      setSavingHero(true);

      const updated = await updateRestaurantConfig({
        heroImage: restaurantConfig.heroImage || "",
        heroProduct: restaurantConfig.heroProduct || null,
        heroTitle: restaurantConfig.heroTitle || "",
        heroSubtitle: restaurantConfig.heroSubtitle || "",
        heroTitleColor: restaurantConfig.heroTitleColor || "white",
        heroSubtitleColor: restaurantConfig.heroSubtitleColor || "white"
      });

      setRestaurantConfig((current) => ({
        ...current,
        heroImage: updated?.heroImage || "",
        heroProduct: updated?.heroProduct?._id || updated?.heroProduct || "",
        heroTitle: updated?.heroTitle || "",
        heroSubtitle: updated?.heroSubtitle || "",
        heroTitleColor: updated?.heroTitleColor || "white",
        heroSubtitleColor: updated?.heroSubtitleColor || "white"
      }));

      showSuccess("Hero actualizado correctamente");
    } catch (saveError) {
      setError(saveError?.response?.data?.message || "No se pudo actualizar el hero");
    } finally {
      setSavingHero(false);
    }
  };

  const readImageAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(file);
    });
  };

  const handleSelectImage = async (target, file) => {
    if (!file) return;

    try {
      setError("");
      const imageValue = await readImageAsDataUrl(file);

      if (target === "category") {
        setCategoryForm((current) => ({ ...current, image: imageValue }));
      }

      if (target === "product") {
        setProductForm((current) => ({ ...current, image: imageValue }));
      }

      if (target === "hero") {
        setRestaurantConfig((current) => ({ ...current, heroImage: imageValue }));
      }
    } catch (imageError) {
      setError(imageError.message || "No se pudo cargar la imagen");
    }
  };

  const handleSelectTab = (tabKey) => {
    setActiveTab(tabKey);

    if (tabKey !== "schedule") {
      setScheduleError("");
    }

    if (tabKey !== "metrics") {
      setMetricDetailView("overview");
    }
  };

  const activeTabLabel = ALL_TABS.find((tab) => tab.key === activeTab)?.label || "";

  return (
    <main className="admin-shell">
      <LogoutFab onConfirm={logout} />

      <div className="admin-layout">
        <AdminSidebar
          sections={SIDEBAR_SECTIONS}
          activeTab={activeTab}
          onSelect={handleSelectTab}
          userName={user?.firstName}
        />

        <div className="admin-main">
          <header className="admin-header">
            <div>
              <h1>LALA PASTELERIA ADMIN PORTAL</h1>
              <p>{activeTabLabel}</p>
            </div>
          </header>

      {error ? (
        <div className="alert-message error-text" role="alert">
          <span>{error}</span>
          <button type="button" className="alert-close" aria-label="Cerrar mensaje" onClick={() => setError("")}>×</button>
        </div>
      ) : null}
      {success ? (
        <div className="alert-message success-text" role="status">
          <span>{success}</span>
          <button type="button" className="alert-close" aria-label="Cerrar mensaje" onClick={() => setSuccess("")}>×</button>
        </div>
      ) : null}

      {loading ? <p className="muted">Cargando portal...</p> : null}

      {!loading && activeTab === "metrics" ? (
        <>
          {metricDetailView === "overview" ? (
            <section className="admin-grid metrics-grid">
              <article className="admin-card"><h3>Órdenes completadas</h3><strong>{metrics.completedCount}</strong></article>
              <article className="admin-card"><h3>Ventas del día</h3><strong>{MONEY.format(metrics.daySales)}</strong></article>
              <button type="button" className="admin-card metric-card-button" onClick={() => setMetricDetailView("week")}>
                <h3>Ventas semana</h3>
                <strong>{MONEY.format(metrics.weekSales)}</strong>
              </button>
              <button type="button" className="admin-card metric-card-button" onClick={() => setMetricDetailView("month")}>
                <h3>Ventas mes</h3>
                <strong>{MONEY.format(metrics.monthSales)}</strong>
              </button>
              <article className="admin-card"><h3>Ticket promedio del día</h3><strong>{MONEY.format(metrics.averageTicket)}</strong></article>
              <button
                type="button"
                className="admin-card metric-card-button history-card-button"
                onClick={() => {
                  setMetricDetailView("history");
                  if (salesHistory.length) {
                    setSelectedHistoryYear((current) => current || salesHistory[0].key);
                    setSelectedHistoryMonth("");
                    setSelectedHistoryWeek("");
                    setSelectedHistoryDay("");
                  }
                }}
              >
                <h3>Historial de ventas</h3>
              </button>
            </section>
          ) : null}

          {metricDetailView === "week" ? (
            <section className="admin-card metric-detail-card">
              <div className="metric-detail-header">
                <h2>Ventas de la semana</h2>
                <button type="button" onClick={() => setMetricDetailView("overview")}>Volver</button>
              </div>

              <div className="table-scroll">
                <table className="sales-table">
                  <thead>
                    <tr>
                      <th>X (Día)</th>
                      <th>Y (Facturado)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklySalesData.days.map((item) => (
                      <tr key={item.key}>
                        <td>{item.label} {item.dayNumber}</td>
                        <td>{MONEY.format(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bar-chart-scroll">
                <div className="bar-chart" role="img" aria-label="Gráfica semanal de facturación por día">
                  {weeklySalesData.days.map((item) => (
                    <div key={item.key} className="bar-item">
                      <div className="bar-column-wrap">
                        <div
                          className="bar-column"
                          style={{ height: `${Math.max((item.amount / weeklySalesData.maxAmount) * 100, item.amount > 0 ? 8 : 2)}%` }}
                        />
                      </div>
                      <span className="bar-x-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="metric-kpi-row">
                <p><strong>Órdenes de la semana:</strong> {weeklySalesData.ordersCount}</p>
                <p><strong>Ticket promedio semana:</strong> {MONEY.format(weeklySalesData.averageTicket)}</p>
              </div>

              <div className="sales-breakdown">
                {weeklySalesData.days.map((item) => (
                  <p key={`week-break-${item.key}`}>{item.label} {item.dayNumber}: {MONEY.format(item.amount)}</p>
                ))}
              </div>
            </section>
          ) : null}

          {metricDetailView === "month" ? (
            <section className="admin-card metric-detail-card">
              <div className="metric-detail-header">
                <h2>Ventas del mes</h2>
                <button type="button" onClick={() => setMetricDetailView("overview")}>Volver</button>
              </div>

              <div className="table-scroll">
                <table className="sales-table">
                  <thead>
                    <tr>
                      <th>X (Día del mes)</th>
                      <th>Y (Facturado)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySalesData.days.map((item) => (
                      <tr key={item.key}>
                        <td>{item.label}</td>
                        <td>{MONEY.format(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bar-chart-scroll">
                <div className="bar-chart" role="img" aria-label="Gráfica mensual de facturación por día">
                  {monthlySalesData.days.map((item) => (
                    <div key={item.key} className="bar-item">
                      <div className="bar-column-wrap">
                        <div
                          className="bar-column"
                          style={{ height: `${Math.max((item.amount / monthlySalesData.maxAmount) * 100, item.amount > 0 ? 8 : 2)}%` }}
                        />
                      </div>
                      <span className="bar-x-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="metric-kpi-row">
                <p><strong>Órdenes del mes:</strong> {monthlySalesData.ordersCount}</p>
                <p><strong>Ticket promedio mes:</strong> {MONEY.format(monthlySalesData.averageTicket)}</p>
              </div>

              <div className="sales-breakdown">
                {monthlySalesData.days.map((item) => (
                  <p key={`month-break-${item.key}`}>Día {item.label}: {MONEY.format(item.amount)}</p>
                ))}
              </div>
            </section>
          ) : null}

          {metricDetailView === "history" ? (
            <section className="admin-card metric-detail-card">
              <div className="metric-detail-header">
                <h2>Historial de ventas</h2>
                <button type="button" onClick={() => setMetricDetailView("overview")}>Volver</button>
              </div>

              {!salesHistory.length ? <p className="muted">No hay ventas entregadas para mostrar.</p> : null}

              {salesHistory.length ? (
                <div className="history-grid">
                  <div className="history-column">
                    <div className="history-column-head">
                      <h3>Año</h3>
                      {selectedYearData ? (
                        <button type="button" onClick={() => exportYear(selectedYearData)}>Descargar Excel</button>
                      ) : null}
                    </div>
                    <div className="history-list">
                      {salesHistory.map((yearItem) => (
                        <button
                          key={yearItem.key}
                          type="button"
                          className={`history-item ${selectedHistoryYear === yearItem.key ? "active" : ""}`}
                          onClick={() => {
                            setSelectedHistoryYear(yearItem.key);
                            setSelectedHistoryMonth("");
                            setSelectedHistoryWeek("");
                            setSelectedHistoryDay("");
                          }}
                        >
                          <strong>{yearItem.year}</strong>
                          <span>{yearItem.ordersCount} órdenes</span>
                          <span>{MONEY.format(yearItem.total)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="history-column">
                    <div className="history-column-head">
                      <h3>Mes</h3>
                      {selectedYearData && selectedMonthData ? (
                        <button type="button" onClick={() => exportMonth(selectedYearData, selectedMonthData)}>Descargar Excel</button>
                      ) : null}
                    </div>
                    <div className="history-list">
                      {selectedYearData?.months?.length ? selectedYearData.months.map((monthItem) => (
                        <button
                          key={monthItem.key}
                          type="button"
                          className={`history-item ${selectedHistoryMonth === monthItem.key ? "active" : ""}`}
                          onClick={() => {
                            setSelectedHistoryMonth(monthItem.key);
                            setSelectedHistoryWeek("");
                            setSelectedHistoryDay("");
                          }}
                        >
                          <strong>{monthItem.monthLabel}</strong>
                          <span>{monthItem.ordersCount} órdenes</span>
                          <span>{MONEY.format(monthItem.total)}</span>
                        </button>
                      )) : <p className="muted">Selecciona un año</p>}
                    </div>
                  </div>

                  <div className="history-column">
                    <div className="history-column-head">
                      <h3>Semana</h3>
                      {selectedYearData && selectedMonthData && selectedWeekData ? (
                        <button type="button" onClick={() => exportWeek(selectedYearData, selectedMonthData, selectedWeekData)}>Descargar Excel</button>
                      ) : null}
                    </div>
                    <div className="history-list">
                      {selectedMonthData?.weeks?.length ? selectedMonthData.weeks.map((weekItem) => (
                        <button
                          key={weekItem.key}
                          type="button"
                          className={`history-item ${selectedHistoryWeek === weekItem.key ? "active" : ""}`}
                          onClick={() => {
                            setSelectedHistoryWeek(weekItem.key);
                            setSelectedHistoryDay("");
                          }}
                        >
                          <strong>{weekItem.weekLabel}</strong>
                          <span>{weekItem.ordersCount} órdenes</span>
                          <span>{MONEY.format(weekItem.total)}</span>
                        </button>
                      )) : <p className="muted">Selecciona un mes</p>}
                    </div>
                  </div>

                  <div className="history-column">
                    <div className="history-column-head">
                      <h3>Día</h3>
                      {selectedYearData && selectedMonthData && selectedWeekData && selectedDayData ? (
                        <button type="button" onClick={() => exportDay(selectedYearData, selectedMonthData, selectedWeekData, selectedDayData)}>
                          Descargar Excel
                        </button>
                      ) : null}
                    </div>
                    <div className="history-list">
                      {selectedWeekData?.days?.length ? selectedWeekData.days.map((dayItem) => (
                        <button
                          key={dayItem.key}
                          type="button"
                          className={`history-item ${selectedHistoryDay === dayItem.key ? "active" : ""}`}
                          onClick={() => setSelectedHistoryDay(dayItem.key)}
                        >
                          <strong>{dayItem.dayLabel}</strong>
                          <span>{dayItem.ordersCount} órdenes</span>
                          <span>{MONEY.format(dayItem.total)}</span>
                        </button>
                      )) : <p className="muted">Selecciona una semana</p>}
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedDayData ? (
                <div className="history-orders">
                  <h3>Órdenes del día</h3>
                  <div className="table-scroll">
                    <table className="sales-table">
                      <thead>
                        <tr>
                          <th>Orden</th>
                          <th>Hora</th>
                          <th>Cliente</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDayData.orders.map((order) => (
                          <tr key={order._id}>
                            <td>#{order._id.slice(-6)}</td>
                            <td>{new Date(order.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</td>
                            <td>{`${order.user?.firstName || ""} ${order.user?.lastName || ""}`.trim() || "Cliente"}</td>
                            <td>{MONEY.format(Number(order.total || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}

      {!loading && activeTab === "schedule" ? (
        <section className="admin-card">
          <h2>Estado y horario del restaurante</h2>
          {scheduleError ? (
            <div className="alert-message error-text" role="alert">
              <span>{scheduleError}</span>
              <button type="button" className="alert-close" aria-label="Cerrar mensaje" onClick={() => setScheduleError("")}>×</button>
            </div>
          ) : null}
          <form className="admin-form" onSubmit={handleSaveSchedule}>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={restaurantConfig.isOpen}
                onChange={(event) => setRestaurantConfig((current) => ({ ...current, isOpen: event.target.checked }))}
              />
              Restaurante activo
            </label>

            <p className="muted">Días de operación</p>
            <div className="week-grid">
              {WEEK_DAYS.map((day) => (
                <div key={day.key} className="week-option">
                  <label className="checkbox-row week-day-check">
                    <input
                      type="checkbox"
                      checked={Boolean(restaurantConfig.weeklySchedule?.[day.key]?.enabled)}
                      onChange={(event) => setRestaurantConfig((current) => ({
                        ...current,
                        weeklySchedule: {
                          ...cloneWeeklySchedule(current.weeklySchedule),
                          [day.key]: {
                            ...defaultWeeklySchedule[day.key],
                            ...(current.weeklySchedule?.[day.key] || {}),
                            enabled: event.target.checked
                          }
                        }
                      }))}
                    />
                    <span>{day.label}</span>
                  </label>

                  <div className="week-time-row">
                    <div>
                      <label htmlFor={`${day.key}-open`}>Abre</label>
                      <input
                        id={`${day.key}-open`}
                        type="time"
                        value={restaurantConfig.weeklySchedule?.[day.key]?.opensAt || "12:00"}
                        disabled={!restaurantConfig.weeklySchedule?.[day.key]?.enabled}
                        onChange={(event) => setRestaurantConfig((current) => ({
                          ...current,
                          weeklySchedule: {
                            ...cloneWeeklySchedule(current.weeklySchedule),
                            [day.key]: {
                              ...defaultWeeklySchedule[day.key],
                              ...(current.weeklySchedule?.[day.key] || {}),
                              opensAt: event.target.value
                            }
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${day.key}-close`}>Cierra</label>
                      <input
                        id={`${day.key}-close`}
                        type="time"
                        value={restaurantConfig.weeklySchedule?.[day.key]?.closesAt || "22:00"}
                        disabled={!restaurantConfig.weeklySchedule?.[day.key]?.enabled}
                        onChange={(event) => setRestaurantConfig((current) => ({
                          ...current,
                          weeklySchedule: {
                            ...cloneWeeklySchedule(current.weeklySchedule),
                            [day.key]: {
                              ...defaultWeeklySchedule[day.key],
                              ...(current.weeklySchedule?.[day.key] || {}),
                              closesAt: event.target.value
                            }
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="submit">Guardar horario</button>
          </form>
        </section>
      ) : null}

      {!loading && activeTab === "hero" ? (
        <section className="admin-card">
          <h2>Hero App Usuario</h2>
          <form className="admin-form" onSubmit={handleSaveHero}>
            <label>Imagen del hero</label>
            <div className="image-picker-row">
              <input
                ref={heroImageInputRef}
                type="file"
                accept="image/*"
                className="hidden-file-input"
                onChange={(event) => handleSelectImage("hero", event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => heroImageInputRef.current?.click()}
              >
                Seleccionar imagen
              </button>
              <span className="muted">{restaurantConfig.heroImage ? "Imagen seleccionada" : "Sin imagen"}</span>
            </div>
            <p className="image-help-text">Recomendado: 1270x1000 px, máximo 1 MB (JPG/PNG/WebP).</p>

            {restaurantConfig.heroImage ? (
              <div className="image-preview-wrap">
                <button
                  type="button"
                  className="remove-image-button"
                  aria-label="Quitar imagen"
                  onClick={() => {
                    setRestaurantConfig((current) => ({ ...current, heroImage: "" }));
                    if (heroImageInputRef.current) {
                      heroImageInputRef.current.value = "";
                    }
                  }}
                >
                  ×
                </button>
                <img src={restaurantConfig.heroImage} alt="Previsualización hero" className="image-preview" />
              </div>
            ) : null}

            <label htmlFor="heroProduct">Producto destino del hero</label>
            <select
              id="heroProduct"
              value={restaurantConfig.heroProduct || ""}
              onChange={(event) => setRestaurantConfig((current) => ({ ...current, heroProduct: event.target.value }))}
            >
              <option value="">Sin destino</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>{product.name}</option>
              ))}
            </select>

            <label htmlFor="heroTitle">Título del hero</label>
            <input
              id="heroTitle"
              value={restaurantConfig.heroTitle || ""}
              onChange={(event) => setRestaurantConfig((current) => ({ ...current, heroTitle: event.target.value }))}
              placeholder="Ej: LALA PASTELERIA"
            />

            <label htmlFor="heroTitleColor">Color título</label>
            <select
              id="heroTitleColor"
              value={restaurantConfig.heroTitleColor || "white"}
              onChange={(event) => setRestaurantConfig((current) => ({ ...current, heroTitleColor: event.target.value }))}
            >
              <option value="white">Blanco</option>
              <option value="black">Negro</option>
            </select>

            <label htmlFor="heroSubtitle">Subtítulo del hero</label>
            <input
              id="heroSubtitle"
              value={restaurantConfig.heroSubtitle || ""}
              onChange={(event) => setRestaurantConfig((current) => ({ ...current, heroSubtitle: event.target.value }))}
              placeholder="Ej: Elige tu categoría favorita y arma tu pedido"
            />

            <label htmlFor="heroSubtitleColor">Color subtítulo</label>
            <select
              id="heroSubtitleColor"
              value={restaurantConfig.heroSubtitleColor || "white"}
              onChange={(event) => setRestaurantConfig((current) => ({ ...current, heroSubtitleColor: event.target.value }))}
            >
              <option value="white">Blanco</option>
              <option value="black">Negro</option>
            </select>

            <button type="submit" disabled={savingHero}>{savingHero ? "Guardando..." : "Guardar hero"}</button>
          </form>
        </section>
      ) : null}

      {!loading && activeTab === "stores" ? (
        <section className="admin-grid two-columns">
          <article className="admin-card">
            <h2>{storeForm.id ? "Editar tienda" : "Nueva tienda"}</h2>
            <form className="admin-form" onSubmit={handleSubmitStore}>
              <label htmlFor="storeName">Nombre tienda</label>
              <input
                id="storeName"
                value={storeForm.name}
                onChange={(event) => setStoreForm((current) => ({ ...current, name: event.target.value }))}
                required
              />

              <label htmlFor="storeAddress">Dirección</label>
              <input
                id="storeAddress"
                value={storeForm.address}
                onChange={(event) => setStoreForm((current) => ({ ...current, address: event.target.value }))}
                required
              />

              <label htmlFor="storeCity">Ciudad</label>
              <input
                id="storeCity"
                value={storeForm.city}
                onChange={(event) => setStoreForm((current) => ({ ...current, city: event.target.value }))}
                required
              />

              <label htmlFor="storePhone">Teléfono</label>
              <input
                id="storePhone"
                value={storeForm.phone}
                onChange={(event) => setStoreForm((current) => ({ ...current, phone: event.target.value }))}
                required
              />

              <label>Domingo a Jueves</label>
              <div className="time-grid-two">
                <input
                  type="time"
                  value={storeForm.sunThuOpensAt}
                  onChange={(event) => setStoreForm((current) => ({ ...current, sunThuOpensAt: event.target.value }))}
                  required
                />
                <input
                  type="time"
                  value={storeForm.sunThuClosesAt}
                  onChange={(event) => setStoreForm((current) => ({ ...current, sunThuClosesAt: event.target.value }))}
                  required
                />
              </div>

              <label>Viernes a Sábado</label>
              <div className="time-grid-two">
                <input
                  type="time"
                  value={storeForm.friSatOpensAt}
                  onChange={(event) => setStoreForm((current) => ({ ...current, friSatOpensAt: event.target.value }))}
                  required
                />
                <input
                  type="time"
                  value={storeForm.friSatClosesAt}
                  onChange={(event) => setStoreForm((current) => ({ ...current, friSatClosesAt: event.target.value }))}
                  required
                />
              </div>

              <button type="submit">{storeForm.id ? "Actualizar" : "Crear"}</button>
              {storeForm.id ? <button type="button" onClick={() => setStoreForm(emptyStore)}>Cancelar edición</button> : null}
            </form>
          </article>

          <article className="admin-card list-card">
            <h2>Tiendas</h2>
            {(restaurantConfig.stores || []).length ? (restaurantConfig.stores || []).map((store) => (
              <div key={store._id} className="list-row">
                <div>
                  <strong>{store.name}</strong>
                  <p className="muted">{store.address} · {store.city}</p>
                  <p className="muted">Tel: {store.phone}</p>
                  <p className="muted">Dom-Jue: {store.sunThuOpensAt} - {store.sunThuClosesAt}</p>
                  <p className="muted">Vie-Sáb: {store.friSatOpensAt} - {store.friSatClosesAt}</p>
                </div>
                <div className="row-actions">
                  <button type="button" onClick={() => handleEditStore(store)}>Editar</button>
                  <button type="button" onClick={() => handleDeleteStore(store._id)}>Eliminar</button>
                </div>
              </div>
            )) : <p className="muted">Aún no hay tiendas creadas.</p>}
          </article>
        </section>
      ) : null}

      {!loading && activeTab === "extras" ? (
        <section className="admin-grid two-columns">
          <article className="admin-card">
            <h2>{extraForm.id ? "Editar extra" : "Nuevo extra"}</h2>
            <form className="admin-form" onSubmit={handleSubmitExtra}>
              <label htmlFor="extraName">Nombre del extra</label>
              <input
                id="extraName"
                value={extraForm.name}
                onChange={(event) => setExtraForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ej: Acompaña con una refrescante bebida"
                required
              />

              <label>Productos para este extra</label>
              <div className="extra-products-list">
                {products.map((product) => (
                  <label key={product._id} className="checkbox-row extra-product-option">
                    <input
                      type="checkbox"
                      checked={extraForm.products.includes(product._id)}
                      onChange={() => handleToggleExtraProduct(product._id)}
                    />
                    <span>{product.name} · {getProductDisplayPrice(product)}</span>
                  </label>
                ))}
              </div>

              <button type="submit">{extraForm.id ? "Actualizar extra" : "Crear extra"}</button>
              {extraForm.id ? (
                <button type="button" onClick={() => setExtraForm(emptyExtra)}>Cancelar edición</button>
              ) : null}
            </form>
          </article>

          <article className="admin-card list-card">
            <h2>Extras configurados</h2>
            {(restaurantConfig.extras || []).length ? (restaurantConfig.extras || []).map((extra) => (
              <div key={extra._id} className="list-row">
                <div>
                  <strong>{extra.name}</strong>
                  <p className="muted">{(extra.products || []).length} productos</p>
                </div>
                <div className="row-actions">
                  <button type="button" onClick={() => handleEditExtra(extra)}>Editar</button>
                  <button type="button" onClick={() => handleDeleteExtra(extra._id)}>Eliminar</button>
                </div>
              </div>
            )) : <p className="muted">Aún no hay extras creados.</p>}
          </article>
        </section>
      ) : null}

      {!loading && activeTab === "categories" ? (
        <section className="admin-grid two-columns">
          <article className="admin-card">
            <h2>{categoryForm.id ? "Editar categoría" : "Nueva categoría"}</h2>
            <form className="admin-form" onSubmit={handleSubmitCategory}>
              <label htmlFor="categoryName">Nombre</label>
              <input
                id="categoryName"
                value={categoryForm.name}
                onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                required
              />

              <label>Imagen</label>
              <div className="image-picker-row">
                <input
                  ref={categoryImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden-file-input"
                  onChange={(event) => handleSelectImage("category", event.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => categoryImageInputRef.current?.click()}
                >
                  Seleccionar imagen
                </button>
                <span className="muted">{categoryForm.image ? "Imagen seleccionada" : "Sin imagen"}</span>
              </div>
              <p className="image-help-text">Recomendado: 1270x1000 px, máximo 1 MB (JPG/PNG/WebP).</p>
              {categoryForm.image ? (
                <div className="image-preview-wrap">
                  <button
                    type="button"
                    className="remove-image-button"
                    aria-label="Quitar imagen"
                    onClick={() => {
                      setCategoryForm((current) => ({ ...current, image: "" }));
                      if (categoryImageInputRef.current) {
                        categoryImageInputRef.current.value = "";
                      }
                    }}
                  >
                    ×
                  </button>
                  <img src={categoryForm.image} alt="Previsualización categoría" className="image-preview" />
                </div>
              ) : null}

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={categoryForm.active}
                  onChange={(event) => setCategoryForm((current) => ({ ...current, active: event.target.checked }))}
                />
                Activa
              </label>

              <button type="submit">{categoryForm.id ? "Actualizar" : "Crear"}</button>
            </form>
          </article>

          <article className="admin-card list-card">
            <h2>Categorías</h2>
            {savingCategoryOrder ? (
              <div className="inline-loading" role="status" aria-live="polite">
                <span className="spinner" aria-hidden="true" />
                <span>Reordenando categorías...</span>
              </div>
            ) : null}
            {categories.map((category, index) => (
              <div key={category._id} className="list-row">
                <div>
                  <strong>{category.name}</strong>
                  <p className="muted">{category.active ? "Activa" : "Inactiva"}</p>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    disabled={savingCategoryOrder || index === 0}
                    onClick={() => handleMoveCategory(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={savingCategoryOrder || index === categories.length - 1}
                    onClick={() => handleMoveCategory(index, 1)}
                  >
                    ↓
                  </button>
                  <button type="button" onClick={() => setCategoryForm({
                    id: category._id,
                    name: category.name,
                    image: category.image || "",
                    active: Boolean(category.active)
                  })}>
                    Editar
                  </button>
                  <button type="button" onClick={() => handleDeleteCategory(category._id)}>Eliminar</button>
                </div>
              </div>
            ))}
          </article>
        </section>
      ) : null}

      {!loading && activeTab === "products" ? (
        <section className="admin-grid two-columns">
          <article className="admin-card">
            <h2>{productForm.id ? "Editar producto" : "Nuevo producto"}</h2>
            <form className="admin-form" onSubmit={handleSubmitProduct}>
              <label htmlFor="productName">Nombre</label>
              <input
                id="productName"
                value={productForm.name}
                onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                required
              />

              <label htmlFor="productDescription">Descripción</label>
              <input
                id="productDescription"
                value={productForm.description}
                onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
              />

              <label htmlFor="productPrice">Precio</label>
              <input
                id="productPrice"
                type="number"
                min="0"
                value={productForm.price}
                onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
                required={!productForm.hasSizes}
                disabled={productForm.hasSizes}
              />

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={productForm.hasSizes}
                  onChange={(event) => setProductForm((current) => {
                    const nextHasSizes = event.target.checked;
                    const nextSizes = nextHasSizes
                      ? (current.sizes.length > 0 ? current.sizes : [{ name: "", price: "" }])
                      : [];
                    return {
                      ...current,
                      hasSizes: nextHasSizes,
                      sizes: nextSizes
                    };
                  })}
                />
                Este producto tiene tamaños
              </label>

              {productForm.hasSizes ? (
                <>
                  {(productForm.sizes || []).map((size, index) => (
                    <div key={`size-row-${index}`} className="inline-fields">
                      <input
                        placeholder="Nombre del tamaño (ej: Media libra)"
                        value={size.name}
                        onChange={(event) => setProductForm((current) => {
                          const nextSizes = [...(current.sizes || [])];
                          nextSizes[index] = { ...nextSizes[index], name: event.target.value };
                          return { ...current, sizes: nextSizes };
                        })}
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Precio"
                        value={size.price}
                        onChange={(event) => setProductForm((current) => {
                          const nextSizes = [...(current.sizes || [])];
                          nextSizes[index] = { ...nextSizes[index], price: event.target.value };
                          return { ...current, sizes: nextSizes };
                        })}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setProductForm((current) => {
                          const nextSizes = (current.sizes || []).filter((_, sizeIndex) => sizeIndex !== index);
                          return {
                            ...current,
                            sizes: nextSizes.length > 0 ? nextSizes : [{ name: "", price: "" }]
                          };
                        })}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setProductForm((current) => ({
                      ...current,
                      sizes: [...(current.sizes || []), { name: "", price: "" }]
                    }))}
                  >
                    Agregar tamaño
                  </button>
                </>
              ) : null}

              <label>Imagen</label>
              <div className="image-picker-row">
                <input
                  ref={productImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden-file-input"
                  onChange={(event) => handleSelectImage("product", event.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => productImageInputRef.current?.click()}
                >
                  Seleccionar imagen
                </button>
                <span className="muted">{productForm.image ? "Imagen seleccionada" : "Sin imagen"}</span>
              </div>
              <p className="image-help-text">Recomendado: 1080x1080 px, máximo 1 MB (JPG/PNG/WebP).</p>
              {productForm.image ? (
                <div className="image-preview-wrap">
                  <button
                    type="button"
                    className="remove-image-button"
                    aria-label="Quitar imagen"
                    onClick={() => {
                      setProductForm((current) => ({ ...current, image: "" }));
                      if (productImageInputRef.current) {
                        productImageInputRef.current.value = "";
                      }
                    }}
                  >
                    ×
                  </button>
                  <img src={productForm.image} alt="Previsualización producto" className="image-preview" />
                </div>
              ) : null}

              <label htmlFor="productCategory">Categoría</label>
              <select
                id="productCategory"
                value={productForm.category}
                onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}
                required
              >
                <option value="">Selecciona categoría</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
              </select>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={productForm.available}
                  onChange={(event) => setProductForm((current) => ({ ...current, available: event.target.checked }))}
                />
                Disponible
              </label>

              <button type="submit">{productForm.id ? "Actualizar" : "Crear"}</button>
            </form>
          </article>

          <article className="admin-card list-card">
            <h2>Productos</h2>
            {products.map((product) => (
              <div key={product._id} className="list-row">
                <div>
                  <strong>{product.name}</strong>
                  <p className="muted">{getProductDisplayPrice(product)}</p>
                </div>
                <div className="row-actions">
                  <button type="button" onClick={() => setProductForm({
                    id: product._id,
                    name: product.name,
                    description: product.description || "",
                    price: product.price || "",
                    hasSizes: Boolean(product.hasSizes) || normalizeProductSizes(product.sizes || []).length > 0,
                    sizes: normalizeProductSizes(product.sizes || []).map((size) => ({
                      name: size.name,
                      price: size.price
                    })),
                    image: product.image || "",
                    category: product.category?._id || product.category || "",
                    available: Boolean(product.available)
                  })}>
                    Editar
                  </button>
                  <button type="button" onClick={() => handleDeleteProduct(product._id)}>Eliminar</button>
                </div>
              </div>
            ))}
          </article>
        </section>
      ) : null}

      {!loading && activeTab === "delivery" ? (
        <section className="admin-grid two-columns">
          <article className="admin-card">
            <h2>{neighborhoodForm.id ? "Editar barrio" : "Nuevo barrio"}</h2>
            <form className="admin-form" onSubmit={handleSubmitNeighborhood}>
              <label htmlFor="neighborhoodName">Nombre</label>
              <input
                id="neighborhoodName"
                value={neighborhoodForm.name}
                onChange={(event) => setNeighborhoodForm((current) => ({ ...current, name: event.target.value }))}
                required
              />

              <label htmlFor="neighborhoodFee">Domicilio</label>
              <input
                id="neighborhoodFee"
                type="number"
                min="0"
                value={neighborhoodForm.deliveryFee}
                onChange={(event) => setNeighborhoodForm((current) => ({ ...current, deliveryFee: event.target.value }))}
                required
              />

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={neighborhoodForm.active}
                  onChange={(event) => setNeighborhoodForm((current) => ({ ...current, active: event.target.checked }))}
                />
                Activo
              </label>

              <button type="submit">{neighborhoodForm.id ? "Actualizar" : "Crear"}</button>
            </form>
          </article>

          <article className="admin-card list-card">
            <h2>Barrios</h2>
            {neighborhoods.map((neighborhood) => (
              <div key={neighborhood._id} className="list-row">
                <div>
                  <strong>{neighborhood.name}</strong>
                  <p className="muted">{MONEY.format(neighborhood.deliveryFee || 0)}</p>
                </div>
                <div className="row-actions">
                  <button type="button" onClick={() => setNeighborhoodForm({
                    id: neighborhood._id,
                    name: neighborhood.name,
                    deliveryFee: neighborhood.deliveryFee || "",
                    active: Boolean(neighborhood.active)
                  })}>
                    Editar
                  </button>
                  <button type="button" onClick={() => handleDeleteNeighborhood(neighborhood._id)}>Eliminar</button>
                </div>
              </div>
            ))}
          </article>
        </section>
      ) : null}

      {!loading && activeTab === "marketing" ? (
        <section className="admin-card">
          <h2>Push notifications</h2>
          <form className="admin-form" onSubmit={handleSubmitMarketing}>
            <label htmlFor="campaignTitle">Título</label>
            <input
              id="campaignTitle"
              value={marketingForm.title}
              onChange={(event) => setMarketingForm((current) => ({ ...current, title: event.target.value }))}
              required
            />

            <label htmlFor="campaignMessage">Mensaje</label>
            <textarea
              id="campaignMessage"
              value={marketingForm.message}
              onChange={(event) => setMarketingForm((current) => ({ ...current, message: event.target.value }))}
              required
            />

            <button type="submit">Enviar campaña</button>
          </form>
        </section>
      ) : null}

      {!loading && activeTab === "database" ? (
        <CustomerDatabasePanel
          onError={setError}
          onSuccess={showSuccess}
        />
      ) : null}

      {activeTab === "impulsa" ? (
        <ImpulsaPanel
          onError={setError}
          onSuccess={showSuccess}
        />
      ) : null}

      {activeTab === "recipes" ? (
        <RecipeBookPanel
          onError={setError}
          onSuccess={showSuccess}
        />
      ) : null}

      {activeTab === "billing" ? (
        <BillingPanel
          onError={setError}
          onSuccess={showSuccess}
        />
      ) : null}

      {activeTab === "accounting" ? (
        <AccountingPanel
          onError={setError}
          onSuccess={showSuccess}
        />
      ) : null}
        </div>
      </div>
    </main>
  );
}
