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

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.get("/me", protect, me);
router.post("/addresses", protect, authorize("customer"), addAddress);
router.post("/fcm-token", protect, authorize("customer"), registerFcmToken);
router.delete("/fcm-token", protect, authorize("customer"), deleteFcmToken);

module.exports = router;
