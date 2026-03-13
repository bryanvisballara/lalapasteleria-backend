const express = require("express");
const {
  createNeighborhood,
  getNeighborhoods,
  getNeighborhoodById,
  updateNeighborhood,
  deleteNeighborhood
} = require("../controllers/neighborhoodController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getNeighborhoods);
router.get("/:id", getNeighborhoodById);
router.post("/", protect, authorize("admin"), createNeighborhood);
router.put("/:id", protect, authorize("admin"), updateNeighborhood);
router.delete("/:id", protect, authorize("admin"), deleteNeighborhood);

module.exports = router;
