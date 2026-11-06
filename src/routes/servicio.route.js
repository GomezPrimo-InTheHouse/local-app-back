import { Router } from "express";
import {
  getCategoriasServicio,
  createCategoriaServicio,
  getServicios,
  createServicio,
  updateServicio,
  aumentarPreciosServicios,
  getConfiguracionServicios,
  updateConfiguracionServicios,
} from "../controllers/servicio.controllers.js";
import { autorizacionDeRoles } from "../middlewares/auth/autorizacionDeRoles.js";

const router = Router();

// Lectura: cualquier usuario (los técnicos usan los servicios en presupuestos)
router.get("/", getServicios);
router.get("/categorias", getCategoriasServicio);
router.get("/configuracion", getConfiguracionServicios);

// Escritura: solo admin
router.post("/", autorizacionDeRoles("admin"), createServicio);
router.post("/categorias", autorizacionDeRoles("admin"), createCategoriaServicio);
router.post("/aumento-masivo", autorizacionDeRoles("admin"), aumentarPreciosServicios);
router.put("/configuracion", autorizacionDeRoles("admin"), updateConfiguracionServicios);
router.put("/:id", autorizacionDeRoles("admin"), updateServicio);

export default router;