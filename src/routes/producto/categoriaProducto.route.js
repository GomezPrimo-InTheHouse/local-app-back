// src/routes/categoriaProducto.routes.js
import { Router } from "express";
import {
  getCategoriasProducto,
  createCategoriaProducto
} from "../../controllers/producto/categoriaProducto.controller.js";

const router = Router();

// Obtener todas las categorías
router.get("/", getCategoriasProducto);

// Crear una nueva categoría
router.post("/", createCategoriaProducto);

export default router;
