// controllers/ventaEsporadica.controller.js
import { supabase } from '../config/supabase.js';

/**
 * POST /venta/esporadica
 * Crea una venta esporádica con cliente_id ya existente y productos manuales.
 */
export const createVentaEsporadica = async (req, res) => {
  const { cliente_id, monto_abonado = 0, detalles = [] } = req.body;

  // --- Validaciones ---
  const clienteIdNum = Number(cliente_id);
  if (!Number.isFinite(clienteIdNum) || clienteIdNum <= 0) {
    return res.status(400).json({ success: false, error: 'cliente_id inválido.' });
  }

  if (!Array.isArray(detalles) || detalles.length === 0) {
    return res.status(400).json({ success: false, error: 'Debe incluir al menos un producto.' });
  }

  const montoAbonadoNum = Math.max(0, Number(monto_abonado) || 0);

  // --- Normalizar y calcular total ---
  let total = 0;
  const detallesNorm = [];

  for (let i = 0; i < detalles.length; i++) {
    const d = detalles[i];

    const nombre_producto = String(d.nombre_producto || '').trim();
    const cantidad        = Number(d.cantidad) || 1;
    const precio_unitario = Number(d.precio_unitario) || 0;
    const costo           = Number(d.costo) || 0;

    if (!nombre_producto) {
      return res.status(400).json({ success: false, error: `El producto en posición ${i + 1} no tiene nombre.` });
    }
    if (precio_unitario <= 0) {
      return res.status(400).json({ success: false, error: `El precio del producto "${nombre_producto}" debe ser mayor a 0.` });
    }
    if (cantidad <= 0) {
      return res.status(400).json({ success: false, error: `La cantidad del producto "${nombre_producto}" debe ser mayor a 0.` });
    }

    const subtotal = cantidad * precio_unitario;
    total += subtotal;

    detallesNorm.push({ nombre_producto, cantidad, precio_unitario, costo, subtotal });
  }

  if (montoAbonadoNum > total) {
    return res.status(400).json({ success: false, error: 'El monto abonado no puede superar el total.' });
  }

  const saldo = total - montoAbonadoNum;

  // 19 = Saldada, 26 = Pendiente de pago (reutilizamos tus estados existentes)
  const estado_id = saldo <= 0 ? 19 : 26;

  try {
    // 1. Insertar cabecera
    const { data: venta, error: ventaError } = await supabase
      .from('venta_esporadica')
      .insert([{
        cliente_id:    clienteIdNum,
        total,
        monto_abonado: montoAbonadoNum,
        saldo,
        estado_id,
        fecha:         new Date(),
      }])
      .select()
      .single();

    if (ventaError) throw ventaError;

    // 2. Insertar detalles
    const detallesInsert = detallesNorm.map(d => ({
      venta_esporadica_id: venta.id,
      ...d,
    }));

    const { data: detallesCreados, error: detalleError } = await supabase
      .from('detalle_venta_esporadica')
      .insert(detallesInsert)
      .select();

    if (detalleError) throw detalleError;

    return res.status(201).json({
      success: true,
      data: { venta, detalles: detallesCreados },
    });

  } catch (error) {
    console.error('Error en createVentaEsporadica:', error.message || error);
    return res.status(500).json({ success: false, error: 'Error al crear la venta esporádica.' });
  }
};

/**
 * GET /venta/esporadica
 * Obtiene todas las ventas esporádicas con cliente y detalles.
 */
export const getVentasEsporadicas = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('venta_esporadica')
      .select(`
        id,
        fecha,
        total,
        monto_abonado,
        saldo,
        estado_id,
        cliente:cliente_id (
          id,
          nombre,
          apellido
        ),
        detalle_venta_esporadica (
          id,
          nombre_producto,
          costo,
          precio_unitario,
          cantidad,
          subtotal
        )
      `)
      .in('estado_id', [19, 26])
      .order('fecha', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('Error en getVentasEsporadicas:', error.message || error);
    return res.status(500).json({ success: false, error: 'Error al obtener ventas esporádicas.' });
  }
};