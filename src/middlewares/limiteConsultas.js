// src/middlewares/limiteConsultas.js
// Límite simple de consultas por IP para rutas públicas (sin dependencias).
// Evita que alguien pruebe DNIs en masa contra la consulta de equipos.

export const limiteConsultas = ({ max = 20, ventanaMs = 10 * 60 * 1000 } = {}) => {
  const hits = new Map(); // ip -> { n, desde }

  // Limpieza periódica para no acumular IPs viejas
  setInterval(() => {
    const ahora = Date.now();
    for (const [ip, h] of hits) if (ahora - h.desde > ventanaMs) hits.delete(ip);
  }, ventanaMs).unref();

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'desconocida';
    const ahora = Date.now();
    const h = hits.get(ip);

    if (!h || ahora - h.desde > ventanaMs) {
      hits.set(ip, { n: 1, desde: ahora });
      return next();
    }
    if (h.n >= max) {
      const minutos = Math.ceil((ventanaMs - (ahora - h.desde)) / 60000);
      return res.status(429).json({
        code: 'DEMASIADAS_CONSULTAS',
        msg: `Hiciste muchas consultas seguidas. Probá de nuevo en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`,
      });
    }
    h.n += 1;
    return next();
  };
};

export default limiteConsultas;
