// controller para cargar los productos

import express from "express";
import {
  createProducto,
  getProductos,
  getProductoById,
  updateProducto,
  deleteProducto,
  buscarProductos,
  getRepuestosProducto,
} from "../../controllers/producto/producto.controller.js";
import { uploadProductoFoto } from "../../middlewares/uploadProductoFoto.js";
import { optionalAuth } from "../../middlewares/auth/autorizacionDeRoles.js";
import { requireModulo } from "../../middlewares/auth/permisos.js";

const router = express.Router();

// 🌐 Lectura compartida con el shop: sin token devuelve solo productos web y sin costos
router.get("/", optionalAuth, getProductos);         // Obtener todos
// 🔒 Solo app del local
router.get("/repuestos", requireModulo("productos", "equipos", "ventas"), getRepuestosProducto);
router.get("/buscar", requireModulo("productos", "equipos", "ventas"), buscarProductos);
router.get("/:id", optionalAuth, getProductoById);   // Obtener por ID
router.post("/", requireModulo("productos"), uploadProductoFoto.single('foto'), createProducto);      // Crear producto
router.put("/:id", requireModulo("productos"), uploadProductoFoto.single('foto'), updateProducto);    // Actualizar
router.delete("/:id", requireModulo("productos"), deleteProducto); // Eliminar

export default router;