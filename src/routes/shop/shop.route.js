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
} from "../../controllers/shop/shop.controller.js";

const router = Router();

router.post("/login", loginCliente);
router.post("/sesiones", registrarSesionCliente);
router.post("/visualizaciones", registrarVisualizacionProducto);
router.post("/ventas", crearVentaWeb);
router.get("/estadisticas/top-vistos", obtenerTopVistos);
router.post("/test-email", testResend);


// CUPONES
router.post("/cupones/validar", validarCupon);

// Mis cupones (por cliente_id)
router.get("/cupones", obtenerCuponesCliente);


export default router;
