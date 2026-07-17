// src/controllers/historial.controller.js
import { supabase } from '../config/supabase.js';

/**
 * GET /historial/equipo/:equipoId
 * Historial de todas las OTs de un equipo específico
 */
export const getHistorialCliente = async (req, res) => {
  const equipoId = parseInt(req.params.equipoId, 10);

  if (isNaN(equipoId)) {
    return res.status(400).json({ error: 'ID de equipo inválido' });
  }

  try {
    const { data, error } = await supabase
      .rpc('obtener_historial_por_equipo', { _equipo_id: equipoId });

    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (err) {
    console.error('Error en getHistorialCliente:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /historial/cliente/:clienteId
 * Historial de todos los equipos de un cliente
 */
export const getHistorialClienteByClienteId = async (req, res) => {
  const clienteId = parseInt(req.params.clienteId, 10);

  if (isNaN(clienteId)) {
    return res.status(400).json({ error: 'ID de cliente inválido' });
  }

  try {
    const { data, error } = await supabase
      .rpc('obtener_historial_por_cliente', { _cliente_id: clienteId });

    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (err) {
    console.error('Error en getHistorialClienteByClienteId:', err);
    return res.status(500).json({ error: err.message });
  }
};