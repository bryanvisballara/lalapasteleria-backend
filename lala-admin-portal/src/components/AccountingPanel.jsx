import { useEffect, useMemo, useState } from "react";
import {
  createOperatingExpense,
  deleteOperatingExpense,
  getAccountingOverview,
  getOperatingExpenses,
  updateOperatingExpense
} from "../api/admin";
import { MONEY } from "../utils/printComanda";

const EXPENSE_CATEGORIES = [
  { key: "nomina", label: "Nómina", hint: "Salarios y pagos a empleados", emoji: "👥" },
  { key: "servicios", label: "Servicios", hint: "Agua, luz, gas, internet", emoji: "💡" },
  { key: "arriendo", label: "Arriendo", hint: "Canon del local o bodega", emoji: "🏠" },
  { key: "domicilios", label: "Domicilios", hint: "Pagos a repartidores", emoji: "🛵" },
  { key: "insumos", label: "Insumos", hint: "Materiales fuera del recetario", emoji: "📦" },
  { key: "marketing", label: "Publicidad", hint: "Redes, volantes, promos", emoji: "📣" },
  { key: "mantenimiento", label: "Mantenimiento", hint: "Reparaciones y equipos", emoji: "🔧" },
  { key: "impuestos", label: "Impuestos", hint: "Tributos y trámites", emoji: "📋" },
  { key: "imprevistos", label: "Imprevistos", hint: "Gastos no planeados", emoji: "⚡" },
  { key: "otros", label: "Otros", hint: "Cualquier otro gasto", emoji: "📎" }
];

const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" }
];

const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const toDateInputValue = (dateValue = new Date()) => {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptyExpenseForm = {
  id: "",
  category: "nomina",
  description: "",
  amount: "",
  expenseDate: toDateInputValue(),
  paymentMethod: "efectivo",
  vendor: "",
  notes: ""
};

const getCategoryMeta = (categoryKey) => {
  return EXPENSE_CATEGORIES.find((item) => item.key === categoryKey) || EXPENSE_CATEGORIES.at(-1);
};

export default function AccountingPanel({ onError, onSuccess }) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [activeView, setActiveView] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overview, setOverview] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [form, setForm] = useState(emptyExpenseForm);

  const periodParams = useMemo(() => ({
    year: Number(selectedYear),
    month: Number(selectedMonth)
  }), [selectedYear, selectedMonth]);

  const loadAccounting = async () => {
    try {
      setLoading(true);
      onError("");
      const [overviewData, expensesData] = await Promise.all([
        getAccountingOverview(periodParams),
        getOperatingExpenses({
          ...periodParams,
          category: categoryFilter || undefined
        })
      ]);
      setOverview(overviewData);
      setExpenses(expensesData);
    } catch (loadError) {
      onError(loadError?.response?.data?.message || "No se pudo cargar contabilidad");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounting();
  }, [selectedYear, selectedMonth, categoryFilter]);

  const categoryBreakdown = useMemo(() => {
    const totals = overview?.operatingExpensesByCategory || {};
    const items = EXPENSE_CATEGORIES
      .map((category) => ({
        ...category,
        amount: Number(totals[category.key] || 0)
      }))
      .filter((item) => item.amount > 0);

    const maxAmount = Math.max(...items.map((item) => item.amount), 1);
    return { items, maxAmount };
  }, [overview]);

  const handleSubmitExpense = async (event) => {
    event.preventDefault();

    const payload = {
      category: form.category,
      description: form.description.trim(),
      amount: Number(form.amount),
      expenseDate: form.expenseDate,
      paymentMethod: form.paymentMethod,
      vendor: form.vendor.trim(),
      notes: form.notes.trim()
    };

    try {
      setSaving(true);
      onError("");

      if (form.id) {
        await updateOperatingExpense(form.id, payload);
        onSuccess("Gasto actualizado");
      } else {
        await createOperatingExpense(payload);
        onSuccess("Gasto registrado");
      }

      setForm({ ...emptyExpenseForm, expenseDate: toDateInputValue() });
      await loadAccounting();
      setActiveView("history");
    } catch (submitError) {
      onError(submitError?.response?.data?.message || "No se pudo guardar el gasto");
    } finally {
      setSaving(false);
    }
  };

  const handleEditExpense = (expense) => {
    setForm({
      id: expense._id,
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      expenseDate: toDateInputValue(expense.expenseDate),
      paymentMethod: expense.paymentMethod || "efectivo",
      vendor: expense.vendor || "",
      notes: expense.notes || ""
    });
    setActiveView("register");
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("¿Eliminar este gasto?")) {
      return;
    }

    try {
      onError("");
      await deleteOperatingExpense(id);
      await loadAccounting();
      onSuccess("Gasto eliminado");
    } catch (deleteError) {
      onError(deleteError?.response?.data?.message || "No se pudo eliminar el gasto");
    }
  };

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => String(currentYear - index));
  }, []);

  return (
    <section className="accounting-panel">
      <header className="admin-card accounting-header">
        <div>
          <h2>Contabilidad</h2>
          <p className="muted">
            Controla cuánto entra, cuánto sale y qué te queda. Sin términos complicados.
          </p>
        </div>
        <div className="accounting-period-picker">
          <label htmlFor="accountingMonth">Mes</label>
          <select
            id="accountingMonth"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          >
            {MONTH_LABELS.map((label, index) => (
              <option key={label} value={String(index + 1)}>{label}</option>
            ))}
          </select>
          <label htmlFor="accountingYear">Año</label>
          <select
            id="accountingYear"
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </header>

      <article className="admin-card accounting-help-card">
        <h3>¿Cómo funciona?</h3>
        <div className="accounting-help-grid">
          <p><strong>1. Lo que entra:</strong> ventas de la app y facturación interna.</p>
          <p><strong>2. Costos de producción:</strong> lo que costó hacer lo vendido (recetario).</p>
          <p><strong>3. Gastos del negocio:</strong> nómina, arriendo, servicios y demás.</p>
          <p><strong>4. Resultado:</strong> lo que te queda después de restar todo.</p>
        </div>
      </article>

      <div className="recipe-book-tabs accounting-tabs">
        <button
          type="button"
          className={`tab-button ${activeView === "overview" ? "active" : ""}`}
          onClick={() => setActiveView("overview")}
        >
          Resumen del mes
        </button>
        <button
          type="button"
          className={`tab-button ${activeView === "register" ? "active" : ""}`}
          onClick={() => {
            setActiveView("register");
            if (!form.id) {
              setForm({ ...emptyExpenseForm, expenseDate: toDateInputValue() });
            }
          }}
        >
          Registrar gasto
        </button>
        <button
          type="button"
          className={`tab-button ${activeView === "history" ? "active" : ""}`}
          onClick={() => setActiveView("history")}
        >
          Historial de gastos
        </button>
      </div>

      {loading ? <p className="muted">Cargando contabilidad...</p> : null}

      {!loading && activeView === "overview" && overview ? (
        <>
          <article className={`admin-card accounting-result-card ${overview.result.net >= 0 ? "positive" : "negative"}`}>
            <p className="accounting-result-label">Te quedó este mes</p>
            <strong className="accounting-result-value">{MONEY.format(overview.result.net)}</strong>
            <p className="muted">
              De cada $100 que entraron, te quedó aprox. {overview.result.marginPercent}%
            </p>
          </article>

          <section className="admin-grid metrics-grid accounting-kpis">
            <article className="admin-card">
              <h3>Total que entró</h3>
              <strong>{MONEY.format(overview.income.total)}</strong>
              <p className="muted">App: {MONEY.format(overview.income.appSales)} ({overview.income.appOrdersCount} pedidos)</p>
              <p className="muted">Facturación: {MONEY.format(overview.income.internalSales)} ({overview.income.internalSalesCount} ventas)</p>
            </article>
            <article className="admin-card">
              <h3>Costos de producción</h3>
              <strong>{MONEY.format(overview.costs.production)}</strong>
              <p className="muted">Según recetas de lo vendido en facturación</p>
            </article>
            <article className="admin-card">
              <h3>Gastos del negocio</h3>
              <strong>{MONEY.format(overview.costs.operating)}</strong>
              <p className="muted">Nómina, arriendo, servicios y más</p>
            </article>
            <article className="admin-card">
              <h3>Total que salió</h3>
              <strong>{MONEY.format(overview.costs.total)}</strong>
              <p className="muted">Producción + gastos operativos</p>
            </article>
          </section>

          <div className="customer-database-layout">
            <article className="admin-card">
              <h3>¿En qué se fue el dinero?</h3>
              {!categoryBreakdown.items.length ? (
                <p className="muted">Aún no hay gastos registrados este mes.</p>
              ) : (
                <div className="accounting-breakdown-list">
                  {categoryBreakdown.items.map((item) => (
                    <div key={item.key} className="accounting-breakdown-item">
                      <div className="accounting-breakdown-head">
                        <span>{item.emoji} {item.label}</span>
                        <strong>{MONEY.format(item.amount)}</strong>
                      </div>
                      <div className="accounting-breakdown-bar">
                        <div
                          className="accounting-breakdown-fill"
                          style={{ width: `${Math.max((item.amount / categoryBreakdown.maxAmount) * 100, 8)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="admin-card">
              <h3>Últimos gastos registrados</h3>
              {!overview.recentOperatingExpenses?.length ? (
                <p className="muted">Registra tu primer gasto en la pestaña &quot;Registrar gasto&quot;.</p>
              ) : (
                <div className="accounting-recent-list">
                  {overview.recentOperatingExpenses.map((expense) => {
                    const category = getCategoryMeta(expense.category);
                    return (
                      <div key={expense._id} className="accounting-recent-item">
                        <div>
                          <strong>{category.emoji} {expense.description}</strong>
                          <p className="muted">
                            {category.label} · {new Date(expense.expenseDate).toLocaleDateString("es-CO")}
                          </p>
                        </div>
                        <strong>{MONEY.format(expense.amount)}</strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          </div>
        </>
      ) : null}

      {!loading && activeView === "register" ? (
        <article className="admin-card">
          <h3>{form.id ? "Editar gasto" : "Registrar un gasto nuevo"}</h3>
          <p className="muted accounting-form-intro">
            Elige el tipo de gasto, escribe cuánto pagaste y listo. No necesitas saber contabilidad.
          </p>

          <form className="admin-form" onSubmit={handleSubmitExpense}>
            <label>¿Qué tipo de gasto es?</label>
            <div className="accounting-category-grid">
              {EXPENSE_CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  className={`accounting-category-card ${form.category === category.key ? "active" : ""}`}
                  onClick={() => setForm((current) => ({ ...current, category: category.key }))}
                >
                  <span className="accounting-category-emoji">{category.emoji}</span>
                  <strong>{category.label}</strong>
                  <span className="muted">{category.hint}</span>
                </button>
              ))}
            </div>

            <label htmlFor="expenseDescription">¿En qué se gastó?</label>
            <input
              id="expenseDescription"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Ej: Pago de nómina quincenal, factura de luz..."
              required
            />

            <div className="accounting-form-row">
              <div>
                <label htmlFor="expenseAmount">¿Cuánto pagaste? (COP)</label>
                <input
                  id="expenseAmount"
                  type="number"
                  min="1"
                  step="1"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="expenseDate">¿Cuándo?</label>
                <input
                  id="expenseDate"
                  type="date"
                  value={form.expenseDate}
                  onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="accounting-form-row">
              <div>
                <label htmlFor="expensePaymentMethod">¿Cómo pagaste?</label>
                <select
                  id="expensePaymentMethod"
                  value={form.paymentMethod}
                  onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="expenseVendor">¿A quién le pagaste? (opcional)</label>
                <input
                  id="expenseVendor"
                  value={form.vendor}
                  onChange={(event) => setForm((current) => ({ ...current, vendor: event.target.value }))}
                  placeholder="Ej: Empleado, Air-e, arrendador..."
                />
              </div>
            </div>

            <label htmlFor="expenseNotes">Notas adicionales (opcional)</label>
            <textarea
              id="expenseNotes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Detalles que quieras recordar después"
            />

            <div className="accounting-form-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Guardando..." : form.id ? "Actualizar gasto" : "Guardar gasto"}
              </button>
              {form.id ? (
                <button
                  type="button"
                  onClick={() => setForm({ ...emptyExpenseForm, expenseDate: toDateInputValue() })}
                >
                  Cancelar edición
                </button>
              ) : null}
            </div>
          </form>
        </article>
      ) : null}

      {!loading && activeView === "history" ? (
        <article className="admin-card customer-database-table-card">
          <div className="accounting-history-head">
            <h3>Gastos de {overview?.period?.label || "este mes"}</h3>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filtrar por categoría"
            >
              <option value="">Todas las categorías</option>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category.key} value={category.key}>{category.label}</option>
              ))}
            </select>
          </div>

          {!expenses.length ? (
            <p className="muted">No hay gastos registrados para este período.</p>
          ) : (
            <div className="table-scroll">
              <table className="sales-table customer-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th>Pagado a</th>
                    <th>Método</th>
                    <th>Monto</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => {
                    const category = getCategoryMeta(expense.category);
                    const paymentLabel = PAYMENT_METHODS.find((item) => item.value === expense.paymentMethod)?.label || expense.paymentMethod;

                    return (
                      <tr key={expense._id}>
                        <td>{new Date(expense.expenseDate).toLocaleDateString("es-CO")}</td>
                        <td>{category.emoji} {category.label}</td>
                        <td>{expense.description}</td>
                        <td>{expense.vendor || "—"}</td>
                        <td>{paymentLabel}</td>
                        <td>{MONEY.format(expense.amount)}</td>
                        <td>
                          <div className="customer-table-actions">
                            <button
                              type="button"
                              className="table-icon-btn edit"
                              onClick={() => handleEditExpense(expense)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="table-icon-btn delete"
                              onClick={() => handleDeleteExpense(expense._id)}
                            >
                              X
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      ) : null}
    </section>
  );
}
