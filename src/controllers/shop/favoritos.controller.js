import { supabase } from "../../config/supabase.js";

export const getFavoritosByClienteId = async (req, res) => {
  try {
    const clienteId = Number(req.params.clienteId);
    if (!Number.isFinite(clienteId)) {
      return res.status(400).json({ error: "clienteId inválido" });
    }

    const { data, error } = await supabase
      .from("cliente_favorito")
      .select(`
        id,
        creado_en,
        producto:producto_id (
          id,
          nombre,
          precio,
          oferta,
          stock,
          descripcion_web,
          categoria_id,
          categoria,
          subir_web
        )
      `)
      .eq("cliente_id", clienteId)
      .order("creado_en", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // precio_final calculado para el front
    const items = (data || []).map((row) => {
      const p = row.producto || null;
      if (!p) return row;

      const precio = p.precio != null ? Number(p.precio) : null;
      const oferta = p.oferta != null ? Number(p.oferta) : null;
      const precio_final = oferta && oferta > 0 ? oferta : precio;

      return {
        ...row,
        producto: { ...p, precio, oferta, precio_final },
      };
    });

    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: "Error inesperado", details: e?.message });
  }
};

export const addFavorito = async (req, res) => {
  try {
    const clienteId = Number(req.params.clienteId);
    const productoId = Number(req.body?.producto_id);

    if (!Number.isFinite(clienteId)) {
      return res.status(400).json({ error: "clienteId inválido" });
    }
    if (!Number.isFinite(productoId)) {
      return res.status(400).json({ error: "producto_id inválido" });
    }

    // Insert idempotente usando upsert por unique(cliente_id, producto_id)
    const { data, error } = await supabase
      .from("cliente_favorito")
      .upsert(
        { cliente_id: clienteId, producto_id: productoId },
        { onConflict: "cliente_id,producto_id" }
      )
      .select("id, cliente_id, producto_id, creado_en")
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true, favorito: data });
  } catch (e) {
    res.status(500).json({ error: "Error inesperado", details: e?.message });
  }
};

export const removeFavorito = async (req, res) => {
  try {
    const clienteId = Number(req.params.clienteId);
    const productoId = Number(req.params.productoId);

    if (!Number.isFinite(clienteId)) {
      return res.status(400).json({ error: "clienteId inválido" });
    }
    if (!Number.isFinite(productoId)) {
      return res.status(400).json({ error: "productoId inválido" });
    }

    const { error } = await supabase
      .from("cliente_favorito")
      .delete()
      .eq("cliente_id", clienteId)
      .eq("producto_id", productoId);

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error inesperado", details: e?.message });
  }
};


export const toggleFavorito = async (req, res) => {
  try {
    const clienteId = Number(req.params.clienteId);
    const productoId = Number(req.body?.producto_id);

    if (!Number.isFinite(clienteId)) {
      return res.status(400).json({ error: "clienteId inválido" });
    }
    if (!Number.isFinite(productoId)) {
      return res.status(400).json({ error: "producto_id inválido" });
    }

    // 1) verificar si existe
    const { data: existing, error: findErr } = await supabase
      .from("cliente_favorito")
      .select("id")
      .eq("cliente_id", clienteId)
      .eq("producto_id", productoId)
      .maybeSingle();

    if (findErr) return res.status(500).json({ error: findErr.message });

    if (existing?.id) {
      // borrar
      const { error: delErr } = await supabase
        .from("cliente_favorito")
        .delete()
        .eq("id", existing.id);

      if (delErr) return res.status(500).json({ error: delErr.message });

      return res.json({ ok: true, favorited: false });
    }

    // crear
    const { data: created, error: insErr } = await supabase
      .from("cliente_favorito")
      .insert({ cliente_id: clienteId, producto_id: productoId })
      .select("id, creado_en")
      .single();

    if (insErr) return res.status(500).json({ error: insErr.message });

    return res.json({ ok: true, favorited: true, favorito: created });
  } catch (e) {
    res.status(500).json({ error: "Error inesperado", details: e?.message });
  }
};

