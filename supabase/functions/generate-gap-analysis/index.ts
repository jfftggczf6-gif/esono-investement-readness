/**
 * generate-gap-analysis
 *
 * Analyzes all existing deliverables and uploaded documents to compute:
 * - Documentation completeness per category (corporate, finance, commercial, legal, ESG)
 * - Evidence level for each data point (Niveau 0-3)
 * - Readiness pathway (which type of investor/funder the company is ready for)
 * - List of missing or reconstructible items
 *
 * This function is designed to work even with ZERO existing deliverables.
 * It measures absence, not just presence.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, errorResponse, jsonResponse,
  verifyAndGetContext, callAI, buildRAGContext
} from "../_shared/helpers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ══════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ══════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Tu es un analyste spécialisé en due diligence documentaire pour PME africaines.
Tu évalues la maturité documentaire d'une entreprise à travers le prisme des investisseurs DFI (BAD, IFC, Proparco, Enabel).

TON RÔLE :
- Analyser la complétude documentaire par catégorie
- Attribuer un niveau de preuve à chaque élément de données
- Identifier le chemin de financement réaliste en fonction du dossier actuel
- Guider vers les étapes concrètes d'amélioration

NIVEAUX DE PREUVE :
- Niveau 0 — Déclaratif : information affirmée par l'entrepreneur sans aucun support documentaire
- Niveau 1 — Preuve faible : photos, messages, documents incomplets, notes manuscrites
- Niveau 2 — Preuve intermédiaire : factures, relevés, contrats simples, rapports partiels
- Niveau 3 — Preuve solide : états financiers certifiés, contrats signés, documents officiels, audit externe

CATÉGORIES DOCUMENTAIRES À ÉVALUER :
1. Corporate : RCCM, NIF, statuts constitutifs, PV d'AG, organigramme, liste associés
2. Finance : relevés bancaires, bilan, compte de résultat, budget, plan de trésorerie, KPIs
3. Commercial : liste clients, contrats, factures, devis signés, pipeline, preuves de ventes
4. Legal : contrats signés, baux, propriété intellectuelle, licences, conformité réglementaire
5. ESG : politique RSE, indicateurs emploi/impact, ODD alignment, rapport environnemental

TYPES DE FINANCEMENT PAR NIVEAU :
- Score < 30 : Programmes d'incubation / Subventions techniques
- Score 30-50 : Microfinance / Prêts bancaires simplifiés
- Score 50-65 : Fonds d'impact / Prêts DFI avec garantie
- Score 65-80 : Fonds de private equity impact / Mezzanine
- Score > 80 : Due diligence investisseur classique

IMPORTANT: Réponds UNIQUEMENT en JSON valide. Pas de markdown, pas de texte autour.`;

// ══════════════════════════════════════════════════════════════════════
// SCHEMA
// ══════════════════════════════════════════════════════════════════════

const GAP_SCHEMA = `{
  "score_global": "<nombre 0-100>",
  "categories": {
    "corporate": {
      "score": "<nombre 0-100>",
      "items": [
        {
          "label": "string — nom du document/élément",
          "present": true|false,
          "level": 0|1|2|3,
          "comment": "string — observation courte (max 1 phrase)"
        }
      ]
    },
    "finance": {
      "score": "<nombre 0-100>",
      "items": [...]
    },
    "commercial": {
      "score": "<nombre 0-100>",
      "items": [...]
    },
    "legal": {
      "score": "<nombre 0-100>",
      "items": [...]
    },
    "esg": {
      "score": "<nombre 0-100>",
      "items": [...]
    }
  },
  "readiness_pathway": {
    "investor_type": "string — type de financement recommandé",
    "rationale": "string — 2-3 phrases justifiant la recommandation",
    "next_steps": [
      "string — action concrète #1",
      "string — action concrète #2",
      "string — action concrète #3"
    ]
  },
  "reconstruction_needed": [
    "string — élément critique manquant #1",
    "string — élément critique manquant #2"
  ],
  "completeness_summary": {
    "total_items_checked": "<nombre>",
    "items_present": "<nombre>",
    "items_with_strong_proof": "<nombre (level >= 2)>"
  },
  "score": "<nombre 0-100 — identique à score_global>"
}`;

// ══════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ══════════════════════════════════════════════════════════════════════

function buildGapContext(ctx: any): string {
  const ent = ctx.enterprise;
  const dm = ctx.deliverableMap;

  // List which deliverables exist and their quality
  const deliverableSummary = [
    { key: "bmc_analysis", label: "Business Model Canvas" },
    { key: "sic_analysis", label: "Social Impact Canvas" },
    { key: "inputs_data", label: "Données Financières (Inputs)" },
    { key: "framework_data", label: "Plan Financier Intermédiaire" },
    { key: "plan_ovo", label: "Plan Financier Final (Plan OVO)" },
    { key: "business_plan", label: "Business Plan" },
    { key: "odd_analysis", label: "Analyse ODD" },
    { key: "diagnostic_data", label: "Diagnostic Expert Global" },
  ].map((d) => {
    const exists = !!(dm[d.key] && Object.keys(dm[d.key]).length > 0);
    return `- ${d.label}: ${exists ? "✅ Présent" : "❌ Absent"}`;
  }).join("\n");

  // Enterprise basic info completeness
  const enterpriseInfo = [
    `Nom: ${ent.name || "Non renseigné"}`,
    `Pays: ${ent.country || "Non renseigné"}`,
    `Secteur: ${ent.sector || "Non renseigné"}`,
    `Forme juridique: ${ent.legal_form || "Non renseigné"}`,
    `Date création: ${ent.creation_date || "Non renseigné"}`,
    `Effectif: ${ent.employees_count || "Non renseigné"}`,
    `Description: ${ent.description ? "Renseignée" : "Absente"}`,
    `Contact email: ${ent.contact_email || "Non renseigné"}`,
  ].join("\n");

  // Document uploads summary
  const hasDocuments = !!(ctx.documentContent && ctx.documentContent.trim().length > 50);

  return `═══ INFORMATIONS ENTREPRISE ═══
${enterpriseInfo}

═══ MODULES ESONO COMPLÉTÉS ═══
${deliverableSummary}

═══ DOCUMENTS UPLOADÉS ═══
${hasDocuments ? `Oui — aperçu ci-dessous:\n${ctx.documentContent.substring(0, 2000)}` : "Aucun document uploadé"}

═══ DONNÉES FINANCIÈRES DISPONIBLES ═══
${dm["inputs_data"] ? JSON.stringify(dm["inputs_data"]).substring(0, 1500) : "Aucune donnée financière formelle"}

═══ BMC (si disponible) ═══
${dm["bmc_analysis"] ? JSON.stringify(dm["bmc_analysis"]).substring(0, 1000) : "BMC non complété"}

═══ SCORE IR ACTUEL ═══
${ent.score_ir ? `${ent.score_ir}/100` : "Non calculé"}`;
}

// ══════════════════════════════════════════════════════════════════════
// HTML GENERATOR
// ══════════════════════════════════════════════════════════════════════

function generateGapHtml(data: any): string {
  const cats = data.categories || {};
  const rp = data.readiness_pathway || {};

  const categoryLabels: Record<string, string> = {
    corporate: "Corporate & Légal",
    finance: "Finance",
    commercial: "Commercial",
    legal: "Juridique",
    esg: "ESG & Impact",
  };

  const levelBadge = (level: number) => {
    const labels = ["N0 Déclaratif", "N1 Faible", "N2 Intermédiaire", "N3 Solide"];
    const colors = ["#fed7d7", "#feebc8", "#fefcbf", "#c6f6d5"];
    const textColors = ["#9b2c2c", "#975a16", "#744210", "#276749"];
    return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:8pt;font-weight:600;background:${colors[level] || colors[0]};color:${textColors[level] || textColors[0]}">${labels[level] || "N/A"}</span>`;
  };

  const scoreColor = (s: number) => s >= 70 ? "#276749" : s >= 40 ? "#975a16" : "#9b2c2c";
  const scoreBg = (s: number) => s >= 70 ? "#f0fff4" : s >= 40 ? "#fffff0" : "#fff5f5";

  const categoryHtml = Object.entries(cats).map(([key, cat]: [string, any]) => {
    const items = (cat.items || []).map((item: any) => `
      <tr>
        <td>${item.present ? "✅" : "❌"} ${item.label}</td>
        <td>${levelBadge(item.level)}</td>
        <td style="font-size:9pt;color:#4a5568">${item.comment || ""}</td>
      </tr>`).join("");
    return `
    <div style="margin-bottom:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h3 style="font-size:13pt;color:#1a365d;margin:0">${categoryLabels[key] || key}</h3>
        <span style="display:inline-flex;align-items:center;gap:8px;background:${scoreBg(cat.score)};color:${scoreColor(cat.score)};padding:4px 16px;border-radius:20px;font-weight:700;font-size:11pt">${cat.score}/100</span>
      </div>
      <div style="background:#f7fafc;border-radius:4px;overflow:hidden">
        <div style="height:6px;background:${scoreColor(cat.score)};width:${cat.score}%"></div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:10pt">
        <tr style="background:#1a365d;color:white">
          <th style="padding:6px 10px;text-align:left">Élément</th>
          <th style="padding:6px 10px;text-align:left;width:140px">Niveau de preuve</th>
          <th style="padding:6px 10px;text-align:left">Observation</th>
        </tr>
        ${items}
      </table>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Analyse des Écarts Documentaires</title>
<style>
  body { font-family: "Segoe UI", system-ui, sans-serif; font-size: 11pt; color: #2d3748; background: #f7fafc; margin: 0; }
  .container { max-width: 900px; margin: 0 auto; padding: 32px; background: white; }
  h1 { font-size: 22pt; color: #1a365d; margin-bottom: 4px; }
  h2 { font-size: 16pt; color: #1a365d; border-bottom: 2px solid #2b6cb0; padding-bottom: 6px; margin: 24px 0 14px; }
  p { margin-bottom: 8px; }
  tr:nth-child(even) td { background: #f7fafc; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  li { margin: 6px 0; }
</style>
</head>
<body>
<div class="container">
  <h1>Analyse des Écarts Documentaires</h1>
  <p style="color:#4a5568">Généré par ESONO Investment Readiness Platform</p>

  <div style="display:flex;gap:16px;margin:20px 0;flex-wrap:wrap">
    <div style="background:#1a365d;color:white;padding:16px 24px;border-radius:8px;text-align:center">
      <div style="font-size:28pt;font-weight:700">${data.score_global || data.score || 0}/100</div>
      <div style="font-size:10pt;opacity:0.8">Score Global</div>
    </div>
    <div style="background:#f0f4f8;padding:16px 24px;border-radius:8px;flex:1">
      <div style="font-weight:700;color:#1a365d;font-size:13pt">${rp.investor_type || ""}</div>
      <div style="color:#4a5568;font-size:10pt;margin-top:4px">${rp.rationale || ""}</div>
    </div>
  </div>

  <h2>Analyse par catégorie</h2>
  ${categoryHtml}

  <h2>Prochaines étapes recommandées</h2>
  <ol style="padding-left:20px">
    ${(rp.next_steps || []).map((s: string) => `<li>${s}</li>`).join("")}
  </ol>

  ${(data.reconstruction_needed || []).length > 0 ? `
  <h2>Éléments critiques manquants</h2>
  <div style="background:#fff5f5;border:1px solid #fc8181;border-radius:8px;padding:16px">
    <ul style="padding-left:20px">
      ${data.reconstruction_needed.map((r: string) => `<li style="margin:6px 0">${r}</li>`).join("")}
    </ul>
  </div>` : ""}
</div>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ctx = await verifyAndGetContext(req);
    const { supabase, enterprise, enterprise_id } = ctx;

    console.log(`[generate-gap-analysis] Generating for ${enterprise.name} (${enterprise_id})`);

    // Build RAG context
    const ragContext = await buildRAGContext(
      supabase,
      enterprise.country || "Côte d'Ivoire",
      enterprise.sector || "",
      ["investment_readiness", "governance", "esg"]
    );

    const userPrompt = `Effectue une analyse documentaire complète de cette PME africaine.
Évalue la complétude et la qualité de la preuve pour chaque élément documentaire requis.

${buildGapContext(ctx)}

${ragContext}

CONSIGNES :
1. Pour chaque catégorie, liste TOUS les documents/éléments attendus (pas seulement ceux présents)
2. Attribue un niveau de preuve (0-3) basé sur CE QUI EST RÉELLEMENT DISPONIBLE dans les données
3. Le score de chaque catégorie reflète la moyenne pondérée des niveaux de preuve sur les éléments présents
4. Le score_global est la moyenne des 5 scores catégoriques
5. L'investor_type doit être réaliste compte tenu du niveau actuel
6. Les next_steps sont des actions concrètes et actionnables dans les 3-6 prochains mois

RETOURNE UNIQUEMENT LE JSON suivant ce schéma :
${GAP_SCHEMA}`;

    const result = await callAI(SYSTEM_PROMPT, userPrompt, 8192);

    console.log(`[generate-gap-analysis] Generated, score: ${result.score_global || result.score}`);

    // Generate HTML
    const htmlContent = generateGapHtml(result);

    // Save deliverable
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseAdmin.from("deliverables").upsert({
      enterprise_id,
      type: "gap_analysis",
      data: result,
      score: result.score_global || result.score || null,
      html_content: htmlContent,
      ai_generated: true,
      version: 1,
    }, { onConflict: "enterprise_id,type" });

    // Update enterprise with denormalized scores
    const cats = result.categories || {};
    await supabaseAdmin.from("enterprises").update({
      readiness_pathway: result.readiness_pathway?.investor_type || null,
      gap_score_corporate: cats.corporate?.score || 0,
      gap_score_finance: cats.finance?.score || 0,
      gap_score_commercial: cats.commercial?.score || 0,
      gap_score_legal: cats.legal?.score || 0,
      gap_score_esg: cats.esg?.score || 0,
    }).eq("id", enterprise_id);

    // Update module status
    await supabaseAdmin.from("enterprise_modules")
      .upsert({
        enterprise_id,
        module: "gap_analysis",
        status: "completed",
        progress: 100,
        data: result,
      }, { onConflict: "enterprise_id,module" });

    return jsonResponse({
      success: true,
      score: result.score_global || result.score,
    });
  } catch (e: any) {
    console.error("[generate-gap-analysis] Error:", e);
    if (e.status) return errorResponse(e.message, e.status);
    return errorResponse(e.message || "Erreur interne", 500);
  }
});
