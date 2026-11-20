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
import { requireAuth, optionalAuth } from "../../middlewares/auth/autorizacionDeRoles.js";

const router = express.Router();

// 🌐 Lectura compartida con el shop: sin token devuelve solo productos web y sin costos
router.get("/", optionalAuth, getProductos);         // Obtener todos
// 🔒 Solo app del local
router.get("/repuestos", requireAuth, getRepuestosProducto);
router.get("/buscar", requireAuth, buscarProductos);
router.get("/:id", optionalAuth, getProductoById);   // Obtener por ID
router.post("/", requireAuth, uploadProductoFoto.single('foto'), createProducto);      // Crear producto
router.put("/:id", requireAuth, uploadProductoFoto.single('foto'), updateProducto);    // Actualizar
router.delete("/:id", requireAuth, deleteProducto); // Eliminar

export default router;