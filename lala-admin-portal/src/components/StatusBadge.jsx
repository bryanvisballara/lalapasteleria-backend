const STATUS_META = {
  pending: { label: "Pending", color: "#ef4444" },
  accepted: { label: "Accepted", color: "#f97316" },
  preparing: { label: "Preparing", color: "#eab308" },
  ready: { label: "Ready", color: "#3b82f6" },
  on_the_way: { label: "On the way", color: "#8b5cf6" },
  delivered: { label: "Delivered", color: "#22c55e" },
  cancelled: { label: "Cancelled", color: "#6b7280" }
};

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: "#6b7280" };

  return (
    <span
      style={{
        backgroundColor: `${meta.color}20`,
        color: meta.color,
        border: `1px solid ${meta.color}`,
        padding: "0.25rem 0.65rem",
        borderRadius: "999px",
        fontSize: "0.8rem",
        fontWeight: 600,
        textTransform: "uppercase"
      }}
    >
      {meta.label}
    </span>
  );
}
