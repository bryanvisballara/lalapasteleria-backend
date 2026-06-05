import { useEffect, useMemo, useState } from "react";
import {
  createBillingSale,
  deleteBillingSale,
  getBillingSales,
  getBillingSummary,
  getRecipes
} from "../api/admin";
import { MONEY } from "../utils/printComanda";
import { generateBillingPdf } from "../utils/generateBillingPdf";

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

const toDateInputValue = (dateValue = new Date()) => {
  const date = new Date(dateValue);
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
  customerName: "",
  items: [{ ...emptySaleItem }],
  additionalCosts: "",
  notes: ""
};

export default function BillingPanel({ onError, onSuccess }) {
  const [saleDate, setSaleDate] = useState(toDateInputValue());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({
    salesCount: 0,
    totalSale: 0,
    totalCost: 0,
    profit: 0
  });
  const [form, setForm] = useState(emptySaleForm);
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [inspirationImage, setInspirationImage] = useState(null);

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

  const loadBilling = async (dateValue = saleDate) => {
    try {
      setLoading(true);
      onError("");
      const [salesData, summaryData] = await Promise.all([
        getBillingSales(dateValue),
        getBillingSummary(dateValue)
      ]);
      setSales(salesData);
      setSummary(summaryData);
    } catch (loadError) {
      onError(loadError?.response?.data?.message || "No se pudo cargar facturación");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  useEffect(() => {
    loadBilling(saleDate);
  }, [saleDate]);

  const handleRecipeSelect = (index, recipeId) => {
    const recipe = recipes.find((item) => item._id === recipeId);

    setForm((current) => {
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

  const formPreview = useMemo(() => {
    let totalSale = 0;
    let totalCost = 0;

    form.items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      totalSale += qty * (Number(item.unitSalePrice) || 0);
      totalCost += qty * (Number(item.unitCost) || 0);
    });

    totalCost += Number(form.additionalCosts) || 0;

    return {
      totalSale,
      totalCost,
      profit: totalSale - totalCost
    };
  }, [form]);

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      saleDate,
      customerName: form.customerName,
      items: form.items
        .filter((item) => item.recipeId && Number(item.quantity) > 0)
        .map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitSalePrice: Number(item.unitSalePrice),
          unitCost: Number(item.unitCost) || 0
        })),
      additionalCosts: Number(form.additionalCosts) || 0,
      notes: form.notes
    };

    if (inspirationImage?.dataUrl) {
      payload.inspirationImage = {
        fileName: inspirationImage.fileName,
        mimeType: inspirationImage.mimeType,
        data: inspirationImage.dataUrl
      };
    }

    const imageForPdf = inspirationImage?.dataUrl || "";

    try {
      setSaving(true);
      onError("");
      const savedSale = await createBillingSale(payload);
      await generateBillingPdf(savedSale, imageForPdf);
      setForm({ ...emptySaleForm, items: [{ ...emptySaleItem }] });
      clearInspirationImage();
      await loadBilling(saleDate);
      onSuccess("Venta registrada y PDF generado");
    } catch (submitError) {
      onError(submitError?.response?.data?.message || "No se pudo registrar la venta");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta venta del día?")) {
      return;
    }

    try {
      onError("");
      await deleteBillingSale(id);
      await loadBilling(saleDate);
      onSuccess("Venta eliminada");
    } catch (deleteError) {
      onError(deleteError?.response?.data?.message || "No se pudo eliminar la venta");
    }
  };

  return (
    <section className="billing-panel">
      <header className="admin-card billing-header">
        <div>
          <h2>Facturación interna</h2>
          <p className="muted">Registra ventas del día y revisa cuánto vendiste, cuánto costó y la utilidad.</p>
        </div>
        <div className="impulsa-date-field">
          <label htmlFor="billingDate">Día</label>
          <input
            id="billingDate"
            type="date"
            value={saleDate}
            onChange={(event) => setSaleDate(event.target.value)}
          />
        </div>
      </header>

      <section className="admin-grid metrics-grid billing-kpis">
        <article className="admin-card">
          <h3>Ventas del día</h3>
          <strong>{MONEY.format(summary.totalSale)}</strong>
          <p className="muted">{summary.salesCount} facturas</p>
        </article>
        <article className="admin-card">
          <h3>Costos del día</h3>
          <strong>{MONEY.format(summary.totalCost)}</strong>
        </article>
        <article className="admin-card">
          <h3>Utilidad del día</h3>
          <strong className={summary.profit >= 0 ? "profit-positive" : "profit-negative"}>
            {MONEY.format(summary.profit)}
          </strong>
        </article>
      </section>

      <article className="admin-card">
        <h3>Nueva venta / factura</h3>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label htmlFor="billingCustomer">Cliente (opcional)</label>
          <input
            id="billingCustomer"
            value={form.customerName}
            onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
            placeholder="Nombre del cliente"
          />

          <label>Productos vendidos</label>
          {!recipesLoading && !recipes.length ? (
            <p className="muted">Primero crea recetas en el Recetario para registrar ventas.</p>
          ) : null}
          {form.items.map((item, index) => (
            <div key={`sale-item-${index}`} className="billing-item-row">
              <select
                value={item.recipeId}
                onChange={(event) => handleRecipeSelect(index, event.target.value)}
                required
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
                onChange={(event) => setForm((current) => {
                  const nextItems = [...current.items];
                  nextItems[index] = { ...nextItems[index], quantity: event.target.value };
                  return { ...current, items: nextItems };
                })}
                required
              />
              <input
                type="number"
                min="0"
                placeholder="Precio venta"
                value={item.unitSalePrice}
                onChange={(event) => setForm((current) => {
                  const nextItems = [...current.items];
                  nextItems[index] = { ...nextItems[index], unitSalePrice: event.target.value };
                  return { ...current, items: nextItems };
                })}
                required
              />
              <input
                type="number"
                min="0"
                placeholder="Costo unit."
                value={item.unitCost}
                readOnly={Boolean(item.recipeId)}
                title={item.recipeId ? "Costo tomado del recetario" : "Costo unitario"}
                onChange={(event) => setForm((current) => {
                  const nextItems = [...current.items];
                  nextItems[index] = { ...nextItems[index], unitCost: event.target.value };
                  return { ...current, items: nextItems };
                })}
              />
              <button
                type="button"
                onClick={() => setForm((current) => {
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
            onClick={() => setForm((current) => ({
              ...current,
              items: [...current.items, { ...emptySaleItem }]
            }))}
          >
            + Agregar línea
          </button>

          <label htmlFor="billingAdditionalCosts">Costos adicionales del pedido</label>
          <input
            id="billingAdditionalCosts"
            type="number"
            min="0"
            value={form.additionalCosts}
            onChange={(event) => setForm((current) => ({ ...current, additionalCosts: event.target.value }))}
            placeholder="Domicilio, empaque extra..."
          />

          <label htmlFor="billingNotes">Notas</label>
          <textarea
            id="billingNotes"
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />

          <label htmlFor="billingInspirationImage">Foto de inspiración (opcional)</label>
          <div className="billing-attachment-field">
            <input
              id="billingInspirationImage"
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
            <p><strong>Venta:</strong> {MONEY.format(formPreview.totalSale)}</p>
            <p><strong>Costo:</strong> {MONEY.format(formPreview.totalCost)}</p>
            <p><strong>Utilidad:</strong> {MONEY.format(formPreview.profit)}</p>
          </div>

          <button type="submit" disabled={saving || recipesLoading || !recipes.length}>
            {saving ? "Guardando..." : "Registrar venta y generar PDF"}
          </button>
        </form>
      </article>

      <article className="admin-card customer-database-table-card">
        <h3>Ventas del día</h3>
        {loading ? <p className="muted">Cargando...</p> : null}
        {!loading && !sales.length ? <p className="muted">No hay ventas registradas para este día.</p> : null}

        {!loading && sales.length ? (
          <div className="table-scroll">
            <table className="sales-table customer-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Detalle</th>
                  <th>Venta</th>
                  <th>Costo</th>
                  <th>Utilidad</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale._id}>
                    <td>{new Date(sale.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td>{sale.customerName || "—"}</td>
                    <td>
                      {(sale.items || []).map((item) => `${item.quantity}× ${item.description}`).join(" · ")}
                    </td>
                    <td>{MONEY.format(sale.totalSale)}</td>
                    <td>{MONEY.format(sale.totalCost)}</td>
                    <td>{MONEY.format(sale.profit)}</td>
                    <td>
                      <button type="button" className="table-icon-btn delete" onClick={() => handleDelete(sale._id)}>
                        X
                      </button>
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
