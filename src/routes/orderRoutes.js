const express = require("express");
const {
  createOrder,
  getOrders,
  getMyOrders,
  updateOrderStatus
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, authorize("customer"), createOrder);
router.get("/", protect, authorize("admin", "seller"), getOrders);
router.get("/my", protect, authorize("customer"), getMyOrders);
router.patch("/:id/status", protect, authorize("admin", "seller"), updateOrderStatus);

module.exports = router;
