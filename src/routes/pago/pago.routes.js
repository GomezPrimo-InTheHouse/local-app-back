import { Router } from "express";
const router = Router();
import { registrarAbono, obtenerHistorialCliente, actualizarAbono } from "../../controllers/pago/pago.controller.js";

// POST /api/pagos/abono - Registrar un nuevo abono
router.post('/abono', registrarAbono);

// GET /api/pagos/cliente/:clienteId - Obtener historial de equipos, presupuestos y pagos
router.get('/cliente/:clienteId', obtenerHistorialCliente);

// PUT /api/pagos/abono/:id - Actualizar un abono existente
router.put('/abono/:id', actualizarAbono);

export default router;