// routes/shop.favoritos.routes.js
import { Router } from "express";
import {
  getFavoritosByClienteId,
  addFavorito,
  removeFavorito,
  toggleFavorito,
} from "../../controllers/shop/favoritos.controller.js";

const router = Router();

router.get("/clientes/:clienteId/favoritos", getFavoritosByClienteId);
router.post("/clientes/:clienteId/favoritos", addFavorito);
router.delete("/clientes/:clienteId/favoritos/:productoId", removeFavorito);

// opcional
router.post("/clientes/:clienteId/favoritos/toggle", toggleFavorito);

export default router;
