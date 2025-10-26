// // ms-general.js
// import express, { json } from "express";
// import dotenv from "dotenv";
// import morgan from "morgan";

// import ClienteRoute  from "../routes/cliente.route.js";
// import EquipoRoute from "../routes/equipo.route.js";
// import PresupuestoRoute from "../routes/presupuesto.route.js";
// import IngresoRoute from "../routes/ingreso.route.js";
// import AuthRoute from "../routes/auth/auth.routes.js";
// import EstadoRoute from "../routes/estado.route.js";
// import HistorialRoute from "../routes/historial.route.js";
// import EstadisticasRoute from "../routes/estadisticas.routes.js";
// import ProductoRoute from "../routes/producto.route.js";
// import VentaRoute from "../routes/venta.route.js";

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 7001;

// // ⚠️ Actualizá la URL de ngrok vigente si cambia
// const allowedOrigins = [
//   "http://localhost:5173",
//   "http://localhost:4173",
//   "https://local-app-front.vercel.app",
//   /\.vercel\.app$/,
//   "https://lanita-buckshee-enharmonically.ngrok-free.dev",
//   "https://lanita-buckshee-enharmonically.ngrok-free.app",
// ];

// function isHostAllowed(origin) {
//   if (!origin) return true; // permitir curl/healthchecks sin Origin
//   try {
//     const { host } = new URL(origin); // ej. "local-app-front.vercel.app"
//     if (allowedHosts.has(host)) return true;
//     // permite cualquier *.vercel.app
//     if (host.endsWith(".vercel.app")) return true;
//     return false;
//   } catch {
//     // si el header Origin viene raro, mejor negar
//     return false;
//   }
// }

// // === CORS HARD MODE (PRIMERO) ===
// // app.use((req, res, next) => {
// //   const origin = req.headers.origin;
// //   const isAllowed = !origin
// //     ? true
// //     : allowedOrigins.some(o => (o instanceof RegExp ? o.test(origin) : o === origin));

// //   if (isAllowed && origin) {
// //     res.header("Access-Control-Allow-Origin", origin);
// //     res.header("Vary", "Origin");
// //   }
// //   res.header("Access-Control-Allow-Credentials", "true");
// //   res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

// //   // reflejar exactamente lo que pide el preflight
// //   const reqHeaders = req.headers["access-control-request-headers"];
// //   res.header(
// //     "Access-Control-Allow-Headers",
// //     reqHeaders || "Content-Type, Authorization, ngrok-skip-browser-warning"
// //   );

// //   if (req.method === "OPTIONS") {
// //     if (!isAllowed && origin) return res.sendStatus(403);
// //     return res.sendStatus(204);
// //   }
// //   return next();
// // });
// app.use((req, res, next) => {
//   const origin = req.headers.origin;
//   const allowed = isHostAllowed(origin);

//   // Siempre variar por Origin para caches
//   res.setHeader("Vary", "Origin");

//   if (origin && allowed) {
//     res.setHeader("Access-Control-Allow-Origin", origin); // debe ser exacto si credentials=true
//   }
//   // si usás JWT via header, credentials puede ser false. Si algún día usás cookies, ponelo true.
//   res.setHeader("Access-Control-Allow-Credentials", "false");

//   res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

//   // reflejar lo que pide el preflight o set por defecto
//   const reqHeaders = req.headers["access-control-request-headers"];
//   res.setHeader(
//     "Access-Control-Allow-Headers",
//     reqHeaders || "Content-Type, Authorization, ngrok-skip-browser-warning"
//   );

//   if (req.method === "OPTIONS") {
//     // responder SIEMPRE el preflight antes que cualquier otro middleware
//     if (origin && !allowed) return res.sendStatus(403);
//     return res.sendStatus(204);
//   }

//   // si el origin no está permitido y existe, cortamos acá
//   if (origin && !allowed) return res.status(403).json({ error: "CORS: origin no permitido" });

//   next();
// });

// // (si usás cookies/sesión detrás de ngrok/proxy)
// app.set("trust proxy", 1);

// // middlewares comunes
// app.use(morgan("dev"));
// app.use(json());

// // rutas
// app.use("/equipo", EquipoRoute);
// app.use("/cliente", ClienteRoute);
// app.use("/presupuesto", PresupuestoRoute);
// app.use("/ingreso", IngresoRoute);
// app.use("/auth", AuthRoute);
// app.use("/estado", EstadoRoute);
// app.use("/historial", HistorialRoute);
// app.use("/estadisticas", EstadisticasRoute);
// app.use("/producto", ProductoRoute);
// app.use("/venta", VentaRoute);

// // healthcheck
// app.get("/health", (_req, res) => {
//   res.json({
//     service: "Microservicio gral",
//     status: "healthy",
//     timestamp: new Date().toISOString(),
//   });
// });

// // start
// app.listen(PORT, () => {
//   console.log(`Microservicio gral corriendo en http://localhost:${PORT}`);
// });


// src/microservices/ms-general.js
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first'); // cada hijo fuerza IPv4

import 'dotenv/config';                 // útil en dev local; en Render toma Environment
import express, { json } from 'express';
import morgan from 'morgan';

import ClienteRoute     from '../routes/cliente.route.js';
import EquipoRoute      from '../routes/equipo.route.js';
import PresupuestoRoute from '../routes/presupuesto.route.js';
import IngresoRoute     from '../routes/ingreso.route.js';
import AuthRoute        from '../routes/auth/auth.routes.js';
import EstadoRoute      from '../routes/estado.route.js';
import HistorialRoute   from '../routes/historial.route.js';
import EstadisticasRoute from '../routes/estadisticas.routes.js';
import ProductoRoute    from '../routes/producto.route.js';
import VentaRoute       from '../routes/venta.route.js';

import { pingDb, testDbConnection } from '../config/supabaseAuthModule.js';

const app = express();
const PORT = process.env.PORT || 7001;

// ⚠️ Actualizá la URL de ngrok vigente si cambia
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://local-app-front.vercel.app',
  /\.vercel\.app$/, // permite cualquier subdominio vercel.app
  'https://lanita-buckshee-enharmonically.ngrok-free.dev',
  'https://lanita-buckshee-enharmonically.ngrok-free.app',
];

// Armo Set con hosts explícitos
const allowedHosts = new Set(
  allowedOrigins
    .filter(o => typeof o === 'string')
    .map(u => {
      try { return new URL(u).host; } catch { return null; }
    })
    .filter(Boolean)
);

function isHostAllowed(origin) {
  if (!origin) return true; // permitir curl/healthchecks sin Origin
  try {
    const { host } = new URL(origin);

    if (allowedHosts.has(host)) return true;           // 1) hosts explícitos
    if (host.endsWith('.vercel.app')) return true;     // 2) comodín vercel
    for (const o of allowedOrigins) {                  // 3) regex configuradas
      if (o instanceof RegExp && o.test(origin)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// CORS estricto con reflexión del Origin permitido
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = isHostAllowed(origin);

  res.setHeader('Vary', 'Origin');

  if (origin && allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  // Si no usás cookies/sesión, puede ser "false"
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  const reqHeaders = req.headers['access-control-request-headers'];
  res.setHeader(
    'Access-Control-Allow-Headers',
    reqHeaders || 'Content-Type, Authorization, ngrok-skip-browser-warning'
  );

  if (req.method === 'OPTIONS') {
    if (origin && !allowed) return res.sendStatus(403);
    return res.sendStatus(204);
  }

  if (origin && !allowed) {
    return res.status(403).json({ error: 'CORS: origin no permitido' });
  }

  next();
});

// Proxy trust si estás detrás de ngrok/proxy
app.set('trust proxy', 1);

// Middlewares
app.use(morgan('dev'));
app.use(json());

// Rutas de negocio
app.use('/equipo',       EquipoRoute);
app.use('/cliente',      ClienteRoute);
app.use('/presupuesto',  PresupuestoRoute);
app.use('/ingreso',      IngresoRoute);
app.use('/auth',         AuthRoute);
app.use('/estado',       EstadoRoute);
app.use('/historial',    HistorialRoute);
app.use('/estadisticas', EstadisticasRoute);
app.use('/producto',     ProductoRoute);
app.use('/venta',        VentaRoute);

// Health básico
app.get('/health', (_req, res) => {
  res.json({
    service: 'Microservicio gral',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Health de DB para Render
app.get('/db/ready', async (_req, res) => {
  try {
    const ok = await pingDb();
    if (ok) return res.status(200).send('OK');
    return res.status(500).send('DB not ready');
  } catch {
    return res.status(500).send('DB error');
  }
});

// Inicio
app.listen(PORT, async () => {
  console.log(`Microservicio gral corriendo en http://localhost:${PORT}`);
  // Test de DB al arrancar (log claro y único)
  await testDbConnection();
});
