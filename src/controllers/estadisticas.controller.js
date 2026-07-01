// // import { pool } from '../config/db.js';
import { supabase } from '../config/supabase.js';

export const getTrabajosDelMes = async (req, res) => {
  try {
    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();

    // Reutilizamos la lógica de la función RPC que ya tienes definida para el mes actual
    const { data, error } = await supabase.rpc('get_estadisticas_por_mes', {
      _mes: mesActual,
      _anio: anioActual
    });

    if (error) throw error;

    res.json({
      trabajos_mes: data.trabajos_mes,
      clientes_frecuentes: data.clientes_frecuentes,
      reparaciones_comunes: data.reparaciones_comunes,
      equipos_comunes: data.equipos_comunes,
    });
  } catch (error) {
    console.error('Error en getTrabajosDelMes:', error.message);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
};

/**
 * 2️⃣ Clientes Frecuentes
 */
export const getClientesFrecuentes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cliente')
      .select(`
        id,
        nombre,
        apellido,
        equipo:equipo(id)
      `)
      .limit(10);

    if (error) throw error;

    // Mapeo manual para mantener la respuesta idéntica (COUNT de equipos)
    const clientes_frecuentes = data.map(c => ({
      cliente_id: c.id,
      nombre: c.nombre,
      apellido: c.apellido,
      cantidad_equipos: c.equipo.length
    })).sort((a, b) => b.cantidad_equipos - a.cantidad_equipos);

    res.json({ clientes_frecuentes });
  } catch (error) {
    console.error('Error en getClientesFrecuentes:', error.message);
    res.status(500).json({ error: 'Error obteniendo clientes frecuentes' });
  }
};

/**
 * 3️⃣ Reparaciones comunes
 */
export const getReparacionesComunes = async (req, res) => {
  try {
    // Para GROUP BY complejos con COUNT, lo mejor es una vista o RPC, 
    // pero podemos emularlo así:
    const { data, error } = await supabase.rpc('get_reparaciones_comunes_simple'); 
    // Si no tienes RPC, puedes usar .select('problema').then(...) y contar en JS
    
    if (error) throw error;
    res.json({ reparaciones_comunes: data });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo reparaciones comunes' });
  }
};

/**
 * 5️⃣ Estadísticas por Mes (RPC - Ya lo tenías casi listo)
 */
// export const getEstadisticasPorMes = async (req, res) => {
//   try {
//     const { mes, anio } = req.query;
//     if (!mes) return res.status(400).json({ error: 'Falta mes' });

//     const year = anio ? Number(anio) : new Date().getFullYear();

//     const { data, error } = await supabase.rpc('get_estadisticas_por_mes', {
//       _mes: Number(mes),
//       _anio: year
//     });

//     if (error) throw error;
//     return res.json(data);
//   } catch (err) {
//     res.status(500).json({ error: 'Error obteniendo estadísticas por mes' });
//   }
// };





// GET /api/estadisticas/mes?mes=12&anio=2025
export const getEstadisticasPorMes = async (req, res) => {
  try {
    const hoy = new Date();
    const nMes = req.query.mes ? Number(req.query.mes) : (hoy.getMonth() + 1);
    const nAnio = req.query.anio ? Number(req.query.anio) : hoy.getFullYear();

    if (!Number.isFinite(nMes) || nMes < 1 || nMes > 12) {
      return res.status(400).json({ success: false, error: "mes inválido (1-12)" });
    }
    if (!Number.isFinite(nAnio) || nAnio < 2000 || nAnio > 2100) {
      return res.status(400).json({ success: false, error: "anio inválido" });
    }

    const mesStr = String(nMes).padStart(2, "0");
    const periodoBusqueda = `${mesStr}/${nAnio}`; // coincide con el RPC "MM/YYYY"

    // Rango para filtrar ventas (fecha es TIMESTAMP sin TZ en tu DB)
    const start = `${nAnio}-${mesStr}-01 00:00:00`;
    const endDate = new Date(nAnio, nMes, 1); // mes siguiente (nMes es 1-12; Date usa 0-11 pero acá funciona por constructor)
    const endMesStr = String(endDate.getMonth() + 1).padStart(2, "0");
    const end = `${endDate.getFullYear()}-${endMesStr}-01 00:00:00`;

    // ================== FUENTES EN PARALELO ==================
    const [tallerResp, ventasResp] = await Promise.all([
      supabase.rpc("obtener_balance_presupuestos"),
      supabase
        .from("venta")
        .select(`
          id,
          total,
          canal,
          fecha,
          estado_id,
          cliente_id,
          cliente:cliente_id ( id, nombre, apellido ),
          detalle_venta (
            producto_id,
            cantidad,
            subtotal,
            producto:producto_id ( id, nombre, costo )
          )
        `)
        .in("estado_id", [19, 26])
        .gte("fecha", start)
        .lt("fecha", end),
    ]);

    if (tallerResp.error) {
      console.error("Error RPC obtener_balance_presupuestos:", tallerResp.error);
      return res.status(500).json({ success: false, error: tallerResp.error.message || "Error taller" });
    }
    if (ventasResp.error) {
      console.error("Error query ventas:", ventasResp.error);
      return res.status(500).json({ success: false, error: ventasResp.error.message || "Error ventas" });
    }

    // ================== TALLER (RPC exacto) ==================
    const tallerRows = Array.isArray(tallerResp.data) ? tallerResp.data : [];

    const tallerDelMes = tallerRows.filter((r) => r?.mes === periodoBusqueda);

    const totalFacturadoTaller = tallerDelMes.reduce((acc, r) => acc + Number(r?.total_total ?? 0), 0);
    const costoTotalTaller = tallerDelMes.reduce((acc, r) => acc + Number(r?.costo_total ?? 0), 0);
    const balanceTotalTaller = tallerDelMes.reduce((acc, r) => acc + Number(r?.balance_final ?? 0), 0);

    // ================== VENTAS (por canal + top) ==================
    const ventas = Array.isArray(ventasResp.data) ? ventasResp.data : [];

    let totalVentas = 0;
    let totalCostos = 0;

    let totalVentasLocal = 0;
    let totalCostosLocal = 0;

    let totalVentasWeb = 0;
    let totalCostosWeb = 0;

    // Top clientes / productos (para tu UI)
    const gastoPorCliente = new Map();       // cliente_id -> {cliente_id, nombre, total}
    const cantidadPorProducto = new Map();   // producto_id -> {producto_id, nombre_producto, cantidad}

    const ventasNormalizadas = ventas.map((v) => {
      const canal = v?.canal || "desconocido";
      const ventaTotal = Number(v?.total ?? 0);

      const productos = (v?.detalle_venta || []).map((dv) => {
        const productoId = Number(dv?.producto_id ?? dv?.producto?.id ?? 0);
        const nombreProducto = dv?.producto?.nombre ?? "Producto";
        const cantidad = Number(dv?.cantidad ?? 0);
        const subtotal = Number(dv?.subtotal ?? 0);
        const costoUnit = Number(dv?.producto?.costo ?? 0);

        const costoItem = costoUnit * cantidad;

        // Top productos
        if (productoId) {
          const prev = cantidadPorProducto.get(productoId);
          if (prev) prev.cantidad += cantidad;
          else cantidadPorProducto.set(productoId, { producto_id: productoId, nombre_producto: nombreProducto, cantidad });
        }

        return {
          producto_id: productoId,
          nombre_producto: nombreProducto,
          cantidad,
          subtotal,
          costo_unitario: costoUnit,
          costo_total: costoItem,
          ganancia_item: subtotal - costoItem,
        };
      });

      const costoVenta = productos.reduce((acc, p) => acc + Number(p?.costo_total ?? 0), 0);

      // Totales globales
      totalVentas += ventaTotal;
      totalCostos += costoVenta;

      // Totales por canal
      if (canal === "local") {
        totalVentasLocal += ventaTotal;
        totalCostosLocal += costoVenta;
      } else if (canal === "web_shop") {
        totalVentasWeb += ventaTotal;
        totalCostosWeb += costoVenta;
      }

      // Top clientes
      const clienteId = Number(v?.cliente_id ?? v?.cliente?.id ?? 0);
      if (clienteId) {
        const nombre = v?.cliente
          ? `${v.cliente.nombre || ""} ${v.cliente.apellido || ""}`.trim()
          : `Cliente ${clienteId}`;
        const prev = gastoPorCliente.get(clienteId);
        if (prev) prev.total += ventaTotal;
        else gastoPorCliente.set(clienteId, { cliente_id: clienteId, nombre, total: ventaTotal });
      }

      return {
        venta_id: Number(v?.id ?? 0),
        fecha: v?.fecha ?? null,
        canal,
        total: ventaTotal,
        productos, // 👈 tu front hace ventas.flatMap(v => v.productos)
      };
    });

    const totalGanancia = totalVentas - totalCostos;

    const ventasResumen = {
      // ✅ tu frontend lee ventasResumen?.data?.total_ventas etc.
      data: {
        total_ventas: totalVentas,
        total_costos: totalCostos,
        total_ganancia: totalGanancia,

        // ✅ división por canal
        por_canal: {
          local: {
            total_ventas: totalVentasLocal,
            total_costos: totalCostosLocal,
            total_ganancia: totalVentasLocal - totalCostosLocal,
          },
          web_shop: {
            total_ventas: totalVentasWeb,
            total_costos: totalCostosWeb,
            total_ganancia: totalVentasWeb - totalCostosWeb,
          },
        },

        // ✅ tu frontend usa: ventasResumen?.data?.ventas.flatMap(...)
        ventas: ventasNormalizadas,

        // ✅ ya listo para “Top clientes” si lo querés consumir directo
        top_clientes: Array.from(gastoPorCliente.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, 5),

        // ✅ ya listo para “Top productos”
        top_productos: Array.from(cantidadPorProducto.values())
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 5),
      },
    };

    // ================== RESPUESTA FINAL (NO ROMPER PRODUCCIÓN) ==================
    const resumen_general = {
      total_facturado: totalFacturadoTaller,
      costo_total: costoTotalTaller,
      balance_total: balanceTotalTaller,
    };

    return res.status(200).json({
      success: true,

      // ✅ Retrocompatibilidad: por si tu front usa resumen.resumen_general directo
      // resumen_general,

      // ✅ Formato estándar: todo dentro de data
      data: {
        periodo: periodoBusqueda,

        // ✅ Servicio Técnico (lo que tu componente necesita)
        resumen_general,

        // Extras útiles
        taller: {
          cantidad_equipos: tallerDelMes.length,
          detalle_por_equipo: tallerDelMes, // si luego querés mostrar cards por equipo
        },

        // ✅ Ventas del mes (para el fragmento de ventas)
        ventasResumen,
      },
    });
  } catch (error) {
    console.error("Error en getEstadisticasPorMes:", error);
    return res.status(500).json({ success: false, error: error.message || "Error interno" });
  }
};

/**
 * 💰 VENTAS: getResumenVentasPorMes (Lógica de mapeo de productos)
 */
export const getResumenVentasPorMes = async (req, res) => {
  const { mes, anio } = req.query;
  if (!mes || !anio) return res.status(400).json({ success: false, error: "Faltan mes y anio" });

  try {
    // Usamos el cliente para traer los datos relacionados (Join)
    const { data: rows, error } = await supabase
      .from('venta')
      .select(`
        id,
        fecha,
        estado_id,
        cliente:cliente(id, nombre),
        detalle_venta:detalle_venta(
          cantidad,
          precio_unitario,
          producto:producto(id, nombre, costo)
        )
      `)
      .neq('estado_id', 20) // Excluir bajas
      // Filtro de fecha simplificado para Supabase
      .gte('fecha', `${anio}-${mes}-01`)
      .lte('fecha', `${anio}-${mes}-31`);

    if (error) throw error;

    const ventasMap = {};
    let total_ventas = 0;
    let total_costos = 0;

    rows.forEach(v => {
      const ventaId = v.id;
      if (!ventasMap[ventaId]) {
        ventasMap[ventaId] = {
          venta_id: ventaId,
          fecha: v.fecha,
          cliente_id: v.cliente.id,
          nombre_cliente: v.cliente.nombre,
          productos: [],
          total: 0,
          total_costo: 0,
        };
      }

      v.detalle_venta.forEach(dv => {
        const subtotal = Number(dv.cantidad) * Number(dv.precio_unitario);
        const subtotal_costo = Number(dv.cantidad) * Number(dv.producto.costo);

        ventasMap[ventaId].productos.push({
          producto_id: dv.producto.id,
          nombre_producto: dv.producto.nombre,
          cantidad: dv.cantidad,
          precio_unitario: dv.precio_unitario,
          costo_unitario: dv.producto.costo,
          subtotal,
          subtotal_costo,
        });

        ventasMap[ventaId].total += subtotal;
        ventasMap[ventaId].total_costo += subtotal_costo;
      });
    });

    const ventas = Object.values(ventasMap);
    total_ventas = ventas.reduce((sum, v) => sum + v.total, 0);
    total_costos = ventas.reduce((sum, v) => sum + v.total_costo, 0);

    res.status(200).json({
      success: true,
      data: {
        total_ventas,
        total_costos,
        total_ganancia: total_ventas - total_costos,
        ventas,
      },
    });
  } catch (error) {
    console.error("Error en ventas mes:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener las ventas" });
  }
};

/**
 * 🔍 Resumen de saldos de clientes
 */
export const getResumenCuentaClienteByID = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('venta')
      .select(`
        saldo,
        cliente:cliente(id, nombre, apellido)
      `)
      .gt('saldo', 0);

    if (error) throw error;

    // Agrupamos por cliente manualmente para mantener la estructura original
    const agrupado = data.reduce((acc, curr) => {
      const cid = curr.cliente.id;
      if (!acc[cid]) {
        acc[cid] = { 
          cliente_id: cid, 
          nombre: curr.cliente.nombre, 
          apellido: curr.cliente.apellido, 
          saldo_pendiente: 0 
        };
      }
      acc[cid].saldo_pendiente += Number(curr.saldo);
      return acc;
    }, {});

    res.status(200).json({ 
      success: true, 
      data: Object.values(agrupado).sort((a,b) => b.saldo_pendiente - a.saldo_pendiente) 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Error en saldos" });
  }
};
/**
 * 4️⃣ Tipos y modelos de equipos comunes
 */
export const getEquiposComunes = async (req, res) => {
  try {
    // Opción A: Si tienes una función RPC (Recomendado para velocidad)
    const { data: equiposComunes, error } = await supabase.rpc('get_equipos_comunes_estadistica');

    // Opción B: Si prefieres no crear el RPC ahora, podemos usar esta lógica:
    /*
    const { data, error } = await supabase
      .from('equipo')
      .select('tipo, marca, modelo');
      
    // Luego agrupamos en JS (solo si el volumen de datos es manejable)
    const conteo = data.reduce((acc, eq) => {
      const key = `${eq.tipo}-${eq.marca}-${eq.modelo}`;
      if (!acc[key]) {
        acc[key] = { tipo: eq.tipo, marca: eq.marca, modelo: eq.modelo, cantidad: 0 };
      }
      acc[key].cantidad++;
      return acc;
    }, {});
    const equiposComunes = Object.values(conteo)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
    */

    if (error) throw error;

    // Devolvemos exactamente el mismo formato de objeto
    res.json({ equipos_comunes: equiposComunes });
    
  } catch (error) {
    console.error('Error en getEquiposComunes:', error.message);
    res.status(500).json({ error: 'Error obteniendo equipos comunes' });
  }
};

// ✅ Resumen de ventas por período dado
export const resumenPorPeriodo = async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    return res.status(400).json({ success: false, error: "Fechas de inicio y fin son requeridas" });
  }

  try {
    // 1. Consultamos las ventas en el rango de fechas
    // Pedimos solo el campo 'total' para no sobrecargar la red
    const { data, error, count } = await supabase
      .from('venta')
      .select('total', { count: 'exact' }) 
      .gte('fecha', fecha_inicio)
      .lte('fecha', fecha_fin);

    if (error) throw error;

    // 2. Calculamos el total de ingresos sumando los totales del array devuelto
    const total_ingresos = data.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

    // 3. Devolvemos la respuesta con la misma estructura original
    res.status(200).json({ 
      success: true, 
      data: {
        numero_ventas: count || 0,
        total_ingresos: total_ingresos
      }
    });

  } catch (error) {
    console.error("Error al obtener el resumen de ventas por período:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener el resumen de ventas por período" });
  }
};

export const getResumenVentasPorPeriodo = async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    return res.status(400).json({ success: false, error: "Fechas de inicio y fin son requeridas" });
  }

  try {
    const { data, error, count } = await supabase
      .from('venta')
      .select('total', { count: 'exact' })
      .gte('fecha', fecha_inicio)
      .lte('fecha', fecha_fin);

    if (error) throw error;

    const total_ingresos = data.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

    res.status(200).json({ 
      success: true, 
      data: {
        numero_ventas: count || 0,
        total_ingresos: total_ingresos
      } 
    });
  } catch (error) {
    console.error("Error en resumen por periodo:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener el resumen de ventas" });
  }
};

export const getEstadisticasHistoricas = async (req, res) => {
  try {
    const [tallerResp, ventasHistResp] = await Promise.all([
      supabase.rpc("obtener_balance_presupuestos"),
      supabase.rpc("obtener_ventas_historico"),
    ]);

    if (tallerResp.error) {
      console.error("Error RPC obtener_balance_presupuestos:", tallerResp.error);
      return res.status(500).json({ success: false, error: tallerResp.error.message || "Error taller" });
    }
    if (ventasHistResp.error) {
      console.error("Error RPC obtener_ventas_historico:", ventasHistResp.error);
      return res.status(500).json({ success: false, error: ventasHistResp.error.message || "Error ventas" });
    }

    const tallerRows = Array.isArray(tallerResp.data) ? tallerResp.data : [];
    const ventasRows = Array.isArray(ventasHistResp.data) ? ventasHistResp.data : [];

    // Meses presentes (unimos ambos)
    const mesesSet = new Set([
      ...tallerRows.map(r => r?.mes).filter(Boolean),
      ...ventasRows.map(r => r?.mes).filter(Boolean),
    ]);

    // Orden desc por año/mes (MM/YYYY)
    const mesesOrdenados = Array.from(mesesSet).sort((a, b) => {
      const [ma, ya] = String(a).split("/").map(Number);
      const [mb, yb] = String(b).split("/").map(Number);
      if (ya !== yb) return yb - ya;
      return mb - ma;
    });

    const historico = mesesOrdenados.map((periodo) => {
      // ====== TALLER (ya viene agregado por equipo y mes) ======
      const tallerDelMes = tallerRows.filter(r => r?.mes === periodo);

      const totalFacturadoTaller = tallerDelMes.reduce((acc, r) => acc + Number(r?.total_total ?? 0), 0);
      const costoTotalTaller = tallerDelMes.reduce((acc, r) => acc + Number(r?.costo_total ?? 0), 0);
      const balanceTotalTaller = tallerDelMes.reduce((acc, r) => acc + Number(r?.balance_final ?? 0), 0);

      const resumen_general = {
        total_facturado: totalFacturadoTaller,
        costo_total: costoTotalTaller,
        balance_total: balanceTotalTaller,
      };

      // ====== VENTAS (RPC trae cada venta con productos + costo_total) ======
      const ventasDelMes = ventasRows.filter(v => v?.mes === periodo);

      let totalVentas = 0;
      let totalCostos = 0;

      let totalVentasLocal = 0;
      let totalCostosLocal = 0;

      let totalVentasWeb = 0;
      let totalCostosWeb = 0;

      const gastoPorCliente = new Map();
      const cantidadPorProducto = new Map();

      const ventasNormalizadas = ventasDelMes.map((v) => {
        const canal = v?.canal || "desconocido";
        const ventaTotal = Number(v?.total ?? 0);
        const costoVenta = Number(v?.costo_total ?? 0);

        totalVentas += ventaTotal;
        totalCostos += costoVenta;

        if (canal === "local") {
          totalVentasLocal += ventaTotal;
          totalCostosLocal += costoVenta;
        } else if (canal === "web_shop") {
          totalVentasWeb += ventaTotal;
          totalCostosWeb += costoVenta;
        }

        // top clientes
        const clienteId = Number(v?.cliente_id ?? v?.cliente?.id ?? 0);
        if (clienteId) {
          const nombre = v?.cliente
            ? `${v.cliente.nombre || ""} ${v.cliente.apellido || ""}`.trim()
            : `Cliente ${clienteId}`;
          const prev = gastoPorCliente.get(clienteId);
          if (prev) prev.total += ventaTotal;
          else gastoPorCliente.set(clienteId, { cliente_id: clienteId, nombre, total: ventaTotal });
        }

        // productos (ya vienen listos del RPC)
        const productos = Array.isArray(v?.productos) ? v.productos : [];

        // top productos (cantidad)
        for (const p of productos) {
          const pid = Number(p?.producto_id ?? 0);
          const cant = Number(p?.cantidad ?? 0);
          const nombreProducto = p?.nombre_producto ?? "Producto";
          if (!pid) continue;
          const prev = cantidadPorProducto.get(pid);
          if (prev) prev.cantidad += cant;
          else cantidadPorProducto.set(pid, { producto_id: pid, nombre_producto: nombreProducto, cantidad: cant });
        }

        return {
          venta_id: Number(v?.venta_id ?? 0),
          fecha: v?.fecha ?? null,
          canal,
          total: ventaTotal,
          productos,
        };
      });

      const ventasResumen = {
        data: {
          total_ventas: totalVentas,
          total_costos: totalCostos,
          total_ganancia: totalVentas - totalCostos,
          por_canal: {
            local: {
              total_ventas: totalVentasLocal,
              total_costos: totalCostosLocal,
              total_ganancia: totalVentasLocal - totalCostosLocal,
            },
            web_shop: {
              total_ventas: totalVentasWeb,
              total_costos: totalCostosWeb,
              total_ganancia: totalVentasWeb - totalCostosWeb,
            },
          },
          ventas: ventasNormalizadas,
          top_clientes: Array.from(gastoPorCliente.values()).sort((a,b)=>b.total-a.total).slice(0,5),
          top_productos: Array.from(cantidadPorProducto.values()).sort((a,b)=>b.cantidad-a.cantidad).slice(0,5),
        },
      };

      return {
        periodo,
        resumen_general, // mismo nombre que tu endpoint actual
        taller: {
          cantidad_equipos: tallerDelMes.length,
          detalle_por_equipo: tallerDelMes,
        },
        ventasResumen,
      };
    });

    return res.status(200).json({
      success: true,
      data: { historico },
    });
  } catch (error) {
    console.error("Error en getEstadisticasHistoricas:", error);
    return res.status(500).json({ success: false, error: error.message || "Error interno" });
  }
};


/**
 * GET /estadisticas/resumen-semana
 * Equipos ingresados, órdenes creadas y balance de los últimos 7 días.
 */
export const getResumenSemana = async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_resumen_semana');
    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error en getResumenSemana:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};