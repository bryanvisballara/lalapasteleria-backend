const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const { getCart, syncCart, clearCart } = require("../controllers/cartController");

const router = express.Router();

router.get("/", protect, authorize("customer"), getCart);
router.put("/", protect, authorize("customer"), syncCart);
router.delete("/", protect, authorize("customer"), clearCart);

module.exports = router;
