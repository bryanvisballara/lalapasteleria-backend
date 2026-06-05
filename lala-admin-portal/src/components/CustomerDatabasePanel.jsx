import { useEffect, useMemo, useState } from "react";
import {
  createCustomerInquiry,
  deleteCustomerInquiry,
  getCustomerInquiries,
  updateCustomerInquiry
} from "../api/admin";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_DIAL_CODE,
  formatPhoneForStorage,
  parseStoredPhone
} from "../utils/countryDialCodes";

const emptyInquiry = {
  id: "",
  firstName: "",
  lastName: "",
  phoneCountryCode: DEFAULT_DIAL_CODE,
  phoneLocal: "",
  cakeRecipient: "",
  neededDate: "",
  observations: ""
};

const emptyFilters = {
  search: "",
  neededDateFrom: "",
  neededDateTo: ""
};

const toDateInputValue = (value) => {
  if (!value) return "";

  const dateValue = new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return "";
  }

  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatNeededDateShort = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CustomerDatabasePanel({ onError, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [form, setForm] = useState(emptyInquiry);
  const [filters, setFilters] = useState(emptyFilters);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const data = await getCustomerInquiries();
      setInquiries(Array.isArray(data) ? data : []);
    } catch (loadError) {
      onError(loadError?.response?.data?.message || "No se pudieron cargar los clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  const filteredInquiries = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return inquiries.filter((inquiry) => {
      if (search) {
        const haystack = [
          inquiry.firstName,
          inquiry.lastName,
          inquiry.phone,
          inquiry.cakeRecipient,
          inquiry.observations
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(search)) {
          return false;
        }
      }

      if (filters.neededDateFrom) {
        const from = new Date(`${filters.neededDateFrom}T00:00:00`);
        const needed = new Date(inquiry.neededDate);

        if (needed < from) {
          return false;
        }
      }

      if (filters.neededDateTo) {
        const to = new Date(`${filters.neededDateTo}T23:59:59`);
        const needed = new Date(inquiry.neededDate);

        if (needed > to) {
          return false;
        }
      }

      return true;
    });
  }, [inquiries, filters]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: formatPhoneForStorage(form.phoneCountryCode, form.phoneLocal),
      cakeRecipient: form.cakeRecipient,
      neededDate: form.neededDate,
      observations: form.observations
    };

    try {
      setSaving(true);
      onError("");

      if (form.id) {
        const updated = await updateCustomerInquiry(form.id, payload);
        setInquiries((current) => current.map((item) => (item._id === updated._id ? updated : item)));
        onSuccess("Cliente actualizado");
      } else {
        const created = await createCustomerInquiry(payload);
        setInquiries((current) => [created, ...current]);
        onSuccess("Cliente registrado");
      }

      setForm(emptyInquiry);
    } catch (submitError) {
      onError(submitError?.response?.data?.message || "No se pudo guardar el cliente");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (inquiry) => {
    const { phoneCountryCode, phoneLocal } = parseStoredPhone(inquiry.phone);

    setForm({
      id: inquiry._id,
      firstName: inquiry.firstName || "",
      lastName: inquiry.lastName || "",
      phoneCountryCode,
      phoneLocal,
      cakeRecipient: inquiry.cakeRecipient || "",
      neededDate: toDateInputValue(inquiry.neededDate),
      observations: inquiry.observations || ""
    });

    document.getElementById("customer-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este registro de cliente?")) {
      return;
    }

    try {
      onError("");
      await deleteCustomerInquiry(id);
      setInquiries((current) => current.filter((item) => item._id !== id));

      if (form.id === id) {
        setForm(emptyInquiry);
      }

      onSuccess("Registro eliminado");
    } catch (deleteError) {
      onError(deleteError?.response?.data?.message || "No se pudo eliminar el registro");
    }
  };

  return (
    <section className="customer-database-layout">
      <article id="customer-form-section" className="admin-card">
        <h2>{form.id ? "Editar cliente" : "Nuevo cliente"}</h2>
        <p className="muted customer-database-help">
          Registra solicitudes de tortas (WhatsApp, Instagram, etc.): quién contacta, para quién es la torta, fecha y notas.
        </p>

        <form className="admin-form" onSubmit={handleSubmit}>
          <label htmlFor="clientFirstName">Nombre</label>
          <input
            id="clientFirstName"
            value={form.firstName}
            onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
            required
          />

          <label htmlFor="clientLastName">Apellido</label>
          <input
            id="clientLastName"
            value={form.lastName}
            onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
            required
          />

          <label htmlFor="clientPhoneLocal">Teléfono / WhatsApp (opcional)</label>
          <div className="phone-input-row">
            <select
              id="clientPhoneCode"
              className="phone-code-select"
              value={form.phoneCountryCode}
              onChange={(event) => setForm((current) => ({ ...current, phoneCountryCode: event.target.value }))}
              aria-label="Código de país"
            >
              {COUNTRY_DIAL_CODES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.code} {country.label}
                </option>
              ))}
            </select>
            <input
              id="clientPhoneLocal"
              type="tel"
              inputMode="tel"
              value={form.phoneLocal}
              onChange={(event) => setForm((current) => ({ ...current, phoneLocal: event.target.value }))}
              placeholder="300 000 0000"
            />
          </div>

          <label htmlFor="cakeRecipient">¿Para quién va dirigida la torta?</label>
          <input
            id="cakeRecipient"
            value={form.cakeRecipient}
            onChange={(event) => setForm((current) => ({ ...current, cakeRecipient: event.target.value }))}
            placeholder="Ej: Mamá de María, cumpleaños de Juan"
            required
          />

          <label htmlFor="neededDate">Fecha en que la necesitan</label>
          <input
            id="neededDate"
            type="date"
            value={form.neededDate}
            onChange={(event) => setForm((current) => ({ ...current, neededDate: event.target.value }))}
            required
          />

          <label htmlFor="observations">Observaciones</label>
          <textarea
            id="observations"
            value={form.observations}
            onChange={(event) => setForm((current) => ({ ...current, observations: event.target.value }))}
            placeholder="Sabor, decoración, alergias, entrega, etc."
          />

          <button type="submit" disabled={saving}>
            {saving ? "Guardando..." : form.id ? "Actualizar cliente" : "Guardar cliente"}
          </button>
          {form.id ? (
            <button type="button" onClick={() => setForm(emptyInquiry)}>
              Cancelar edición
            </button>
          ) : null}
        </form>
      </article>

      <article className="admin-card customer-database-table-card">
        <div className="customer-database-table-head">
          <h2>Clientes registrados</h2>
          <p className="muted">
            {loading ? "Cargando..." : `${filteredInquiries.length} de ${inquiries.length} registros`}
          </p>
        </div>

        <div className="customer-filters">
          <div className="customer-filter-field customer-filter-search">
            <label htmlFor="filterSearch">Buscar</label>
            <input
              id="filterSearch"
              type="search"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Nombre, teléfono, destinatario, notas..."
            />
          </div>
          <div className="customer-filter-field">
            <label htmlFor="filterDateFrom">Fecha torta desde</label>
            <input
              id="filterDateFrom"
              type="date"
              value={filters.neededDateFrom}
              onChange={(event) => setFilters((current) => ({ ...current, neededDateFrom: event.target.value }))}
            />
          </div>
          <div className="customer-filter-field">
            <label htmlFor="filterDateTo">Fecha torta hasta</label>
            <input
              id="filterDateTo"
              type="date"
              value={filters.neededDateTo}
              onChange={(event) => setFilters((current) => ({ ...current, neededDateTo: event.target.value }))}
            />
          </div>
          {(filters.search || filters.neededDateFrom || filters.neededDateTo) ? (
            <button
              type="button"
              className="customer-filter-clear"
              onClick={() => setFilters(emptyFilters)}
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>

        {loading ? <p className="muted">Cargando registros...</p> : null}

        {!loading && !inquiries.length ? (
          <p className="muted">
            Aún no hay clientes en la base de datos de producción. Si ya cargaste registros en otro entorno,
            revisa que Render use la misma `MONGO_URI` con la base `lalapasteleria`.
          </p>
        ) : null}

        {!loading && inquiries.length && !filteredInquiries.length ? (
          <p className="muted">No hay clientes que coincidan con los filtros.</p>
        ) : null}

        {!loading && filteredInquiries.length ? (
          <div className="table-scroll">
            <table className="sales-table customer-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Teléfono</th>
                  <th>Torta para</th>
                  <th>Fecha</th>
                  <th>Observaciones</th>
                  <th className="customer-table-actions-col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.map((inquiry) => (
                  <tr key={inquiry._id} className={form.id === inquiry._id ? "customer-row-editing" : ""}>
                    <td>{inquiry.firstName}</td>
                    <td>{inquiry.lastName}</td>
                    <td>{inquiry.phone || "—"}</td>
                    <td>{inquiry.cakeRecipient}</td>
                    <td>{formatNeededDateShort(inquiry.neededDate)}</td>
                    <td className="customer-table-observations">{inquiry.observations || "—"}</td>
                    <td>
                      <div className="customer-table-actions">
                        <button
                          type="button"
                          className="table-icon-btn edit"
                          onClick={() => handleEdit(inquiry)}
                          title="Editar"
                          aria-label={`Editar ${inquiry.firstName} ${inquiry.lastName}`}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn delete"
                          onClick={() => handleDelete(inquiry._id)}
                          title="Eliminar"
                          aria-label={`Eliminar ${inquiry.firstName} ${inquiry.lastName}`}
                        >
                          <CloseIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  );
}
