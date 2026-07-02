// routes/celular/celular.route.js
import express from "express";
import {
  listarCelulares,
  obtenerOpcionesFiltro,
  obtenerCelularPorId,
  crearCelular,
  actualizarCelular,
  eliminarCelular,
} from "../../controllers/celular/celular.controller.js";
import { uploadProductoFoto } from "../../middlewares/uploadProductoFoto.js";

const router = express.Router();

// Middleware para aceptar hasta 2 imágenes: campo 'foto' (principal) y 'foto2' (secundaria)
const uploadFotos = uploadProductoFoto.fields([
  { name: "foto", maxCount: 1 },
  { name: "foto2", maxCount: 1 },
]);

router.get("/opciones-filtro", obtenerOpcionesFiltro);
router.get("/", listarCelulares);
router.get("/:id", obtenerCelularPorId);
router.post("/", uploadFotos, crearCelular);
router.put("/:id", uploadFotos, actualizarCelular);
router.delete("/:id", eliminarCelular);

export default router;