const Neighborhood = require("../models/Neighborhood");

const createNeighborhood = async (req, res) => {
  try {
    const neighborhood = await Neighborhood.create(req.body);
    return res.status(201).json(neighborhood);
  } catch (error) {
    return res.status(500).json({ message: "Error creando barrio", error: error.message });
  }
};

const getNeighborhoods = async (req, res) => {
  try {
    const filter = {};

    if (req.query.active === "true") {
      filter.active = true;
    }

    if (req.query.active === "false") {
      filter.active = false;
    }

    const neighborhoods = await Neighborhood.find(filter).sort({ name: 1 });
    return res.status(200).json(neighborhoods);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo barrios", error: error.message });
  }
};

const getNeighborhoodById = async (req, res) => {
  try {
    const neighborhood = await Neighborhood.findById(req.params.id);

    if (!neighborhood) {
      return res.status(404).json({ message: "Barrio no encontrado" });
    }

    return res.status(200).json(neighborhood);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo barrio", error: error.message });
  }
};

const updateNeighborhood = async (req, res) => {
  try {
    const neighborhood = await Neighborhood.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!neighborhood) {
      return res.status(404).json({ message: "Barrio no encontrado" });
    }

    return res.status(200).json(neighborhood);
  } catch (error) {
    return res.status(500).json({ message: "Error actualizando barrio", error: error.message });
  }
};

const deleteNeighborhood = async (req, res) => {
  try {
    const neighborhood = await Neighborhood.findByIdAndDelete(req.params.id);

    if (!neighborhood) {
      return res.status(404).json({ message: "Barrio no encontrado" });
    }

    return res.status(200).json({ message: "Barrio eliminado" });
  } catch (error) {
    return res.status(500).json({ message: "Error eliminando barrio", error: error.message });
  }
};

module.exports = {
  createNeighborhood,
  getNeighborhoods,
  getNeighborhoodById,
  updateNeighborhood,
  deleteNeighborhood
};
