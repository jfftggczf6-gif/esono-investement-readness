import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

// ─────────────────────────────────────────────────────────────────────────────
// access-data-room
// Public endpoint — no auth header required.
// Called by DataRoomPublic.tsx to:
//   1. Validate access token (POST /validate)
//   2. List documents (POST /documents)
//   3. Get download signed URL for a specific file (POST /download)
// Token is submitted in request body — never in URL.
// ─────────────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { action, token, slug, document_id } = body;

    if (!token) return err("Token requis", 401);

    // 1. Validate token and get share record
    const { data: share, error: shareErr } = await supabaseAdmin
      .from("data_room_shares")
      .select("*, enterprises(id, name, sector, country, logo_url)")
      .eq("access_token", token)
      .single();

    if (shareErr || !share) return err("Token invalide ou introuvable", 403);

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return err("Ce lien d'accès a expiré", 403);
    }

    // Check slug matches (extra validation)
    if (slug) {
      const { data: ent } = await supabaseAdmin
        .from("enterprises")
        .select("data_room_slug")
        .eq("id", share.enterprise_id)
        .single();
      if (ent?.data_room_slug && ent.data_room_slug !== slug) {
        return err("Token invalide pour cette Data Room", 403);
      }
    }

    const enterpriseId = share.enterprise_id;
    const enterprise = (share as any).enterprises;

    // ── Action: validate ───────────────────────────────────────────────────
    if (action === "validate") {
      // Mark as viewed (first time only)
      if (!share.viewed_at) {
        await supabaseAdmin
          .from("data_room_shares")
          .update({ viewed_at: new Date().toISOString() })
          .eq("id", share.id);
      }
      return json({
        valid: true,
        enterprise: {
          name: enterprise?.name,
          sector: enterprise?.sector,
          country: enterprise?.country,
          logo_url: enterprise?.logo_url,
        },
        can_download: share.can_download,
        expires_at: share.expires_at,
        investor_name: share.investor_name,
      });
    }

    // ── Action: documents ──────────────────────────────────────────────────
    if (action === "documents") {
      const { data: docs, error: docsErr } = await supabaseAdmin
        .from("data_room_documents")
        .select("id, category, label, filename, file_size, evidence_level, is_generated, deliverable_type, created_at")
        .eq("enterprise_id", enterpriseId)
        .order("category")
        .order("created_at", { ascending: false });

      if (docsErr) return err("Erreur chargement documents", 500);
      return json({ documents: docs || [] });
    }

    // ── Action: download ───────────────────────────────────────────────────
    if (action === "download") {
      if (!share.can_download) return err("Téléchargement non autorisé pour ce partage", 403);
      if (!document_id) return err("document_id requis", 400);

      const { data: doc } = await supabaseAdmin
        .from("data_room_documents")
        .select("storage_path, filename")
        .eq("id", document_id)
        .eq("enterprise_id", enterpriseId)
        .single();

      if (!doc) return err("Document introuvable", 404);

      const { data: signedUrl, error: urlErr } = await supabaseAdmin
        .storage
        .from("documents")
        .createSignedUrl(doc.storage_path, 3600); // 1 hour

      if (urlErr || !signedUrl) return err("Erreur génération URL", 500);

      return json({ download_url: signedUrl.signedUrl, filename: doc.filename });
    }

    return err("Action non reconnue", 400);
  } catch (e: any) {
    console.error("access-data-room error:", e);
    return err(e.message || "Erreur interne", 500);
  }
});
