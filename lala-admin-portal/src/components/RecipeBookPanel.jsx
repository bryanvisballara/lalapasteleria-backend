import { useEffect, useMemo, useState } from "react";
import {
  createIngredient,
  createRecipe,
  deleteIngredient,
  deleteRecipe,
  getIngredients,
  getRecipes,
  updateIngredient,
  updateRecipe
} from "../api/admin";
import { MONEY } from "../utils/printComanda";

const INGREDIENT_UNITS = [
  { value: "g", label: "Gramos (g)" },
  { value: "kg", label: "Kilogramos (kg)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "L", label: "Litros (L)" },
  { value: "und", label: "Unidad (und)" }
];

const emptyIngredient = { id: "", name: "", unit: "g", costPerUnit: "", notes: "" };
const emptyRecipeLine = { ingredient: "", quantity: "" };
const emptyRecipe = {
  id: "",
  name: "",
  yieldLabel: "",
  lines: [{ ...emptyRecipeLine }],
  extraCosts: "",
  suggestedSalePrice: "",
  notes: ""
};

export default function RecipeBookPanel({ onError, onSuccess }) {
  const [view, setView] = useState("ingredients");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [ingredientForm, setIngredientForm] = useState(emptyIngredient);
  const [recipeForm, setRecipeForm] = useState(emptyRecipe);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [ingredientsData, recipesData] = await Promise.all([
        getIngredients(),
        getRecipes()
      ]);
      setIngredients(ingredientsData);
      setRecipes(recipesData);
    } catch (loadError) {
      onError(loadError?.response?.data?.message || "No se pudo cargar el recetario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const previewRecipeCost = useMemo(() => {
    let ingredientsCost = 0;

    recipeForm.lines.forEach((line) => {
      const ingredient = ingredients.find((item) => item._id === line.ingredient);
      const qty = Number(line.quantity);

      if (ingredient && Number.isFinite(qty) && qty > 0) {
        ingredientsCost += qty * Number(ingredient.costPerUnit || 0);
      }
    });

    const extraCosts = Number(recipeForm.extraCosts) || 0;
    const totalCost = ingredientsCost + extraCosts;
    const suggestedSalePrice = Number(recipeForm.suggestedSalePrice) || 0;

    return {
      ingredientsCost,
      totalCost,
      profit: suggestedSalePrice - totalCost
    };
  }, [recipeForm, ingredients]);

  const handleSubmitIngredient = async (event) => {
    event.preventDefault();

    const payload = {
      name: ingredientForm.name,
      unit: ingredientForm.unit,
      costPerUnit: Number(ingredientForm.costPerUnit),
      notes: ingredientForm.notes
    };

    try {
      setSaving(true);
      onError("");

      if (ingredientForm.id) {
        const updated = await updateIngredient(ingredientForm.id, payload);
        setIngredients((current) => current.map((item) => (item._id === updated._id ? updated : item)));
        onSuccess("Insumo actualizado");
      } else {
        const created = await createIngredient(payload);
        setIngredients((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
        onSuccess("Insumo creado");
      }

      setIngredientForm(emptyIngredient);
    } catch (submitError) {
      onError(submitError?.response?.data?.message || "No se pudo guardar el insumo");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitRecipe = async (event) => {
    event.preventDefault();

    const payload = {
      name: recipeForm.name,
      yieldLabel: recipeForm.yieldLabel,
      lines: recipeForm.lines
        .filter((line) => line.ingredient && Number(line.quantity) > 0)
        .map((line) => ({
          ingredient: line.ingredient,
          quantity: Number(line.quantity)
        })),
      extraCosts: Number(recipeForm.extraCosts) || 0,
      suggestedSalePrice: Number(recipeForm.suggestedSalePrice) || 0,
      notes: recipeForm.notes
    };

    try {
      setSaving(true);
      onError("");

      if (recipeForm.id) {
        const updated = await updateRecipe(recipeForm.id, payload);
        setRecipes((current) => current.map((item) => (item._id === updated._id ? updated : item)));
        onSuccess("Receta actualizada");
      } else {
        const created = await createRecipe(payload);
        setRecipes((current) => [created, ...current]);
        onSuccess("Receta creada");
      }

      setRecipeForm({ ...emptyRecipe, lines: [{ ...emptyRecipeLine }] });
      await loadAll();
    } catch (submitError) {
      onError(submitError?.response?.data?.message || "No se pudo guardar la receta");
    } finally {
      setSaving(false);
    }
  };

  const handleEditRecipe = (recipe) => {
    setView("recipes");
    setRecipeForm({
      id: recipe._id,
      name: recipe.name,
      yieldLabel: recipe.yieldLabel || "",
      lines: (recipe.lines || []).length
        ? recipe.lines.map((line) => ({
          ingredient: line.ingredient?._id || line.ingredient,
          quantity: line.quantity
        }))
        : [{ ...emptyRecipeLine }],
      extraCosts: recipe.extraCosts || "",
      suggestedSalePrice: recipe.suggestedSalePrice || "",
      notes: recipe.notes || ""
    });
  };

  return (
    <section className="recipe-book-panel">
      <header className="admin-card recipe-book-header">
        <div>
          <h2>Recetario</h2>
          <p className="muted">Arma recetas con insumos y calcula el costo real de cada producto.</p>
        </div>
        <div className="recipe-book-tabs">
          <button
            type="button"
            className={`tab-button ${view === "ingredients" ? "active" : ""}`}
            onClick={() => setView("ingredients")}
          >
            Insumos
          </button>
          <button
            type="button"
            className={`tab-button ${view === "recipes" ? "active" : ""}`}
            onClick={() => setView("recipes")}
          >
            Recetas
          </button>
        </div>
      </header>

      {view === "ingredients" ? (
        <div className="recipe-book-layout">
          <article className="admin-card recipe-book-form-card">
            <h3>{ingredientForm.id ? "Editar insumo" : "Nuevo insumo"}</h3>
            <form className="admin-form" onSubmit={handleSubmitIngredient}>
              <label htmlFor="ingredientName">Nombre</label>
              <input
                id="ingredientName"
                value={ingredientForm.name}
                onChange={(event) => setIngredientForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Harina, huevo, vainilla..."
                required
              />

              <label htmlFor="ingredientUnit">Unidad de compra</label>
              <select
                id="ingredientUnit"
                value={ingredientForm.unit}
                onChange={(event) => setIngredientForm((current) => ({ ...current, unit: event.target.value }))}
              >
                {INGREDIENT_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </select>

              <label htmlFor="ingredientCost">Costo por unidad (COP)</label>
              <input
                id="ingredientCost"
                type="number"
                min="0"
                step="1"
                value={ingredientForm.costPerUnit}
                onChange={(event) => setIngredientForm((current) => ({ ...current, costPerUnit: event.target.value }))}
                required
              />

              <label htmlFor="ingredientNotes">Notas</label>
              <input
                id="ingredientNotes"
                value={ingredientForm.notes}
                onChange={(event) => setIngredientForm((current) => ({ ...current, notes: event.target.value }))}
              />

              <button type="submit" disabled={saving}>
                {saving ? "Guardando..." : ingredientForm.id ? "Actualizar insumo" : "Guardar insumo"}
              </button>
              {ingredientForm.id ? (
                <button type="button" onClick={() => setIngredientForm(emptyIngredient)}>Cancelar</button>
              ) : null}
            </form>
          </article>

          <article className="admin-card recipe-book-list-card">
            <h3>Insumos registrados</h3>
            {loading ? <p className="muted">Cargando...</p> : null}
            {!loading && !ingredients.length ? <p className="muted">Aún no hay insumos.</p> : null}
            {!loading && ingredients.length ? (
              <div className="table-scroll">
                <table className="sales-table customer-table">
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th>Unidad</th>
                      <th>Costo/unidad</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map((item) => (
                      <tr key={item._id}>
                        <td>{item.name}</td>
                        <td>{item.unit}</td>
                        <td>{MONEY.format(item.costPerUnit)}</td>
                        <td>
                          <div className="customer-table-actions">
                            <button
                              type="button"
                              className="table-icon-btn edit"
                              onClick={() => setIngredientForm({
                                id: item._id,
                                name: item.name,
                                unit: item.unit,
                                costPerUnit: item.costPerUnit,
                                notes: item.notes || ""
                              })}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="table-icon-btn delete"
                              onClick={async () => {
                                if (!window.confirm("¿Eliminar insumo?")) return;
                                await deleteIngredient(item._id);
                                setIngredients((current) => current.filter((row) => row._id !== item._id));
                                onSuccess("Insumo eliminado");
                              }}
                            >
                              X
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
        </div>
      ) : null}

      {view === "recipes" ? (
        <div className="recipe-book-layout">
          <article className="admin-card recipe-book-form-card">
            <h3>{recipeForm.id ? "Editar receta" : "Nueva receta"}</h3>
            <form className="admin-form" onSubmit={handleSubmitRecipe}>
              <label htmlFor="recipeName">Nombre del producto</label>
              <input
                id="recipeName"
                value={recipeForm.name}
                onChange={(event) => setRecipeForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Torta vainilla media libra"
                required
              />

              <label htmlFor="recipeYield">Rendimiento</label>
              <input
                id="recipeYield"
                value={recipeForm.yieldLabel}
                onChange={(event) => setRecipeForm((current) => ({ ...current, yieldLabel: event.target.value }))}
                placeholder="1 torta / 8 porciones"
              />

              <label>Insumos de la receta</label>
              {recipeForm.lines.map((line, index) => (
                <div key={`line-${index}`} className="recipe-line-row">
                  <select
                    value={line.ingredient}
                    onChange={(event) => setRecipeForm((current) => {
                      const nextLines = [...current.lines];
                      nextLines[index] = { ...nextLines[index], ingredient: event.target.value };
                      return { ...current, lines: nextLines };
                    })}
                    required
                  >
                    <option value="">Insumo</option>
                    {ingredients.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} ({item.unit}) — {MONEY.format(item.costPerUnit)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Cantidad"
                    value={line.quantity}
                    onChange={(event) => setRecipeForm((current) => {
                      const nextLines = [...current.lines];
                      nextLines[index] = { ...nextLines[index], quantity: event.target.value };
                      return { ...current, lines: nextLines };
                    })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setRecipeForm((current) => {
                      const nextLines = current.lines.filter((_, lineIndex) => lineIndex !== index);
                      return {
                        ...current,
                        lines: nextLines.length ? nextLines : [{ ...emptyRecipeLine }]
                      };
                    })}
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRecipeForm((current) => ({
                  ...current,
                  lines: [...current.lines, { ...emptyRecipeLine }]
                }))}
              >
                + Agregar insumo
              </button>

              <label htmlFor="recipeExtraCosts">Costos extra (mano de obra, empaque, gas)</label>
              <input
                id="recipeExtraCosts"
                type="number"
                min="0"
                value={recipeForm.extraCosts}
                onChange={(event) => setRecipeForm((current) => ({ ...current, extraCosts: event.target.value }))}
              />

              <label htmlFor="recipeSalePrice">Precio de venta sugerido</label>
              <input
                id="recipeSalePrice"
                type="number"
                min="0"
                value={recipeForm.suggestedSalePrice}
                onChange={(event) => setRecipeForm((current) => ({ ...current, suggestedSalePrice: event.target.value }))}
              />

              <div className="recipe-cost-summary">
                <p><strong>Costo insumos:</strong> {MONEY.format(previewRecipeCost.ingredientsCost)}</p>
                <p><strong>Costo total:</strong> {MONEY.format(previewRecipeCost.totalCost)}</p>
                <p><strong>Utilidad estimada:</strong> {MONEY.format(previewRecipeCost.profit)}</p>
              </div>

              <button type="submit" disabled={saving || !ingredients.length}>
                {saving ? "Guardando..." : recipeForm.id ? "Actualizar receta" : "Guardar receta"}
              </button>
            </form>
          </article>

          <article className="admin-card recipe-book-list-card">
            <h3>Recetas guardadas</h3>
            {!ingredients.length ? <p className="muted">Primero crea insumos en la pestaña Insumos.</p> : null}
            {loading ? <p className="muted">Cargando...</p> : null}
            {!loading && recipes.length ? (
              <div className="recipe-list">
                {recipes.map((recipe) => (
                  <div key={recipe._id} className="recipe-summary-card">
                    <div>
                      <strong>{recipe.name}</strong>
                      {recipe.yieldLabel ? <p className="muted">{recipe.yieldLabel}</p> : null}
                      <p className="muted">Costo: {MONEY.format(recipe.totalCost)} · Venta: {MONEY.format(recipe.suggestedSalePrice)}</p>
                      <p className="muted">Utilidad: {MONEY.format(recipe.estimatedProfit)} ({recipe.marginPercent}%)</p>
                    </div>
                    <div className="row-actions">
                      <button type="button" onClick={() => handleEditRecipe(recipe)}>Editar</button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm("¿Eliminar receta?")) return;
                          await deleteRecipe(recipe._id);
                          setRecipes((current) => current.filter((row) => row._id !== recipe._id));
                          onSuccess("Receta eliminada");
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        </div>
      ) : null}
    </section>
  );
}
