import StatusBadge from "./StatusBadge";
import { getAmounts, MONEY, printComanda } from "../utils/printComanda";

const FLOW = ["pending", "accepted", "preparing", "ready", "on_the_way", "delivered"];
const ACTION_LABELS = {
  accepted: "Aceptar",
  preparing: "Preparando",
  ready: "Listo",
  on_the_way: "En camino",
  delivered: "Entregado"
};

const PAYMENT_METHOD_LABELS = {
  cash: "Efectivo",
  card: "Tarjeta",
  pse: "PSE"
};

const getElapsedLabel = (createdAt, nowTick) => {
  const createdMs = new Date(createdAt).getTime();
  const diffMinutes = Math.max(0, Math.floor((nowTick - createdMs) / 60000));

  if (diffMinutes < 1) {
    return "Recibido hace menos de 1 min";
  }

  if (diffMinutes < 60) {
    return `Recibido hace ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  return `Recibido hace ${diffHours} h`;
};

export default function OrderCard({ order, onChangeStatus, loadingStatus, nowTick }) {
  const currentIndex = FLOW.indexOf(order.status);
  const customerName = order.user
    ? `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim()
    : "Cliente";
  const customerPhone = order.user?.phone || "No registrado";
  const { subtotal, deliveryFee, total } = getAmounts(order);

  const nextStatus = currentIndex >= 0 && currentIndex < FLOW.length - 1
    ? FLOW[currentIndex + 1]
    : null;

  return (
    <article className="order-card">
      <div className="order-head">
        <h3>Pedido #{order._id.slice(-6)}</h3>
        <StatusBadge status={order.status} />
      </div>

      <p><strong>Cliente:</strong> {customerName}</p>
      <p><strong>Teléfono:</strong> {customerPhone}</p>
      <p><strong>Dirección:</strong> {order.address?.street} - {order.address?.neighborhood}</p>
      <p><strong>Método de pago:</strong> {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod || "No definido"}</p>
      <p><strong>Valor pedido:</strong> {MONEY.format(subtotal)}</p>
      <p><strong>Valor domicilio:</strong> {MONEY.format(deliveryFee)}</p>
      {order.paymentMethod === "cash" ? (
        <p className="order-cash-change">Cambio para: {order.cashPaymentAmount || "No indicado"}</p>
      ) : null}
      <p><strong>Total:</strong> {MONEY.format(total)}</p>
      <p className="muted">{getElapsedLabel(order.createdAt, nowTick)}</p>

      <div className="items-block">
        {order.customerComment ? <p className="order-cook-note"><strong>Comentarios:</strong> {order.customerComment}</p> : null}
        {order.items?.map((item) => (
          <p key={`${order._id}-${item.product?._id || item.product}`}>• {item.quantity} x {item.product?.name || "Producto"}</p>
        ))}
      </div>

      <div className="status-actions">
        {!nextStatus || order.status === "cancelled" ? (
          <span className="muted">Sin acciones disponibles</span>
        ) : (
          <>
            <button
              type="button"
              disabled={loadingStatus === order._id}
              onClick={() => onChangeStatus(order, nextStatus)}
            >
              {ACTION_LABELS[nextStatus] || nextStatus}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => printComanda(order)}
        >
          Reimprimir comanda
        </button>
      </div>
    </article>
  );
}
