// src/microservices/ms-general.js
import express, { json } from "express";
import dotenv from "dotenv";
import morgan from "morgan";

import ClienteRoute           from "../routes/cliente.route.js";
import EquipoRoute            from "../routes/equipo.route.js";
import PresupuestoRoute       from "../routes/presupuesto.route.js";
import OrdenTrabajoRoute      from "../routes/orden_trabajo.routes.js";
import AuthRoute              from "../routes/auth/auth.routes.js";
import EstadoRoute            from "../routes/estado.route.js";
import HistorialRoute         from "../routes/historial.route.js";
import EstadisticasRoute      from "../routes/estadisticas.routes.js";
import ProductoRoute          from "../routes/producto/producto.route.js";
import CategoriaProductoRoute from "../routes/producto/categoriaProducto.route.js";
import VentaRoute             from "../routes/venta.route.js";
import ShopRoute              from "../routes/shop/shop.route.js";
import PagoRoute              from "../routes/pago/pago.routes.js";
import FavoritosRoute         from "../routes/shop/favoritos.route.js";
import CelularRoute           from "../routes/celular/celular.route.js";
import DolarRoute             from "../routes/celular/dolar.route.js";
import ServicioRoute          from "../routes/servicio.route.js";
import { requireAuth }        from "../middlewares/auth/autorizacionDeRoles.js";
import { requireModulo, requireActivo, soloAdmin } from "../middlewares/auth/permisos.js";
import EmpleadoRoute          from "../routes/auth/empleado.route.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 7001;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "https://local-app-front.vercel.app",
  /\.vercel\.app$/,
  "http://localhost:7000",
  "http://localhost:7001"
];

// === CORS HARD MODE (PRIMERO) ===
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = !origin
    ? true
    : allowedOrigins.some(o => (o instanceof RegExp ? o.test(origin) : o === origin));

  if (isAllowed && origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  const reqHeaders = req.headers["access-control-request-headers"];
  res.header(
    "Access-Control-Allow-Headers",
    reqHeaders || "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    if (!isAllowed && origin) return res.sendStatus(403);
    return res.sendStatus(204);
  }
  return next();
});

app.set("trust proxy", 1);

// middlewares comunes
app.use(morgan("dev"));
app.use(json());

// rutas
// 🔒 Todo lo de la app del local exige token (requireAuth).
// 🌐 Públicas: /auth (tiene sus propias credenciales), /shop y /favoritos
//    (las usa el shop web) y GET /producto (versión reducida, ver producto.route.js).
app.use("/auth",              AuthRoute);
app.use("/shop",              ShopRoute);
app.use("/favoritos",         FavoritosRoute);
app.use("/producto",          ProductoRoute);

// 👤 Admin: todo. Empleado (rol tecnico): solo los módulos habilitados en usuario.modulos.
//    requireModulo(principal, ...lectura): para escribir hace falta el módulo principal;
//    para leer (GET) alcanza con cualquiera de la lista.
app.use("/equipo",            requireModulo("equipos"), EquipoRoute);
app.use("/cliente",           requireModulo("clientes", "equipos", "ventas", "celulares"), ClienteRoute);
app.use("/presupuesto",       requireModulo("equipos"), PresupuestoRoute);
app.use("/orden-trabajo",     requireModulo("equipos"), OrdenTrabajoRoute);
app.use("/estado",            requireActivo, EstadoRoute);
app.use("/historial",         requireModulo("equipos", "clientes"), HistorialRoute);
app.use("/venta",             requireModulo("ventas", "clientes"), VentaRoute);
app.use("/categoria-producto", requireModulo("productos", "ventas"), CategoriaProductoRoute);
// /pago = abonos de reparaciones (pago_abono). Los pagos de ventas van por /venta.
app.use("/pago",              requireModulo("equipos", "clientes"), PagoRoute);
app.use("/celular",           requireModulo("celulares"), CelularRoute);
app.use("/dolar",             requireModulo("celulares", "ventas", "productos"), DolarRoute);
// Catálogo de servicios: lo lee el presupuesto (Equipos); las escrituras ya son solo admin
app.use("/servicio",          requireModulo("servicios", "equipos"), ServicioRoute);

// 🔒 Siempre solo admin: estadísticas/KPIs y gestión de empleados
app.use("/estadisticas",      soloAdmin, EstadisticasRoute);
app.use("/empleado",          soloAdmin, EmpleadoRoute);

// healthcheck
app.get("/health", (_req, res) => {
  res.json({
    service: "Microservicio gral",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// start
app.listen(PORT, () => {
  console.log(`Microservicio gral corriendo en http://localhost:${PORT}`);
});

app.get('/', (_req, res) => res.status(200).send('OK – backend up'));
app.head('/', (_req, res) => res.status(200).end());
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok', time: new Date().toISOString() }));