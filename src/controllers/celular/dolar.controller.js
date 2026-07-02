// controllers/celular/dolar.controller.js
import { obtenerCotizacionHoy, setCotizacionManual } from "../../services/dolar.service.js";

// GET /dolar/actual
export const obtenerCotizacionActual = async (req, res) => {
  try {
    const cotizacion = await obtenerCotizacionHoy();
    res.status(200).json({ success: true, data: cotizacion });
  } catch (error) {
    console.error("Error en obtenerCotizacionActual:", error.message || error);
    res.status(500).json({ success: false, error: "No se pudo obtener la cotización del dólar" });
  }
};

// POST /dolar/manual
// Body: { valor: number }
export const setCotizacionDolarManual = async (req, res) => {
  try {
    const { valor } = req.body;
    if (valor == null || isNaN(Number(valor))) {
      return res.status(400).json({ success: false, error: "El valor del dólar es obligatorio y debe ser numérico" });
    }
    const cotizacion = await setCotizacionManual(valor);
    res.status(200).json({ success: true, data: cotizacion });
  } catch (error) {
    console.error("Error en setCotizacionDolarManual:", error.message || error);
    res.status(400).json({ success: false, error: error.message || "No se pudo actualizar la cotización" });
  }
};