// // microservices/ms-shop.js
// import express, { json } from "express";
// import dotenv from "dotenv";
// import morgan from "morgan";

// import ShopRoute from "../routes/shop/shop.route.js"; 
// // 👆 Ajustá la ruta según dónde definas tus rutas del shop
// // por ejemplo: "../routes/shop/shop.routes.js" si las ponés en una subcarpeta

// dotenv.config();

// const app = express();
// const PORT = process.env.SHOP_PORT || 7003;

// // ⚠️ Usamos la misma política de CORS que en ms-general
// const allowedOrigins = [
//   "http://localhost:5173",
//   "http://localhost:4173",
//   "https://local-app-front.vercel.app",
//   /\.vercel\.app$/,
//   "http://localhost:7000",
// ];

// // === CORS HARD MODE (MISMA LÓGICA QUE ms-general.js) ===
// app.use((req, res, next) => {
//   const origin = req.headers.origin;

//   const isAllowed = !origin
//     ? true
//     : allowedOrigins.some((o) =>
//         o instanceof RegExp ? o.test(origin) : o === origin
//       );

//   if (isAllowed && origin) {
//     res.header("Access-Control-Allow-Origin", origin);
//     res.header("Vary", "Origin");
//   }

//   res.header("Access-Control-Allow-Credentials", "true");
//   res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

//   const reqHeaders = req.headers["access-control-request-headers"];
//   res.header(
//     "Access-Control-Allow-Headers",
//     reqHeaders || "Content-Type, Authorization"
//   );

//   if (req.method === "OPTIONS") {
//     if (!isAllowed && origin) return res.sendStatus(403);
//     return res.sendStatus(204);
//   }

//   return next();
// });

// // si usás cookies/sesión detrás de proxy/ngrok
// app.set("trust proxy", 1);

// // middlewares comunes
// app.use(morgan("dev"));
// app.use(json());

// // rutas del microservicio SHOP
// // acá vas a colgar login cliente, sesiones, visualizaciones, ventas web, etc.
// app.use("/shop", ShopRoute);

// // healthchecks
// app.get("/health", (_req, res) => {
//   res.json({
//     service: "Microservicio SHOP",
//     status: "healthy",
//     timestamp: new Date().toISOString(),
//   });
// });

// app.get("/", (_req, res) => {
//   res.status(200).send("OK – ms-shop up");
// });

// app.head("/", (_req, res) => {
//   res.status(200).end();
// });

// app.get("/healthz", (_req, res) => {
//   res.status(200).json({ status: "ok", time: new Date().toISOString() });
// });

// // start
// app.listen(PORT, () => {
//   console.log(`🛍️ Microservicio SHOP corriendo en http://localhost:${PORT}`);
// });
