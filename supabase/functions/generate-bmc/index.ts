import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BMC_SYSTEM_PROMPT = `Tu es un expert en analyse de business models pour les PME africaines. Tu produis des analyses BMC (Business Model Canvas) professionnelles et détaillées.

IMPORTANT: Tu dois TOUJOURS répondre avec un JSON valide, sans texte avant ou après. Pas de markdown, pas de commentaires.`;

const BMC_USER_PROMPT = (enterpriseName: string, sector: string, country: string, city: string, documentContent: string) => `
Analyse l'entreprise "${enterpriseName}" (Secteur: ${sector || "non spécifié"}, Pays: ${country || "non spécifié"}, Ville: ${city || "non spécifié"}) et génère un Business Model Canvas complet.

${documentContent ? `DOCUMENTS FOURNIS:\n${documentContent}` : "Aucun document fourni, génère une analyse basée sur les informations disponibles."}

Génère un JSON avec EXACTEMENT cette structure:

{
  "score_global": <number 0-100>,
  "maturite": "<Émergent|En développement|Structuré|Mature>",
  "resume": "<phrase d'accroche résumant le business model en 1-2 lignes>",
  "tags": ["<tag positif avec ✓>", "<tag warning avec ⚠>", "<tag action avec →>"],
  "canvas": {
    "partenaires_cles": {
      "items": ["<partenaire 1>", "<partenaire 2>"],
      "detail": "<description détaillée des partenaires et de leur rôle>",
      "element_critique": "<élément critique si applicable ou null>"
    },
    "activites_cles": {
      "items": ["<activité 1>", "<activité 2>"],
      "detail": "<description détaillée>",
      "element_critique": "<élément critique ou null>"
    },
    "ressources_cles": {
      "items": ["<ressource 1>", "<ressource 2>"],
      "categories": {
        "humaines": "<description>",
        "materielles": "<description>",
        "immaterielles": "<description>",
        "financieres": "<description>"
      },
      "element_critique": "<élément critique ou null>"
    },
    "proposition_valeur": {
      "enonce": "<la proposition de valeur en une phrase>",
      "avantages": ["<avantage 1>", "<avantage 2>"],
      "detail": "<description détaillée>"
    },
    "relations_clients": {
      "type": "<type de relation: Personnalisée, Automatisée, Self-service, etc.>",
      "detail": "<description>",
      "items": ["<élément 1>", "<élément 2>"]
    },
    "canaux": {
      "items": ["<canal 1>", "<canal 2>"],
      "detail": "<description>"
    },
    "segments_clients": {
      "principal": "<segment principal>",
      "zone": "<zone géographique>",
      "type_marche": "<B2B|B2C|B2B2C>",
      "probleme_resolu": "<problème résolu>",
      "taille_marche": "<estimation taille du marché>",
      "intensite_besoin": "<score /10 avec description>"
    },
    "structure_couts": {
      "postes": [
        {"libelle": "<poste>", "montant": "<montant>", "type": "Fixe|Variable|Mixte", "pourcentage": <number>}
      ],
      "total_mensuel": "<total estimé>",
      "cout_critique": "<le poste de coût le plus critique>"
    },
    "flux_revenus": {
      "produit_principal": "<produit/service principal>",
      "prix_moyen": "<prix moyen>",
      "frequence_achat": "<fréquence>",
      "volume_estime": "<volume mensuel>",
      "ca_mensuel": "<CA mensuel estimé>",
      "marge_brute": "<marge brute estimée>",
      "mode_paiement": "<modes de paiement>"
    }
  },
  "diagnostic": {
    "scores_par_bloc": {
      "proposition_valeur": {"score": <0-100>, "commentaire": "<commentaire court>"},
      "activites_cles": {"score": <0-100>, "commentaire": "<commentaire>"},
      "ressources_cles": {"score": <0-100>, "commentaire": "<commentaire>"},
      "segments_clients": {"score": <0-100>, "commentaire": "<commentaire>"},
      "relations_clients": {"score": <0-100>, "commentaire": "<commentaire>"},
      "flux_revenus": {"score": <0-100>, "commentaire": "<commentaire>"},
      "partenaires_cles": {"score": <0-100>, "commentaire": "<commentaire>"},
      "canaux": {"score": <0-100>, "commentaire": "<commentaire>"},
      "structure_couts": {"score": <0-100>, "commentaire": "<commentaire>"}
    },
    "forces": ["<force 1>", "<force 2>", "<force 3>", "<force 4>"],
    "points_vigilance": ["<point 1>", "<point 2>", "<point 3>", "<point 4>"]
  },
  "swot": {
    "forces": ["<force 1>", "<force 2>", "<force 3>"],
    "faiblesses": ["<faiblesse 1>", "<faiblesse 2>", "<faiblesse 3>"],
    "opportunites": ["<opportunité 1>", "<opportunité 2>", "<opportunité 3>"],
    "menaces": ["<menace 1>", "<menace 2>", "<menace 3>"]
  },
  "recommandations": {
    "court_terme": "<description des actions à mener à court terme>",
    "moyen_terme": "<description des actions à mener à moyen terme>",
    "long_terme": "<description des actions à mener à long terme>"
  }
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || serviceKey;

    // Verify user
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = user.id;

    const { enterprise_id } = await req.json();
    if (!enterprise_id) {
      return new Response(JSON.stringify({ error: "enterprise_id requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get enterprise
    const { data: ent } = await supabase.from("enterprises").select("*").eq("id", enterprise_id).single();
    if (!ent || (ent.user_id !== userId && ent.coach_id !== userId)) {
      return new Response(JSON.stringify({ error: "Entreprise non trouvée" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get uploaded documents content
    const { data: files } = await supabase.storage.from("documents").list(enterprise_id);
    let documentContent = "";
    if (files && files.length > 0) {
      for (const file of files.slice(0, 5)) {
        const { data: fileData } = await supabase.storage.from("documents").download(`${enterprise_id}/${file.name}`);
        if (fileData) {
          const text = await fileData.text();
          documentContent += `\n\n--- Document: ${file.name} ---\n${text.substring(0, 15000)}`;
        }
      }
    }

    // Call AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: BMC_SYSTEM_PROMPT },
          { role: "user", content: BMC_USER_PROMPT(ent.name, ent.sector || "", ent.country || "", ent.city || "", documentContent) },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      return new Response(JSON.stringify({ error: "Erreur IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    let bmcData: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      bmcData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error("Failed to parse BMC response:", content.substring(0, 500));
      return new Response(JSON.stringify({ error: "Erreur de parsing de l'analyse BMC" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate HTML deliverable
    const htmlContent = generateBmcHtml(ent.name, ent.sector || "", ent.city || "", ent.country || "", bmcData);

    // Save BMC analysis (JSON data)
    await supabase.from("deliverables").upsert({
      enterprise_id,
      type: "bmc_analysis",
      data: bmcData,
      score: bmcData.score_global || null,
      html_content: htmlContent,
      ai_generated: true,
      version: 1,
    }, { onConflict: "enterprise_id,type" });

    // Save BMC HTML deliverable
    await supabase.from("deliverables").upsert({
      enterprise_id,
      type: "bmc_html",
      data: bmcData,
      score: bmcData.score_global || null,
      html_content: htmlContent,
      ai_generated: true,
      version: 1,
    }, { onConflict: "enterprise_id,type" });

    // Update module status
    await supabase.from("enterprise_modules")
      .update({ status: "completed", progress: 100, data: bmcData })
      .eq("enterprise_id", enterprise_id)
      .eq("module", "bmc");

    return new Response(JSON.stringify({
      success: true,
      data: bmcData,
      score: bmcData.score_global,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("generate-bmc error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateBmcHtml(name: string, sector: string, city: string, country: string, data: any): string {
  const d = data;
  const canvas = d.canvas || {};
  const diag = d.diagnostic || {};
  const swot = d.swot || {};
  const reco = d.recommandations || {};
  const scores = diag.scores_par_bloc || {};

  const scoreBar = (score: number) => {
    const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
    return `<div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;height:6px;background:#e2e8f0;border-radius:3px;"><div style="width:${score}%;height:100%;background:${color};border-radius:3px;"></div></div><span style="font-size:12px;font-weight:600;color:${color}">${score}%</span></div>`;
  };

  const listItems = (arr: string[]) => arr?.map(i => `<li>${i}</li>`).join("") || "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BMC - ${name} - ESONO</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#f8f9fb;color:#1e293b;line-height:1.6}
.container{max-width:1100px;margin:0 auto;padding:32px 24px}
.header{background:linear-gradient(135deg,#1e2a4a,#2d3a5c);color:white;padding:32px;border-radius:16px;margin-bottom:32px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:28px;font-weight:800}
.header .meta{font-size:13px;opacity:.7}
.header .score-box{text-align:center}
.header .score-box .score{font-size:56px;font-weight:900}
.header .score-box .label{font-size:12px;opacity:.6}
.tags{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.tag{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500;background:rgba(255,255,255,.15)}
.canvas-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;grid-template-rows:auto auto auto;gap:12px;margin-bottom:32px}
.canvas-cell{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px}
.canvas-cell h3{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#1e2a4a;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}
.canvas-cell p,.canvas-cell li{font-size:12px;color:#475569}
.canvas-cell ul{padding-left:16px;margin:0}
.canvas-cell li{margin-bottom:3px}
.critical{color:#ef4444;font-weight:600;font-size:11px;margin-top:6px}
.span-partenaires{grid-column:1;grid-row:1/3}
.span-activites{grid-column:2;grid-row:1}
.span-proposition{grid-column:3;grid-row:1/3}
.span-relations{grid-column:4;grid-row:1}
.span-segments{grid-column:5;grid-row:1/3}
.span-ressources{grid-column:2;grid-row:2}
.span-canaux{grid-column:4;grid-row:2}
.span-couts{grid-column:1/4;grid-row:3}
.span-revenus{grid-column:4/6;grid-row:3}
.card{background:white;border-radius:12px;padding:24px;margin-bottom:16px;border:1px solid #e2e8f0}
.card h2{font-size:18px;font-weight:700;margin-bottom:16px;color:#1e2a4a}
.scores-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.score-item{padding:12px;border-radius:8px;background:#f8fafc}
.score-item .label{font-size:12px;font-weight:600;color:#334155;margin-bottom:4px}
.score-item .comment{font-size:11px;color:#64748b;margin-top:4px}
.swot-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.swot-box{padding:16px;border-radius:8px}
.swot-box.forces{background:#f0fdf4;border:1px solid #bbf7d0}
.swot-box.faiblesses{background:#fef2f2;border:1px solid #fecaca}
.swot-box.opportunites{background:#eff6ff;border:1px solid #bfdbfe}
.swot-box.menaces{background:#fefce8;border:1px solid #fef08a}
.swot-box h3{font-size:14px;font-weight:700;margin-bottom:8px}
.swot-box li{font-size:12px;margin-bottom:4px}
.reco-section{margin-bottom:16px}
.reco-section h3{font-size:14px;font-weight:600;color:#1e2a4a;margin-bottom:6px}
.reco-section p{font-size:13px;color:#475569}
.footer{text-align:center;margin-top:40px;font-size:11px;color:#94a3b8;font-style:italic}
@media print{body{background:white}.container{padding:16px}}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div>
      <h1>BUSINESS MODEL CANVAS</h1>
      <p style="font-size:20px;font-weight:600;margin-top:4px">${name}</p>
      <p class="meta">${sector ? sector + " — " : ""}${city ? city + ", " : ""}${country || ""}</p>
      <p class="meta">Analyse ESONO — ${new Date().toLocaleDateString("fr-FR")}</p>
      ${d.resume ? `<p style="margin-top:12px;font-size:14px;opacity:.9;font-style:italic">"${d.resume}"</p>` : ""}
      <div class="tags">${(d.tags || []).map((t: string) => `<span class="tag">${t}</span>`).join("")}</div>
    </div>
    <div class="score-box">
      <div class="score">${d.score_global || "—"}%</div>
      <div class="label">Score BMC Global</div>
      <div class="label">${d.maturite || ""}</div>
    </div>
  </div>

  <div class="canvas-grid">
    <div class="canvas-cell span-partenaires">
      <h3>🤝 Partenaires Clés</h3>
      <ul>${listItems(canvas.partenaires_cles?.items)}</ul>
      <p>${canvas.partenaires_cles?.detail || ""}</p>
      ${canvas.partenaires_cles?.element_critique ? `<p class="critical">⚠ ${canvas.partenaires_cles.element_critique}</p>` : ""}
    </div>
    <div class="canvas-cell span-activites">
      <h3>⚙️ Activités Clés</h3>
      <ul>${listItems(canvas.activites_cles?.items)}</ul>
      ${canvas.activites_cles?.element_critique ? `<p class="critical">⚠ ${canvas.activites_cles.element_critique}</p>` : ""}
    </div>
    <div class="canvas-cell span-proposition">
      <h3>💎 Proposition de Valeur</h3>
      <p style="font-weight:600;font-size:13px;margin-bottom:8px">${canvas.proposition_valeur?.enonce || ""}</p>
      <ul>${listItems(canvas.proposition_valeur?.avantages)}</ul>
      <p>${canvas.proposition_valeur?.detail || ""}</p>
    </div>
    <div class="canvas-cell span-relations">
      <h3>❤️ Relations Clients</h3>
      <p style="font-weight:600;font-size:12px">${canvas.relations_clients?.type || ""}</p>
      <ul>${listItems(canvas.relations_clients?.items)}</ul>
    </div>
    <div class="canvas-cell span-segments">
      <h3>👥 Segments Clients</h3>
      <p style="font-weight:600;font-size:12px">${canvas.segments_clients?.principal || ""}</p>
      <p>Zone: ${canvas.segments_clients?.zone || ""}</p>
      <p>Marché: ${canvas.segments_clients?.type_marche || ""}</p>
      <p>Problème: ${canvas.segments_clients?.probleme_resolu || ""}</p>
      <p>Taille: ${canvas.segments_clients?.taille_marche || ""}</p>
      <p>Intensité: ${canvas.segments_clients?.intensite_besoin || ""}</p>
    </div>
    <div class="canvas-cell span-ressources">
      <h3>🏗️ Ressources Clés</h3>
      <ul>${listItems(canvas.ressources_cles?.items)}</ul>
      ${canvas.ressources_cles?.element_critique ? `<p class="critical">⚠ ${canvas.ressources_cles.element_critique}</p>` : ""}
    </div>
    <div class="canvas-cell span-canaux">
      <h3>📦 Canaux</h3>
      <ul>${listItems(canvas.canaux?.items)}</ul>
    </div>
    <div class="canvas-cell span-couts">
      <h3>💰 Structure de Coûts</h3>
      ${(canvas.structure_couts?.postes || []).map((p: any) => `<p style="font-size:12px">${p.libelle} — ${p.montant} (${p.type} · ${p.pourcentage}%)</p>`).join("")}
      <p style="font-weight:700;margin-top:8px;font-size:13px">Total ≈ ${canvas.structure_couts?.total_mensuel || "N/A"}</p>
      ${canvas.structure_couts?.cout_critique ? `<p class="critical">Coût critique: ${canvas.structure_couts.cout_critique}</p>` : ""}
    </div>
    <div class="canvas-cell span-revenus">
      <h3>💵 Flux de Revenus</h3>
      <p>Produit: ${canvas.flux_revenus?.produit_principal || ""}</p>
      <p>Prix: ${canvas.flux_revenus?.prix_moyen || ""}</p>
      <p>Fréquence: ${canvas.flux_revenus?.frequence_achat || ""}</p>
      <p>Volume: ${canvas.flux_revenus?.volume_estime || ""}</p>
      <p style="font-weight:700;margin-top:8px">CA ≈ ${canvas.flux_revenus?.ca_mensuel || "N/A"}</p>
      <p style="font-weight:700">Marge ≈ ${canvas.flux_revenus?.marge_brute || "N/A"}</p>
    </div>
  </div>

  <div class="card">
    <h2>📊 Diagnostic Expert — Scores par bloc</h2>
    <div class="scores-grid">
      ${Object.entries(scores).map(([key, val]: [string, any]) => `
        <div class="score-item">
          <div class="label">${key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</div>
          ${scoreBar(val?.score || 0)}
          <div class="comment">${val?.commentaire || ""}</div>
        </div>
      `).join("")}
    </div>
  </div>

  <div class="card">
    <h2>💪 Forces & Points de vigilance</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <h3 style="font-size:14px;font-weight:600;color:#16a34a;margin-bottom:8px">✅ Forces</h3>
        <ul style="padding-left:16px">${listItems(diag.forces)}</ul>
      </div>
      <div>
        <h3 style="font-size:14px;font-weight:600;color:#f59e0b;margin-bottom:8px">⚠️ Points de vigilance</h3>
        <ul style="padding-left:16px">${listItems(diag.points_vigilance)}</ul>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>🧭 Matrice SWOT</h2>
    <div class="swot-grid">
      <div class="swot-box forces"><h3>Forces</h3><ul style="padding-left:16px">${listItems(swot.forces)}</ul></div>
      <div class="swot-box faiblesses"><h3>Faiblesses</h3><ul style="padding-left:16px">${listItems(swot.faiblesses)}</ul></div>
      <div class="swot-box opportunites"><h3>Opportunités</h3><ul style="padding-left:16px">${listItems(swot.opportunites)}</ul></div>
      <div class="swot-box menaces"><h3>Menaces</h3><ul style="padding-left:16px">${listItems(swot.menaces)}</ul></div>
    </div>
  </div>

  <div class="card">
    <h2>🎯 Recommandations Stratégiques</h2>
    <div class="reco-section"><h3>📌 Court terme — Consolider</h3><p>${reco.court_terme || ""}</p></div>
    <div class="reco-section"><h3>📈 Moyen terme — Croissance</h3><p>${reco.moyen_terme || ""}</p></div>
    <div class="reco-section"><h3>🚀 Long terme — Industrialisation</h3><p>${reco.long_terme || ""}</p></div>
  </div>

  <div class="footer">
    ${name} — Business Model Canvas & Diagnostic Expert<br>
    Document généré le ${new Date().toLocaleDateString("fr-FR")} • ESONO Investment Readiness Platform<br>
    "Les chiffres ne servent pas à juger le passé, mais à décider le futur."
  </div>
</div>
</body>
</html>`;
}
