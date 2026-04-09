import { Router } from "express";
import { createVenta, getVentas, getVentaById, updateVenta, deleteVenta} from "../controllers/venta.controller.js";
import { createVentaEsporadica, getVentasEsporadicas } from '../controllers/ventaEsporadica.controller.js';

const router = Router();
// routes/venta.routes.js (o como lo tengas)

// Rutas nuevas — agregalas ANTES de las rutas con :id para evitar conflictos
router.get('/esporadica',  getVentasEsporadicas);
router.post('/esporadica', createVentaEsporadica);
router.post("/", createVenta);       // Crear venta con detalles
router.get("/", getVentas);          // Listar todas las ventas
router.get("/:id", getVentaById);    // Obtener una venta con detalles
router.put("/:id", updateVenta);     // Actualizar una venta
router.delete("/:id", deleteVenta);  // Eliminar una venta
export default router;
