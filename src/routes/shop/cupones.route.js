import { Router } from "express";
import {
  listarCupones,
  crearCuponManual,
} from "../../controllers/shop/cupon.controller.js";

const router = Router();

router.get("/", listarCupones);
router.post("/", crearCuponManual);

export default router;
