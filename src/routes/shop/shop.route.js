import { Router } from "express";
import {
  loginCliente,
  registrarSesionCliente,
  registrarVisualizacionProducto,
  crearVentaWeb,
  obtenerTopVistos,
  validarCupon,
  obtenerCuponesCliente,
  testResend,
  getVentaShopById,
} from "../../controllers/shop/shop.controller.js";

import {
  crearPreferenciaMercadoPago,
  webhookMercadoPago,
} from "../../controllers/shop/mercadopago.controller.js";

import { requireAuth } from "../../middlewares/auth/autorizacionDeRoles.js";

const router = Router();

router.post("/login", loginCliente);
router.post("/sesiones", registrarSesionCliente);
router.post("/visualizaciones", registrarVisualizacionProducto);
router.post("/ventas", crearVentaWeb);
router.get("/estadisticas/top-vistos", requireAuth, obtenerTopVistos);
router.post("/test-email", requireAuth, testResend);
router.get("/ventas/:id", getVentaShopById);

// MERCADO PAGO (Checkout Pro)
router.post("/pagos/mercadopago", crearPreferenciaMercadoPago);
router.post("/pagos/mercadopago/webhook", webhookMercadoPago);


// CUPONES
router.post("/cupones/validar", validarCupon);

// Mis cupones (por cliente_id)
router.get("/cupones", obtenerCuponesCliente);


export default router;