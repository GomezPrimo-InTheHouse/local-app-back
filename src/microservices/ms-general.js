// ms-general.js
import express, { json } from "express";
import dotenv from "dotenv";
import morgan from "morgan";

import ClienteRoute  from "../routes/cliente.route.js";
import EquipoRoute from "../routes/equipo.route.js";
import PresupuestoRoute from "../routes/presupuesto.route.js";
import IngresoRoute from "../routes/ingreso.route.js";
import AuthRoute from "../routes/auth/auth.routes.js";
import EstadoRoute from "../routes/estado.route.js";
import HistorialRoute from "../routes/historial.route.js";
import EstadisticasRoute from "../routes/estadisticas.routes.js";
import ProductoRoute from "../routes/producto.route.js";
import VentaRoute from "../routes/venta.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7001;

// ⚠️ Actualizá la URL de ngrok vigente si cambia
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://tuapp.vercel.app",
  /\.vercel\.app$/,
  "https://lanita-buckshee-enharmonically.ngrok-free.dev",
  "https://lanita-buckshee-enharmonically.ngrok-free.app",
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

  // reflejar exactamente lo que pide el preflight
  const reqHeaders = req.headers["access-control-request-headers"];
  res.header(
    "Access-Control-Allow-Headers",
    reqHeaders || "Content-Type, Authorization, ngrok-skip-browser-warning"
  );

  if (req.method === "OPTIONS") {
    if (!isAllowed && origin) return res.sendStatus(403);
    return res.sendStatus(204);
  }
  return next();
});

// (si usás cookies/sesión detrás de ngrok/proxy)
app.set("trust proxy", 1);

// middlewares comunes
app.use(morgan("dev"));
app.use(json());

// rutas
app.use("/equipo", EquipoRoute);
app.use("/cliente", ClienteRoute);
app.use("/presupuesto", PresupuestoRoute);
app.use("/ingreso", IngresoRoute);
app.use("/auth", AuthRoute);
app.use("/estado", EstadoRoute);
app.use("/historial", HistorialRoute);
app.use("/estadisticas", EstadisticasRoute);
app.use("/producto", ProductoRoute);
app.use("/venta", VentaRoute);

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
