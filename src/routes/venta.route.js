// import { Router } from "express";
// import { createVenta, getVentas, getVentaById, updateVenta, deleteVenta} from "../controllers/venta.controller.js";
// import { createVentaEsporadica, getVentasEsporadicas } from '../controllers/ventaEsporadica.controller.js';

// const router = Router();
// // routes/venta.routes.js (o como lo tengas)

// // Rutas nuevas — agregalas ANTES de las rutas con :id para evitar conflictos
// router.get('/esporadica',  getVentasEsporadicas);
// router.post('/esporadica', createVentaEsporadica);
// router.post("/", createVenta);       // Crear venta con detalles
// router.get("/", getVentas);          // Listar todas las ventas
// router.get("/:id", getVentaById);    // Obtener una venta con detalles
// router.put("/:id", updateVenta);     // Actualizar una venta
// router.delete("/:id", deleteVenta);  // Eliminar una venta
// export default router;


import { Router } from "express";
import {
  createVenta,
  getVentas,
  getVentaById,
  updateVenta,
  deleteVenta,
  registrarPagoVenta,
  getPagosVentasCliente,
  pagarVentasCliente,
  anularPagoVenta,
} from "../controllers/venta.controller.js";
import { createVentaEsporadica, getVentasEsporadicas } from '../controllers/ventaEsporadica.controller.js';

const router = Router();

// Rutas fijas ANTES de las rutas con :id
router.get('/esporadica',  getVentasEsporadicas);
router.post('/esporadica', createVentaEsporadica);
// Pagos de ventas (historial por cliente)
router.get('/pagos/cliente/:clienteId', getPagosVentasCliente);    // Historial de pagos del cliente
router.post('/pagos/cliente/:clienteId', pagarVentasCliente);      // Pago repartido (venta más vieja primero)
router.patch('/pagos/:pagoId/anular', anularPagoVenta);            // Anular un pago (no se borra)

router.post("/", createVenta);                 // Crear venta local (descuenta stock)
router.get("/", getVentas);                    // Listar ventas
router.get("/:id", getVentaById);              // Obtener una venta
router.put("/:id", updateVenta);               // Editar venta local
router.patch("/:id/pago", registrarPagoVenta); // Registrar pago (local o web)
router.delete("/:id", deleteVenta);            // Anular venta (devuelve stock)
export default router;