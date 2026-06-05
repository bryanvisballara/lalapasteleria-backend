import { useEffect, useState } from "react";
import { getImpulsaInteractions, markImpulsaContacted } from "../api/admin";
import { buildImpulsaWhatsAppMessage, buildWhatsAppUrl } from "../utils/whatsapp";

const toDateInputValue = (dateValue = new Date()) => {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value) => {
  if (!value) return null;

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  return new Date(value);
};

const formatDateLong = (value) => {
  if (!value) return "—";

  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseDateInput(value)
    : new Date(value);

  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

const formatDateShort = (value) => {
  if (!value) return "—";

  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseDateInput(value)
    : new Date(value);

  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

function WhatsAppIcon() {
  return (
    <svg className="impulsa-btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.02.53 3.94 1.53 5.63L2.05 22l4.52-1.18a9.9 9.9 0 0 0 5.47 1.64h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.8 9.8 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.2 8.2 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23h-.01a8.1 8.1 0 0 1-4.1-1.12l-.3-.17-3.3.86.88-3.22-.19-.3a8.1 8.1 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24M9.53 8.33c-.16 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.39 1 2.56.14.17 1.78 2.86 4.36 3.9.62.27 1.1.42 1.48.54.62.2 1.19.17 1.64.1.5-.07 1.53-.63 1.74-1.24.22-.6.22-1.12.15-1.24-.07-.11-.27-.18-.57-.31-.3-.14-1.48-.73-1.71-.81-.23-.08-.39-.12-.56.12-.17.23-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg className="impulsa-btn-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 8h14M5 8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8m-6 4h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImpulsaActionButtons({ inquiry, onContacted, onError }) {
  const whatsappUrl = buildWhatsAppUrl(inquiry.phone, buildImpulsaWhatsAppMessage(inquiry));

  const handleWhatsApp = () => {
    if (!whatsappUrl) {
      onError("Este cliente no tiene teléfono registrado para WhatsApp");
      return;
    }

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="customer-table-actions">
      <button
        type="button"
        className="table-icon-btn whatsapp"
        onClick={handleWhatsApp}
        title="Escribir por WhatsApp"
        aria-label="Escribir por WhatsApp"
      >
        <WhatsAppIcon />
      </button>
      {onContacted ? (
        <button
          type="button"
          className="table-icon-btn archive"
          onClick={() => onContacted(inquiry._id)}
          title="Marcar como contactado"
          aria-label="Marcar como contactado"
        >
          <ArchiveIcon />
        </button>
      ) : null}
    </div>
  );
}

function ImpulsaUpcomingTable({ inquiries, onContacted, onError }) {
  return (
    <div className="table-scroll">
      <table className="sales-table customer-table impulsa-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Teléfono</th>
            <th>Torta para</th>
            <th>Fecha este año</th>
            <th>Fecha original</th>
            <th>Observaciones</th>
            <th className="customer-table-actions-col">Acción</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map((inquiry) => (
            <tr key={inquiry._id}>
              <td><strong>{inquiry.firstName} {inquiry.lastName}</strong></td>
              <td>{inquiry.phone || "—"}</td>
              <td>{inquiry.cakeRecipient}</td>
              <td>{formatDateShort(inquiry.projectedNeededDate || inquiry.neededDate)}</td>
              <td>{formatDateShort(inquiry.neededDate)}</td>
              <td className="customer-table-observations">{inquiry.observations || "—"}</td>
              <td>
                <ImpulsaActionButtons
                  inquiry={inquiry}
                  onContacted={onContacted}
                  onError={onError}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImpulsaContactedTable({ inquiries, onError }) {
  return (
    <div className="table-scroll">
      <table className="sales-table customer-table impulsa-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Teléfono</th>
            <th>Torta para</th>
            <th>Fecha tentativa</th>
            <th>Contactado</th>
            <th>Visible hasta</th>
            <th>Observaciones</th>
            <th className="customer-table-actions-col">Acción</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map((inquiry) => (
            <tr key={`contacted-${inquiry._id}`}>
              <td><strong>{inquiry.firstName} {inquiry.lastName}</strong></td>
              <td>{inquiry.phone || "—"}</td>
              <td>{inquiry.cakeRecipient}</td>
              <td>{formatDateShort(inquiry.neededDate)}</td>
              <td>{formatDateShort(inquiry.impulsaContactedAt)}</td>
              <td>{formatDateShort(inquiry.visibleUntil)}</td>
              <td className="customer-table-observations">{inquiry.observations || "—"}</td>
              <td>
                <ImpulsaActionButtons inquiry={inquiry} onError={onError} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ImpulsaPanel({ onError, onSuccess }) {
  const [referenceDate, setReferenceDate] = useState(toDateInputValue());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    upcoming: [],
    contacted: [],
    windowEnd: null
  });

  const loadImpulsa = async (dateValue = referenceDate) => {
    try {
      setLoading(true);
      onError("");
      const response = await getImpulsaInteractions(dateValue);
      setData({
        upcoming: response.upcoming || [],
        contacted: response.contacted || [],
        windowEnd: response.windowEnd
      });
    } catch (loadError) {
      onError(loadError?.response?.data?.message || "No se pudieron cargar las interacciones IMPULSA");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImpulsa(referenceDate);
  }, [referenceDate]);

  const handleMarkContacted = async (id) => {
    try {
      onError("");
      await markImpulsaContacted(id);
      await loadImpulsa(referenceDate);
      onSuccess("Cliente movido a contactados. Desaparecerá de esa lista en 5 días.");
    } catch (contactError) {
      onError(contactError?.response?.data?.message || "No se pudo marcar como contactado");
    }
  };

  const windowLabel = data.windowEnd
    ? `${formatDateLong(referenceDate)} — ${formatDateLong(data.windowEnd)}`
    : formatDateLong(referenceDate);

  return (
    <section className="impulsa-panel">
      <header className="impulsa-header admin-card">
        <div>
          <h2>IMPULSA</h2>
          <p className="muted">
            Seguimiento anual: clientes cuya fecha de torta (mes y día) cae en las próximas 2 semanas desde la fecha elegida,
            sin importar si pidieron hace 1, 2, 10 años o más. No aparecen cotizaciones nuevas de esta semana (ya las atendiste).
          </p>
        </div>
        <div className="impulsa-date-field">
          <label htmlFor="impulsaReferenceDate">Fecha de referencia</label>
          <input
            id="impulsaReferenceDate"
            type="date"
            value={referenceDate}
            onChange={(event) => setReferenceDate(event.target.value)}
          />
        </div>
      </header>

      <section className="admin-card impulsa-section">
        <div className="impulsa-section-head">
          <h3>Interacciones próximas 2 semanas</h3>
          <p className="muted">Intervalo: {windowLabel}</p>
        </div>

        {loading ? <p className="muted">Cargando interacciones...</p> : null}

        {!loading && !data.upcoming.length ? (
          <p className="muted impulsa-empty">
            No hay clientes en este intervalo ({windowLabel}). IMPULSA muestra quienes celebran (fecha de torta)
            {" "}en las próximas 2 semanas desde la fecha de referencia, de cualquier año anterior.
            Deja la fecha de hoy como referencia: si la torta es el 19 de junio, el cliente aparece desde el 5 de junio.
          </p>
        ) : null}

        {!loading && data.upcoming.length ? (
          <ImpulsaUpcomingTable
            inquiries={data.upcoming}
            onContacted={handleMarkContacted}
            onError={onError}
          />
        ) : null}
      </section>

      <section className="admin-card impulsa-section impulsa-contacted-section">
        <div className="impulsa-section-head">
          <h3>Ya contactados</h3>
          <p className="muted">Estos contactos se ocultan aquí automáticamente después de 5 días (siguen en la base de datos).</p>
        </div>

        {!loading && !data.contacted.length ? (
          <p className="muted impulsa-empty">Nadie en esta lista por ahora.</p>
        ) : null}

        {!loading && data.contacted.length ? (
          <ImpulsaContactedTable
            inquiries={data.contacted}
            onError={onError}
          />
        ) : null}
      </section>
    </section>
  );
}
