import { useEffect, useMemo, useRef, useState } from "react";
import { getOrders, patchOrderStatus } from "../api/orders";
import { useAuth } from "../context/AuthContext";
import { connectSellerSocket } from "../socket/client";
import OrderCard from "../components/OrderCard";
import { printComanda } from "../utils/printComanda";
import LogoutFab from "../components/LogoutFab";

const ACTIVE_STATUSES = ["pending", "accepted", "preparing", "ready", "on_the_way"];
const STATUS_PRIORITY = {
  pending: 1,
  accepted: 2,
  preparing: 3,
  ready: 4,
  on_the_way: 5,
  delivered: 6,
  cancelled: 7
};

const TABS = [
  { key: "pending", label: "Pendientes", statuses: ["pending", "accepted"] },
  { key: "preparing", label: "En preparación", statuses: ["preparing", "ready"] },
  { key: "on_the_way", label: "En camino", statuses: ["on_the_way"] },
  { key: "delivered", label: "Entregados", statuses: ["delivered", "cancelled"] }
];

const isSameLocalDay = (dateValue) => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  );
};

export default function SellerPanelPage() {
  const { token, logout, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [nowTick, setNowTick] = useState(Date.now());
  const pendingAlarmIntervals = useRef(new Map());

  const playNotification = () => {
    const audio = new Audio("/notification.mp3");
    audio.play().catch(() => {});
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const loadOrders = async () => {
      try {
        setError("");
        const data = await getOrders();
        setOrders(data);
      } catch (loadError) {
        setError(loadError?.response?.data?.message || "No se pudieron cargar los pedidos");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = connectSellerSocket(token);

    socket.on("new_order", (incomingOrder) => {
      setOrders((currentOrders) => {
        const exists = currentOrders.some((order) => order._id === incomingOrder._id);
        if (exists) return currentOrders;
        return [incomingOrder, ...currentOrders];
      });

      playNotification();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    const tickInterval = setInterval(() => {
      setNowTick(Date.now());
    }, 30000);

    return () => clearInterval(tickInterval);
  }, []);

  useEffect(() => {
    const pendingIds = new Set(
      orders.filter((order) => order.status === "pending").map((order) => order._id)
    );

    orders.forEach((order) => {
      if (order.status === "pending" && !pendingAlarmIntervals.current.has(order._id)) {
        const intervalId = setInterval(() => {
          playNotification();
        }, 20000);
        pendingAlarmIntervals.current.set(order._id, intervalId);
      }
    });

    pendingAlarmIntervals.current.forEach((intervalId, orderId) => {
      if (!pendingIds.has(orderId)) {
        clearInterval(intervalId);
        pendingAlarmIntervals.current.delete(orderId);
      }
    });

    return undefined;
  }, [orders]);

  useEffect(() => {
    return () => {
      pendingAlarmIntervals.current.forEach((intervalId) => clearInterval(intervalId));
      pendingAlarmIntervals.current.clear();
    };
  }, []);

  const activeOrdersCount = useMemo(
    () => orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).length,
    [orders]
  );

  const sortedOrders = useMemo(() => {
    return [...orders].sort((firstOrder, secondOrder) => {
      const firstPriority = STATUS_PRIORITY[firstOrder.status] || 99;
      const secondPriority = STATUS_PRIORITY[secondOrder.status] || 99;

      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority;
      }

      return new Date(secondOrder.createdAt).getTime() - new Date(firstOrder.createdAt).getTime();
    });
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const tabConfig = TABS.find((tab) => tab.key === activeTab);
    if (!tabConfig) return sortedOrders;
    return sortedOrders.filter((order) => {
      if (!tabConfig.statuses.includes(order.status)) return false;

      if (tabConfig.key === "delivered") {
        const referenceDate = order.deliveredAt || order.updatedAt || order.createdAt;
        return isSameLocalDay(referenceDate);
      }

      return true;
    });
  }, [activeTab, sortedOrders]);

  const tabCounts = useMemo(() => {
    return TABS.reduce((accumulator, tab) => {
      accumulator[tab.key] = orders.filter((order) => {
        if (!tab.statuses.includes(order.status)) return false;

        if (tab.key === "delivered") {
          const referenceDate = order.deliveredAt || order.updatedAt || order.createdAt;
          return isSameLocalDay(referenceDate);
        }

        return true;
      }).length;
      return accumulator;
    }, {});
  }, [orders]);

  const handleChangeStatus = async (order, status) => {
    const orderId = order._id;

    try {
      setLoadingStatus(orderId);
      const updated = await patchOrderStatus(orderId, status);

      setOrders((currentOrders) =>
        currentOrders.map((order) => (order._id === orderId ? updated : order))
      );

      if (order.status === "pending" && status === "accepted") {
        printComanda(updated);
      }
    } catch (changeError) {
      setError(changeError?.response?.data?.message || "No se pudo actualizar el estado");
    } finally {
      setLoadingStatus("");
    }
  };

  return (
    <main className="panel-wrapper">
      <LogoutFab onConfirm={logout} />
      <header className="panel-header">
        <div>
          <h1>LALA PASTELERIA SELLER PANEL</h1>
          <p>Hola, {user?.firstName || "Seller"}</p>
        </div>
      </header>

      <section className="counter-box">
        <strong>🔴 {activeOrdersCount} Pedidos activos</strong>
      </section>

      <section className="tabs-row">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-button ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label} ({tabCounts[tab.key] || 0})
          </button>
        ))}
      </section>

      {error ? <p className="error-text">{error}</p> : null}

      {loading ? (
        <p className="muted">Cargando pedidos...</p>
      ) : (
        <section className="orders-grid">
          {filteredOrders.length === 0 ? (
            <p className="muted">No hay pedidos por ahora.</p>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                nowTick={nowTick}
                loadingStatus={loadingStatus}
                onChangeStatus={handleChangeStatus}
              />
            ))
          )}
        </section>
      )}
    </main>
  );
}
