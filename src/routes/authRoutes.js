const express = require("express");
const {
	register,
	login,
	googleAuth,
	me,
	addAddress,
	registerFcmToken,
	deleteFcmToken
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { requireDatabase } = require("../middleware/dbMiddleware");

const router = express.Router();

router.post("/register", requireDatabase, register);
router.post("/login", requireDatabase, login);
router.post("/google", requireDatabase, googleAuth);
router.get("/me", protect, requireDatabase, me);
router.post("/addresses", protect, authorize("customer"), addAddress);
router.post("/fcm-token", protect, authorize("customer"), registerFcmToken);
router.delete("/fcm-token", protect, authorize("customer"), deleteFcmToken);

module.exports = router;
