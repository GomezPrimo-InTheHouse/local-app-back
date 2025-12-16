// controllers/PagoController.js

import { supabase } from '../../config/supabase.js';

// POST: /api/pagos/abono

/**
 * Registra un abono/pago vinculado directamente a un Ingreso (Orden de Servicio).
 * Anteriormente vinculado a presupuesto_id.
 */
export const registrarAbono = async (req, res) => {
    // 1. CAMBIO: Esperamos ingreso_id en lugar de presupuesto_id
    const { ingreso_id, monto, metodo_pago, observaciones } = req.body;

    // 2. VALIDACIÓN: Revisar el nuevo campo
    if (!ingreso_id || !monto || !metodo_pago) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: ingreso_id, monto, metodo_pago.' });
    }

    try {
        const { data, error } = await supabase
            .from('pago_abono')
            .insert({
                // 3. INSERCIÓN: Usamos ingreso_id
                ingreso_id: ingreso_id, 
                monto: monto,
                metodo_pago: metodo_pago,
                observaciones: observaciones
            })
            // 4. SELECCIÓN: Devolver el nuevo ID de vinculación
            .select('id, ingreso_id, monto, fecha_pago, metodo_pago') 
            .single();

        if (error) {
            console.error('Error de Supabase al registrar abono:', error);
            return res.status(500).json({ error: 'Error del servidor: No se pudo registrar el abono.', details: error.message });
        }

        res.status(201).json({ 
            message: 'Abono registrado exitosamente.', 
            pago: data 
        });
    } catch (error) {
        console.error('Error al registrar abono (Catch):', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ... (El endpoint GET se moverá a una RPC)
// controllers/PagoController.js (Continuación)
// ...

// GET: /api/pagos/cliente/:clienteId
export const obtenerHistorialCliente = async (req, res) => {
    const { clienteId } = req.params;
    
    // Aseguramos que el parámetro es un número entero para la función RPC
    const clienteIdInt = parseInt(clienteId, 10); 

    if (isNaN(clienteIdInt)) {
        return res.status(400).json({ error: 'ID de cliente inválido.' });
    }

    try {
        // 1. Llamada a la Remote Procedure Call (RPC) de Supabase
        const { data, error } = await supabase.rpc('get_historial_pagos_cliente', {
            cliente_id_param: clienteIdInt 
        });

        // 2. Manejo de errores de Supabase
        if (error) {
            console.error('Error de Supabase al llamar a RPC:', error);
            // Error 404 si la función no existe o no hay datos relevantes
            if (error.code === '42883') {
                 return res.status(500).json({ 
                    error: 'Error de configuración en BD', 
                    details: 'La función get_historial_pagos_cliente no existe o no tiene permisos de ejecución.' 
                });
            }
            return res.status(500).json({ 
                error: 'Error al obtener historial del cliente.', 
                details: error.message 
            });
        }
        
        // 3. Respuesta exitosa (la data ya viene estructurada del RPC)
        res.status(200).json(data);

    } catch (error) {
        console.error('Error interno del servidor:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

export const actualizarAbono = async (req, res) => {
    const { id } = req.params;
    const { monto, fecha_pago, metodo_pago, observaciones } = req.body;
    
    const pagoId = parseInt(id, 10);

    if (isNaN(pagoId)) {
        return res.status(400).json({ error: 'ID de abono inválido.' });
    }

    // Construir el objeto de actualización solo con los campos presentes
    const updatePayload = {};
    if (monto !== undefined) updatePayload.monto = monto;
    if (fecha_pago !== undefined) updatePayload.fecha_pago = fecha_pago;
    if (metodo_pago !== undefined) updatePayload.metodo_pago = metodo_pago;
    if (observaciones !== undefined) updatePayload.observaciones = observaciones;

    // Si no se proporcionó nada para actualizar
    if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron campos para actualizar.' });
    }

    try {
        const { data, error } = await supabase
            .from('pago_abono')
            .update(updatePayload)
            .eq('id', pagoId) // Condición WHERE: actualizar solo el pago con este ID
            .select('*') // Devolver el registro actualizado
            .single();

        if (error) {
            console.error('Error de Supabase al actualizar abono:', error);
            return res.status(500).json({ error: 'Error del servidor: No se pudo actualizar el abono.', details: error.message });
        }

        // Si no se encontró el registro para actualizar
        if (!data) {
            return res.status(404).json({ error: `Abono con ID ${pagoId} no encontrado.` });
        }

        res.status(200).json({ 
            message: 'Abono actualizado exitosamente.', 
            pago: data 
        });
    } catch (error) {
        console.error('Error al actualizar abono (Catch):', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

