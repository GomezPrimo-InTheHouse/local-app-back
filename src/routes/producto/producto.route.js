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

const router = express.Router();

router.post("/", createProducto);      // Crear producto
router.get("/", getProductos);         // Obtener todos
router.get("/repuestos", getRepuestosProducto);
router.get("/buscar", buscarProductos);
router.get("/:id", getProductoById);   // Obtener por ID
router.put("/:id", updateProducto);    // Actualizar
router.delete("/:id", deleteProducto); // Eliminar

export default router;
