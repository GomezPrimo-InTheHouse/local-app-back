import { Router } from "express";
import { createVenta, getVentas, getVentaById, updateVenta, deleteVenta} from "../controllers/venta.controller.js";

const router = Router();

router.post("/", createVenta);       // Crear venta con detalles
router.get("/", getVentas);          // Listar todas las ventas
router.get("/:id", getVentaById);    // Obtener una venta con detalles
router.put("/:id", updateVenta);     // Actualizar una venta
router.delete("/:id", deleteVenta);  // Eliminar una venta
export default router;
