const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const { updateMe, getMyCards, addCard } = require("../controllers/userController");

const router = express.Router();

router.put("/me", protect, authorize("customer"), updateMe);
router.get("/me/cards", protect, authorize("customer"), getMyCards);
router.post("/me/cards", protect, authorize("customer"), addCard);

module.exports = router;
