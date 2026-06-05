import { useEffect, useMemo, useState } from "react";
import {
  createBillingSale,
  createCustomerInquiry,
  deleteCustomerInquiry,
  getCustomerInquiries,
  getRecipes,
  updateCustomerInquiry
} from "../api/admin";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_DIAL_CODE,
  formatPhoneForStorage,
  parseStoredPhone
} from "../utils/countryDialCodes";
import { generateBillingPdf } from "../utils/generateBillingPdf";
import { MONEY } from "../utils/printComanda";

const MAX_INSPIRATION_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const readFileAsDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
};

const toTodayInputValue = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptySaleItem = { recipeId: "", description: "", quantity: "1", unitSalePrice: "", unitCost: "" };

const recipeDescription = (recipe) => {
  if (!recipe) {
    return "";
  }

  return recipe.yieldLabel ? `${recipe.name} (${recipe.yieldLabel})` : recipe.name;
};

const emptySaleForm = {
  items: [{ ...emptySaleItem }],
  additionalCosts: ""
};

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
  const [savingAction, setSavingAction] = useState("");
  const [inquiries, setInquiries] = useState([]);
  const [form, setForm] = useState(emptyInquiry);
  const [filters, setFilters] = useState(emptyFilters);
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [saleForm, setSaleForm] = useState(emptySaleForm);
  const [inspirationImage, setInspirationImage] = useState(null);

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

  const loadRecipes = async () => {
    try {
      setRecipesLoading(true);
      const recipesData = await getRecipes();
      setRecipes(recipesData);
    } catch (loadError) {
      onError(loadError?.response?.data?.message || "No se pudo cargar el recetario");
    } finally {
      setRecipesLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
    loadRecipes();
  }, []);

  const resetSaleForm = () => {
    setSaleForm(emptySaleForm);
    setInspirationImage(null);
  };

  const handleRecipeSelect = (index, recipeId) => {
    const recipe = recipes.find((item) => item._id === recipeId);

    setSaleForm((current) => {
      const nextItems = [...current.items];

      if (recipe) {
        nextItems[index] = {
          ...nextItems[index],
          recipeId,
          description: recipeDescription(recipe),
          unitCost: String(recipe.totalCost ?? 0),
          unitSalePrice: recipe.suggestedSalePrice ? String(recipe.suggestedSalePrice) : ""
        };
      } else {
        nextItems[index] = {
          ...nextItems[index],
          recipeId: "",
          description: "",
          unitCost: "",
          unitSalePrice: ""
        };
      }

      return { ...current, items: nextItems };
    });
  };

  const salePreview = useMemo(() => {
    let totalSale = 0;
    let totalCost = 0;

    saleForm.items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      totalSale += qty * (Number(item.unitSalePrice) || 0);
      totalCost += qty * (Number(item.unitCost) || 0);
    });

    totalCost += Number(saleForm.additionalCosts) || 0;

    return {
      totalSale,
      totalCost,
      profit: totalSale - totalCost
    };
  }, [saleForm]);

  const handleInspirationImageChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setInspirationImage(null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      onError("Solo se permiten imágenes JPG, PNG, WEBP o GIF");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_INSPIRATION_IMAGE_BYTES) {
      onError("La imagen no puede superar 5 MB");
      event.target.value = "";
      return;
    }

    try {
      onError("");
      const dataUrl = await readFileAsDataUrl(file);
      setInspirationImage({
        fileName: file.name,
        mimeType: file.type,
        dataUrl,
        previewUrl: dataUrl
      });
    } catch {
      onError("No se pudo cargar la imagen");
      event.target.value = "";
    }
  };

  const clearInspirationImage = () => {
    setInspirationImage(null);
  };

  const buildCustomerPayload = () => ({
    firstName: form.firstName,
    lastName: form.lastName,
    phone: formatPhoneForStorage(form.phoneCountryCode, form.phoneLocal),
    cakeRecipient: form.cakeRecipient,
    neededDate: form.neededDate,
    observations: form.observations
  });

  const buildSaleNotes = () => {
    const parts = [
      form.cakeRecipient ? `Torta para: ${form.cakeRecipient}` : "",
      form.neededDate ? `Fecha necesaria: ${form.neededDate}` : "",
      form.observations || ""
    ].filter(Boolean);

    return parts.join("\n");
  };

  const buildSalePayload = () => ({
    saleDate: toTodayInputValue(),
    customerName: `${form.firstName} ${form.lastName}`.trim(),
    items: saleForm.items
      .filter((item) => item.recipeId && Number(item.quantity) > 0)
      .map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitSalePrice: Number(item.unitSalePrice),
        unitCost: Number(item.unitCost) || 0
      })),
    additionalCosts: Number(saleForm.additionalCosts) || 0,
    notes: buildSaleNotes()
  });

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

    const payload = buildCustomerPayload();

    try {
      setSaving(true);
      setSavingAction("client");
      onError("");

      if (form.id) {
        const updated = await updateCustomerInquiry(form.id, payload);
        setInquiries((current) => current.map((item) => (item._id === updated._id ? updated : item)));
        onSuccess("Cliente actualizado");
      } else {
        const created = await createCustomerInquiry(payload);
        setInquiries((current) => [created, ...current]);
        onSuccess("Cliente registrado");
        resetSaleForm();
      }

      setForm(emptyInquiry);
    } catch (submitError) {
      onError(submitError?.response?.data?.message || "No se pudo guardar el cliente");
    } finally {
      setSaving(false);
      setSavingAction("");
    }
  };

  const handleRegisterSale = async () => {
    const formElement = document.getElementById("customer-database-form");

    if (!formElement?.reportValidity()) {
      return;
    }

    const saleItems = saleForm.items.filter(
      (item) => item.recipeId && Number(item.quantity) > 0 && Number(item.unitSalePrice) >= 0
    );

    if (!saleItems.length) {
      onError("Selecciona al menos un producto del recetario con cantidad y precio de venta");
      return;
    }

    const payload = buildCustomerPayload();
    const salePayload = buildSalePayload();

    if (!salePayload.items.length) {
      onError("Selecciona al menos un producto del recetario");
      return;
    }

    if (inspirationImage?.dataUrl) {
      salePayload.inspirationImage = {
        fileName: inspirationImage.fileName,
        mimeType: inspirationImage.mimeType,
        data: inspirationImage.dataUrl
      };
    }

    const imageForPdf = inspirationImage?.dataUrl || "";

    try {
      setSaving(true);
      setSavingAction("sale");
      onError("");

      const created = await createCustomerInquiry(payload);
      setInquiries((current) => [created, ...current]);

      const savedSale = await createBillingSale(salePayload);
      await generateBillingPdf(savedSale, imageForPdf);

      setForm(emptyInquiry);
      resetSaleForm();
      onSuccess("Cliente registrado, venta guardada y PDF generado");
    } catch (submitError) {
      onError(submitError?.response?.data?.message || "No se pudo registrar la venta");
    } finally {
      setSaving(false);
      setSavingAction("");
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
    <section className="customer-database-stack">
      <article id="customer-form-section" className="admin-card customer-database-form-card">
        <h2>{form.id ? "Editar cliente" : "Nuevo cliente"}</h2>
        <p className="muted customer-database-help">
          Registra solicitudes de tortas (WhatsApp, Instagram, etc.): quién contacta, para quién es la torta, fecha y notas.
        </p>

        <form id="customer-database-form" className="admin-form customer-database-form-grid" onSubmit={handleSubmit}>
          <div className="customer-form-field">
            <label htmlFor="clientFirstName">Nombre</label>
            <input
              id="clientFirstName"
              value={form.firstName}
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              required
            />
          </div>

          <div className="customer-form-field">
            <label htmlFor="clientLastName">Apellido</label>
            <input
              id="clientLastName"
              value={form.lastName}
              onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              required
            />
          </div>

          <div className="customer-form-field customer-form-field--full">
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
          </div>

          <div className="customer-form-field customer-form-field--full">
            <label htmlFor="cakeRecipient">¿Para quién va dirigida la torta?</label>
            <input
              id="cakeRecipient"
              value={form.cakeRecipient}
              onChange={(event) => setForm((current) => ({ ...current, cakeRecipient: event.target.value }))}
              placeholder="Ej: Mamá de María, cumpleaños de Juan"
              required
            />
          </div>

          <div className="customer-form-field">
            <label htmlFor="neededDate">Fecha en que la necesitan</label>
            <input
              id="neededDate"
              type="date"
              value={form.neededDate}
              onChange={(event) => setForm((current) => ({ ...current, neededDate: event.target.value }))}
              required
            />
          </div>

          <div className="customer-form-field customer-form-field--full">
            <label htmlFor="observations">Observaciones</label>
            <textarea
              id="observations"
              value={form.observations}
              onChange={(event) => setForm((current) => ({ ...current, observations: event.target.value }))}
              placeholder="Sabor, decoración, alergias, entrega, etc."
            />
          </div>

          {!form.id ? (
            <div className="customer-form-field customer-form-field--full customer-sale-section">
              <h3>Venta</h3>
              <p className="muted customer-database-help">
                Si el cliente solo cotizó, usa «Guardar cliente». Si ya cerró la venta, elige el producto,
                ajusta el precio y registra la factura con PDF.
              </p>

              <label>Producto</label>
              {!recipesLoading && !recipes.length ? (
                <p className="muted">Primero crea recetas en el Recetario para registrar ventas.</p>
              ) : null}
              {saleForm.items.map((item, index) => (
                <div key={`customer-sale-item-${index}`} className="billing-item-row">
                  <select
                    value={item.recipeId}
                    onChange={(event) => handleRecipeSelect(index, event.target.value)}
                    disabled={recipesLoading || !recipes.length}
                  >
                    <option value="">
                      {recipesLoading ? "Cargando recetas..." : "Selecciona producto del recetario"}
                    </option>
                    {recipes.map((recipe) => (
                      <option key={recipe._id} value={recipe._id}>
                        {recipe.name}
                        {recipe.yieldLabel ? ` · ${recipe.yieldLabel}` : ""}
                        {" — costo "}
                        {MONEY.format(recipe.totalCost)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Cant."
                    value={item.quantity}
                    onChange={(event) => setSaleForm((current) => {
                      const nextItems = [...current.items];
                      nextItems[index] = { ...nextItems[index], quantity: event.target.value };
                      return { ...current, items: nextItems };
                    })}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Precio venta"
                    value={item.unitSalePrice}
                    onChange={(event) => setSaleForm((current) => {
                      const nextItems = [...current.items];
                      nextItems[index] = { ...nextItems[index], unitSalePrice: event.target.value };
                      return { ...current, items: nextItems };
                    })}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Costo unit."
                    value={item.unitCost}
                    readOnly={Boolean(item.recipeId)}
                    title={item.recipeId ? "Costo tomado del recetario" : "Costo unitario"}
                    onChange={(event) => setSaleForm((current) => {
                      const nextItems = [...current.items];
                      nextItems[index] = { ...nextItems[index], unitCost: event.target.value };
                      return { ...current, items: nextItems };
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setSaleForm((current) => {
                      const nextItems = current.items.filter((_, itemIndex) => itemIndex !== index);
                      return {
                        ...current,
                        items: nextItems.length ? nextItems : [{ ...emptySaleItem }]
                      };
                    })}
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSaleForm((current) => ({
                  ...current,
                  items: [...current.items, { ...emptySaleItem }]
                }))}
              >
                + Agregar línea
              </button>

              <label htmlFor="customerAdditionalCosts">Costos adicionales del pedido</label>
              <input
                id="customerAdditionalCosts"
                type="number"
                min="0"
                value={saleForm.additionalCosts}
                onChange={(event) => setSaleForm((current) => ({ ...current, additionalCosts: event.target.value }))}
                placeholder="Domicilio, empaque extra..."
              />

              <label htmlFor="customerInspirationImage">Foto de inspiración (opcional)</label>
              <div className="billing-attachment-field">
                <input
                  id="customerInspirationImage"
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(",")}
                  onChange={handleInspirationImageChange}
                />
                <p className="muted billing-attachment-hint">
                  Adjunta la foto que envió el cliente como referencia para la torta.
                </p>
                {inspirationImage?.previewUrl ? (
                  <div className="billing-attachment-preview">
                    <img src={inspirationImage.previewUrl} alt="Vista previa de inspiración" />
                    <div className="billing-attachment-meta">
                      <span>{inspirationImage.fileName}</span>
                      <button type="button" onClick={clearInspirationImage}>
                        Quitar foto
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="recipe-cost-summary">
                <p><strong>Venta:</strong> {MONEY.format(salePreview.totalSale)}</p>
                <p><strong>Costo:</strong> {MONEY.format(salePreview.totalCost)}</p>
                <p><strong>Utilidad:</strong> {MONEY.format(salePreview.profit)}</p>
              </div>
            </div>
          ) : null}

          <div className="customer-form-actions">
            <button type="submit" disabled={saving}>
              {saving && savingAction === "client"
                ? "Guardando..."
                : form.id
                  ? "Actualizar cliente"
                  : "Guardar cliente"}
            </button>
            {!form.id ? (
              <button
                type="button"
                className="customer-sale-btn"
                disabled={saving || recipesLoading || !recipes.length}
                onClick={handleRegisterSale}
              >
                {saving && savingAction === "sale" ? "Registrando..." : "Registrar venta y generar PDF"}
              </button>
            ) : null}
            {form.id ? (
              <button type="button" onClick={() => setForm(emptyInquiry)}>
                Cancelar edición
              </button>
            ) : null}
          </div>
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
