const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
	getRestaurantConfig,
	getPublicRestaurantConfig,
	updateRestaurantConfig
} = require("../controllers/adminController");
const { sendPushCampaign } = require("../controllers/marketingController");

const router = express.Router();

router.get("/public-config", getPublicRestaurantConfig);
router.get("/restaurant-config", protect, authorize("admin"), getRestaurantConfig);
router.put("/restaurant-config", protect, authorize("admin"), updateRestaurantConfig);
router.post("/marketing/push", protect, authorize("admin"), sendPushCampaign);

module.exports = router;