// routes/celular/dolar.route.js
import express from "express";
import {
  obtenerCotizacionActual,
  setCotizacionDolarManual,
} from "../../controllers/celular/dolar.controller.js";

const router = express.Router();

router.get("/actual", obtenerCotizacionActual);
router.post("/manual", setCotizacionDolarManual);

export default router;