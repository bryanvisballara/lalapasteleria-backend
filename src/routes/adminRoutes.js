const express = require("express");
const mongoose = require("mongoose");
const CustomerInquiry = require("../models/CustomerInquiry");
const { protect, authorize } = require("../middleware/authMiddleware");
const { requireDatabase } = require("../middleware/dbMiddleware");
const {
	getRestaurantConfig,
	getPublicRestaurantConfig,
	updateRestaurantConfig
} = require("../controllers/adminController");
const { sendPushCampaign } = require("../controllers/marketingController");
const {
	listCustomerInquiries,
	createCustomerInquiry,
	updateCustomerInquiry,
	deleteCustomerInquiry,
	getImpulsaInteractions,
	markImpulsaContacted
} = require("../controllers/customerInquiryController");
const {
	listIngredients,
	createIngredient,
	updateIngredient,
	deleteIngredient
} = require("../controllers/ingredientController");
const {
	listRecipes,
	createRecipe,
	updateRecipe,
	deleteRecipe
} = require("../controllers/recipeController");
const {
	listInternalSales,
	getDailySummary,
	createInternalSale,
	deleteInternalSale
} = require("../controllers/billingController");
const {
	listOperatingExpenses,
	getAccountingOverview,
	createOperatingExpense,
	updateOperatingExpense,
	deleteOperatingExpense
} = require("../controllers/accountingController");

const router = express.Router();

router.get("/health/summary", protect, authorize("admin"), requireDatabase, async (req, res) => {
	try {
		const customerInquiries = await CustomerInquiry.countDocuments();

		return res.status(200).json({
			database: mongoose.connection.name,
			customerInquiries
		});
	} catch (error) {
		return res.status(500).json({ message: "No se pudo leer el resumen de la base de datos", error: error.message });
	}
});

router.get("/public-config", getPublicRestaurantConfig);
router.get("/restaurant-config", protect, authorize("admin"), requireDatabase, getRestaurantConfig);
router.put("/restaurant-config", protect, authorize("admin"), requireDatabase, updateRestaurantConfig);
router.post("/marketing/push", protect, authorize("admin"), requireDatabase, sendPushCampaign);

router.get("/customer-inquiries", protect, authorize("admin"), requireDatabase, listCustomerInquiries);
router.post("/customer-inquiries", protect, authorize("admin"), requireDatabase, createCustomerInquiry);
router.put("/customer-inquiries/:id", protect, authorize("admin"), requireDatabase, updateCustomerInquiry);
router.delete("/customer-inquiries/:id", protect, authorize("admin"), requireDatabase, deleteCustomerInquiry);
router.get("/impulsa", protect, authorize("admin"), requireDatabase, getImpulsaInteractions);
router.post("/customer-inquiries/:id/impulsa-contacted", protect, authorize("admin"), requireDatabase, markImpulsaContacted);

router.get("/ingredients", protect, authorize("admin"), requireDatabase, listIngredients);
router.post("/ingredients", protect, authorize("admin"), requireDatabase, createIngredient);
router.put("/ingredients/:id", protect, authorize("admin"), requireDatabase, updateIngredient);
router.delete("/ingredients/:id", protect, authorize("admin"), requireDatabase, deleteIngredient);

router.get("/recipes", protect, authorize("admin"), requireDatabase, listRecipes);
router.post("/recipes", protect, authorize("admin"), requireDatabase, createRecipe);
router.put("/recipes/:id", protect, authorize("admin"), requireDatabase, updateRecipe);
router.delete("/recipes/:id", protect, authorize("admin"), requireDatabase, deleteRecipe);

router.get("/billing/sales", protect, authorize("admin"), requireDatabase, listInternalSales);
router.get("/billing/summary", protect, authorize("admin"), requireDatabase, getDailySummary);
router.post("/billing/sales", protect, authorize("admin"), requireDatabase, createInternalSale);
router.delete("/billing/sales/:id", protect, authorize("admin"), requireDatabase, deleteInternalSale);

router.get("/accounting/overview", protect, authorize("admin"), requireDatabase, getAccountingOverview);
router.get("/accounting/expenses", protect, authorize("admin"), requireDatabase, listOperatingExpenses);
router.post("/accounting/expenses", protect, authorize("admin"), requireDatabase, createOperatingExpense);
router.put("/accounting/expenses/:id", protect, authorize("admin"), requireDatabase, updateOperatingExpense);
router.delete("/accounting/expenses/:id", protect, authorize("admin"), requireDatabase, deleteOperatingExpense);

module.exports = router;