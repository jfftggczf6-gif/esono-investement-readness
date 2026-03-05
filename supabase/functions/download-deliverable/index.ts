import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateHTML(title: string, data: any): string {
  const renderObj = (obj: any, depth = 0): string => {
    if (!obj || typeof obj !== "object") return `<p>${obj}</p>`;
    if (Array.isArray(obj)) {
      return `<ul>${obj.map(item => {
        if (typeof item === "object") return `<li>${renderObj(item, depth + 1)}</li>`;
        return `<li>${item}</li>`;
      }).join("")}</ul>`;
    }
    return Object.entries(obj).map(([key, val]) => {
      if (key === "score") return "";
      const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      if (typeof val === "object") {
        return `<h${Math.min(depth + 3, 6)}>${label}</h${Math.min(depth + 3, 6)}>${renderObj(val, depth + 1)}`;
      }
      return `<div class="field"><strong>${label}:</strong> <span>${val}</span></div>`;
    }).join("");
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ESONO</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8f9fb; color: #1e293b; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 24px; }
    .header { background: linear-gradient(135deg, #1e2a4a, #2d3a5c); color: white; padding: 32px; border-radius: 12px; margin-bottom: 32px; }
    .header h1 { font-size: 24px; font-weight: 700; }
    .header .score { font-size: 48px; font-weight: 800; margin-top: 8px; }
    .header .subtitle { opacity: 0.7; font-size: 14px; margin-top: 4px; }
    .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px; border: 1px solid #e2e8f0; }
    h2 { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #1e2a4a; }
    h3 { font-size: 16px; font-weight: 600; margin: 16px 0 8px; color: #334155; }
    h4 { font-size: 14px; font-weight: 600; margin: 12px 0 6px; color: #475569; }
    p, span { font-size: 14px; color: #475569; }
    ul { padding-left: 20px; margin: 8px 0; }
    li { font-size: 14px; color: #475569; margin-bottom: 4px; }
    .field { margin-bottom: 8px; }
    .field strong { color: #334155; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      ${data.score ? `<div class="score">${data.score}/100</div>` : ""}
      <div class="subtitle">Généré par ESONO - Investment Readiness Platform</div>
    </div>
    <div class="card">
      ${renderObj(data)}
    </div>
    <div class="footer">
      ESONO Investment Readiness Platform &copy; ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>`;
}

function generateCSV(data: any): string {
  const rows: string[][] = [];
  
  const flatten = (obj: any, prefix = "") => {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => {
        if (typeof item === "object") {
          flatten(item, `${prefix}[${i}]`);
        } else {
          rows.push([`${prefix}[${i}]`, String(item)]);
        }
      });
    } else {
      Object.entries(obj).forEach(([key, val]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof val === "object" && val !== null) {
          flatten(val, fullKey);
        } else {
          rows.push([fullKey, String(val)]);
        }
      });
    }
  };

  flatten(data);
  const header = "Champ,Valeur\n";
  return header + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || serviceKey;

    // Verify user
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const url = new URL(req.url);
    const deliverableType = url.searchParams.get("type");
    const enterpriseId = url.searchParams.get("enterprise_id");
    const format = url.searchParams.get("format") || "html"; // html, csv, json

    if (!deliverableType || !enterpriseId) {
      return new Response(JSON.stringify({ error: "type and enterprise_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify ownership
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: ent } = await supabase.from("enterprises").select("name, user_id, coach_id").eq("id", enterpriseId).single();
    if (!ent || (ent.user_id !== userId && ent.coach_id !== userId)) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get deliverable
    const { data: deliv } = await supabase.from("deliverables").select("*").eq("enterprise_id", enterpriseId).eq("type", deliverableType).single();
    if (!deliv || !deliv.data) {
      return new Response(JSON.stringify({ error: "Deliverable not ready" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const titleMap: Record<string, string> = {
      bmc_analysis: "Business Model Canvas",
      sic_analysis: "Social Impact Canvas",
      inputs_data: "Données Financières",
      inputs_html: "Données Financières",
      framework_data: "Framework Analyse Financière",
      framework_html: "Framework Analyse",
      diagnostic_data: "Diagnostic Expert",
      diagnostic_html: "Diagnostic Expert",
      plan_ovo: "Plan Financier OVO",
      business_plan: "Business Plan",
      odd_analysis: "Due Diligence ODD",
    };

    const title = `${titleMap[deliverableType] || deliverableType} - ${ent.name}`;
    const safeName = ent.name.replace(/[^a-zA-Z0-9]/g, "_");

    if (format === "csv") {
      const csv = generateCSV(deliv.data);
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeName}_${deliverableType}.csv"`,
        },
      });
    }

    if (format === "json") {
      return new Response(JSON.stringify(deliv.data, null, 2), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeName}_${deliverableType}.json"`,
        },
      });
    }

    // Default: HTML
    const html = generateHTML(title, deliv.data);
    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}_${deliverableType}.html"`,
      },
    });

  } catch (e) {
    console.error("download-deliverable error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
