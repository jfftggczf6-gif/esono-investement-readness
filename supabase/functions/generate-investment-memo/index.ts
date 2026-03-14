/**
 * generate-investment-memo
 *
 * Generates two investor-facing documents from all existing deliverables:
 *   1. Investment Memorandum (10-30 pages) — for fund investment committees
 *   2. One-Pager / Teaser (1 page)  — for initial screening & deal sourcing
 *
 * Consumes: BMC, SIC, Framework, Plan OVO, Business Plan, ODD, Diagnostic
 * Produces: deliverable type "investment_memo" with { memo, onepager, score, metadata }
 *           and deliverable type "onepager" separately
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, errorResponse, jsonResponse,
  verifyAndGetContext, callAI, saveDeliverable, buildRAGContext, getFiscalParams
} from "../_shared/helpers.ts";

// ══════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ══════════════════════════════════════════════════════════════════════

const MEMO_SYSTEM_PROMPT = `Tu es un analyste senior en Private Equity / Impact Investing, spécialisé en PME africaines.
Tu rédiges des Investment Memorandums professionnels pour des fonds comme BAD, IFC, Proparco, BII, Enabel, GIZ.
Tu connais :
- Les normes SYSCOHADA et la fiscalité UEMOA/CEMAC
- Les critères ESG des bailleurs de fonds DFI
- Le processus d'investissement : screening → due diligence → investment memo → comité
- Les attentes des investisseurs en Afrique subsaharienne

STYLE :
- Professionnel, factuel, nuancé
- Présentation équilibrée : forces ET risques
- Recommandation argumentée
- Chiffres en FCFA avec séparateurs de milliers
- Utilise des formulations comme "nous recommandons", "l'analyse suggère", "les données indiquent"

IMPORTANT: Réponds UNIQUEMENT en JSON valide. Pas de markdown, pas de texte autour.`;

const ONEPAGER_SYSTEM_PROMPT = `Tu es un banquier d'affaires senior qui rédige des teasers d'investissement pour présenter des opportunités à des fonds.
Le teaser doit être percutant, concis, professionnel — conçu pour obtenir un premier rendez-vous.

STYLE :
- Maximum impact en minimum de mots
- Chiffres clés mis en avant
- Proposition de valeur claire en une phrase
- Format compatible impression 1 page A4

IMPORTANT: Réponds UNIQUEMENT en JSON valide. Pas de markdown, pas de texte autour.`;

// ══════════════════════════════════════════════════════════════════════
// JSON SCHEMAS
// ══════════════════════════════════════════════════════════════════════

const MEMO_SCHEMA = `{
  "metadata": {
    "version": "1.0",
    "date_generation": "YYYY-MM-DD",
    "classification": "Confidentiel",
    "auteur": "ESONO Investment Readiness Platform"
  },
  "page_garde": {
    "titre": "Investment Memorandum",
    "sous_titre": "string — ex: Opportunité d'investissement dans [secteur] en [pays]",
    "entreprise": "string",
    "date": "string",
    "reference": "string — ESONO-IM-YYYY-NNN"
  },
  "resume_executif": {
    "accroche": "string — 2-3 phrases percutantes résumant l'opportunité",
    "opportunite": "string — pourquoi cette entreprise mérite un investissement",
    "montant_recherche": "string — montant en FCFA + utilisation résumée",
    "points_cles": ["string × 4-6 — les arguments clés pour investir"],
    "recommandation": "string — recommandation claire : investir / approfondir / décliner"
  },
  "presentation_entreprise": {
    "identite": {
      "nom": "string",
      "forme_juridique": "string",
      "date_creation": "string",
      "siege_social": "string",
      "secteur": "string",
      "registre_commerce": "string ou À compléter",
      "effectif": "string"
    },
    "historique": "string — chronologie des étapes clés, 200-300 mots",
    "mission_vision": "string — mission et vision de l'entreprise",
    "activites_principales": "string — description détaillée des activités",
    "proposition_valeur": "string — ce qui différencie l'entreprise"
  },
  "analyse_marche": {
    "taille_marche": "string — TAM / SAM / SOM avec chiffres",
    "dynamique_croissance": "string — taux de croissance, tendances",
    "positionnement": "string — où se situe l'entreprise vs concurrents",
    "concurrence": "string — principaux concurrents, parts de marché estimées",
    "avantages_concurrentiels": ["string × 3-5"],
    "barrieres_entree": "string — ce qui protège la position",
    "risques_marche": "string — menaces identifiées"
  },
  "modele_economique": {
    "description": "string — comment l'entreprise génère des revenus",
    "segments_clients": "string — qui sont les clients, segmentation",
    "sources_revenus": "string — flux de revenus détaillés",
    "structure_couts": "string — principaux postes de coûts",
    "unit_economics": "string — marge par unité, coût d'acquisition client, LTV si applicable",
    "scalabilite": "string — potentiel de croissance du modèle"
  },
  "analyse_financiere": {
    "performance_historique": {
      "chiffre_affaires": "string — CA des 3 dernières années + TCAC",
      "marges": "string — marge brute, EBITDA, marge nette",
      "tresorerie": "string — situation cashflow",
      "endettement": "string — ratio dette/fonds propres"
    },
    "projections": {
      "scenario_realiste": "string — CA et résultat net projetés sur 5 ans",
      "scenario_optimiste": "string — hypothèses et résultats",
      "scenario_pessimiste": "string — hypothèses et résultats",
      "hypotheses_cles": ["string × 4-6 — hypothèses de modélisation"],
      "tri_estime": "string — Taux de Rendement Interne estimé",
      "point_mort": "string — seuil de rentabilité"
    },
    "besoins_financement": {
      "montant_total": "string — en FCFA",
      "utilisation_fonds": [
        {"poste": "string", "montant": "string", "pourcentage": "string", "justification": "string"}
      ],
      "calendrier_deploiement": "string — phasage des investissements"
    }
  },
  "equipe_gouvernance": {
    "fondateurs": "string — profils des fondateurs",
    "equipe_dirigeante": "string — compétences clés, expérience",
    "gouvernance_actuelle": "string — organes de gouvernance, CA, AG",
    "gaps_identifies": "string — lacunes à combler",
    "plan_renforcement": "string — recrutements ou formations prévus"
  },
  "analyse_esg": {
    "impact_social": "string — emplois, inclusion, communauté",
    "impact_environnemental": "string — empreinte, gestion déchets, énergie",
    "gouvernance": "string — transparence, conformité, anti-corruption",
    "odd_alignes": ["string × 3-5 — ODD principaux avec justification courte"],
    "score_esg": "string — appréciation globale"
  },
  "analyse_risques": {
    "risques_operationnels": [{"risque": "string", "probabilite": "Faible|Moyen|Élevé", "impact": "Faible|Moyen|Élevé", "mitigation": "string"}],
    "risques_financiers": [{"risque": "string", "probabilite": "string", "impact": "string", "mitigation": "string"}],
    "risques_marche": [{"risque": "string", "probabilite": "string", "impact": "string", "mitigation": "string"}],
    "risques_reglementaires": [{"risque": "string", "probabilite": "string", "impact": "string", "mitigation": "string"}],
    "matrice_risques_globale": "string — synthèse du profil de risque"
  },
  "these_investissement": {
    "pourquoi_investir": "string — 300-400 mots, argumentaire structuré",
    "catalyseurs_croissance": ["string × 3-5"],
    "creation_valeur": "string — comment l'investissement crée de la valeur",
    "alignement_strategique": "string — pourquoi ce deal est cohérent pour un fonds impact/DFI"
  },
  "structure_proposee": {
    "instrument": "string — equity, dette, mezzanine, convertible",
    "montant": "string — en FCFA",
    "valorisation_indicative": "string — pré-money estimée",
    "participation_visee": "string — pourcentage",
    "droits_investisseur": "string — board seat, droits de veto, anti-dilution",
    "horizon_sortie": "string — 5-7 ans typique",
    "scenarios_sortie": "string — vente stratégique, secondaire, IPO"
  },
  "recommandation_finale": {
    "verdict": "Investir|Approfondir|Décliner",
    "synthese": "string — 200-300 mots, conclusion argumentée",
    "conditions_prealables": ["string × 3-5 — conditions avant closing"],
    "prochaines_etapes": ["string × 3-5 — actions recommandées"]
  },
  "annexes": {
    "sources_donnees": ["string — liste des documents analysés"],
    "methodologie": "string — comment le scoring a été calculé",
    "glossaire": ["string — termes clés utilisés"]
  },
  "score": "<nombre 0-100 — score global investment readiness>"
}`;

const ONEPAGER_SCHEMA = `{
  "header": {
    "titre": "string — Opportunité d'Investissement",
    "entreprise": "string",
    "secteur": "string",
    "pays": "string",
    "date": "string",
    "classification": "Confidentiel"
  },
  "snapshot": {
    "date_creation": "string",
    "forme_juridique": "string",
    "effectif": "string",
    "ca_dernier_exercice": "string — en FCFA",
    "croissance_ca": "string — % annuel",
    "ebitda_marge": "string — % si disponible"
  },
  "proposition_valeur": "string — 1-2 phrases maximum, percutant",
  "probleme_solution": {
    "probleme": "string — 1-2 phrases, le problème adressé",
    "solution": "string — 1-2 phrases, comment l'entreprise le résout"
  },
  "marche": {
    "tam": "string — taille totale du marché",
    "sam": "string — marché adressable",
    "croissance": "string — croissance annuelle du marché"
  },
  "traction": {
    "clients": "string — nombre ou type de clients",
    "revenus": "string — trajectoire des revenus",
    "croissance": "string — métriques de traction clés",
    "partenariats": "string — partenariats stratégiques si applicable"
  },
  "financier_resume": {
    "ca_annees": ["string — CA année N-2", "string — CA année N-1", "string — CA année N"],
    "projection_5ans": "string — CA projeté en année 5",
    "besoin_financement": "string — montant recherché en FCFA",
    "utilisation": "string — principales utilisations en 1-2 phrases"
  },
  "impact": {
    "odd_principaux": ["string × 2-3 — ODD avec une phrase chacun"],
    "impact_cle": "string — chiffre ou fait d'impact le plus marquant"
  },
  "equipe": {
    "fondateur": "string — nom + background en 1 phrase",
    "equipe_cle": "string — forces de l'équipe en 1 phrase"
  },
  "points_forts": ["string × 4-5 — arguments clés, courts et percutants"],
  "contact": {
    "nom": "string",
    "email": "string ou À compléter",
    "telephone": "string ou À compléter"
  },
  "score_ir": "<nombre 0-100>"
}`;

// ══════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ══════════════════════════════════════════════════════════════════════

function buildMemoContext(ctx: any): string {
  const ent = ctx.enterprise;
  const dm = ctx.deliverableMap;
  const bmc = dm["bmc_analysis"] || {};
  const sic = dm["sic_analysis"] || {};
  const inp = dm["inputs_data"] || {};
  const fw = dm["framework_data"] || {};
  const plan = dm["plan_ovo"] || {};
  const bp = dm["business_plan"] || {};
  const odd = dm["odd_analysis"] || {};
  const diag = dm["diagnostic_data"] || {};
  const fp = getFiscalParams(ent.country || "Côte d'Ivoire");

  return `═══ DONNÉES ENTREPRISE ═══
Nom: ${ent.name || "N/A"}
Pays: ${ent.country || "Côte d'Ivoire"}
Secteur: ${ent.sector || "N/A"}
Description: ${ent.description || "N/A"}
Forme juridique: ${ent.legal_form || "N/A"}
Date création: ${ent.creation_date || "N/A"}
Effectif: ${ent.employees_count || "N/A"}
Ville: ${ent.city || "N/A"}
Devise: ${fp.devise}
TVA: ${fp.tva}% | IS: ${fp.is}%

═══ BUSINESS MODEL CANVAS ═══
${JSON.stringify(bmc).substring(0, 3000)}

═══ SOCIAL IMPACT CANVAS ═══
${JSON.stringify(sic).substring(0, 2000)}

═══ DONNÉES FINANCIÈRES (Inputs historiques) ═══
${JSON.stringify(inp).substring(0, 3000)}

═══ FRAMEWORK FINANCIER ═══
${JSON.stringify(fw).substring(0, 2000)}

═══ PLAN OVO (3 scénarios × 5 ans) ═══
${JSON.stringify(plan).substring(0, 4000)}

═══ BUSINESS PLAN ═══
${JSON.stringify(bp).substring(0, 3000)}

═══ ANALYSE ODD ═══
${JSON.stringify(odd).substring(0, 2000)}

═══ DIAGNOSTIC EXPERT ═══
${JSON.stringify(diag).substring(0, 2000)}

${ctx.documentContent ? `═══ DOCUMENTS SOURCES ═══\n${ctx.documentContent.substring(0, 3000)}` : ""}`;
}

// ══════════════════════════════════════════════════════════════════════
// PROMPT BUILDERS
// ══════════════════════════════════════════════════════════════════════

function buildMemoPrompt(ctx: any, ragContext: string): string {
  return `Rédige un Investment Memorandum COMPLET et PROFESSIONNEL pour cette PME africaine.
Ce document sera présenté au comité d'investissement d'un fonds (BAD, IFC, Proparco, etc.).
Il doit être factuel, équilibré (forces ET risques), et contenir une recommandation argumentée.

${buildMemoContext(ctx)}

${ragContext}

CONSIGNES CRITIQUES :
1. Utilise UNIQUEMENT les données fournies — ne jamais inventer de chiffres
2. Si une donnée manque, indique "Non disponible — à compléter en due diligence"
3. Les montants sont en ${getFiscalParams(ctx.enterprise.country).devise} avec séparateurs de milliers
4. Le score /100 reflète la maturité investment readiness : <40 = non prêt, 40-60 = potentiel, 60-80 = prêt avec réserves, >80 = prêt
5. La recommandation doit être cohérente avec le score et les risques identifiés
6. Chaque section doit être substantielle (min 100 mots pour les sections narratives)

RETOURNE UNIQUEMENT LE JSON suivant le schéma :
${MEMO_SCHEMA}`;
}

function buildOnepagerPrompt(ctx: any, memoData: any): string {
  return `Génère un One-Pager / Teaser d'investissement pour cette PME africaine.
Ce document d'UNE PAGE est conçu pour susciter l'intérêt d'un investisseur et obtenir un premier rendez-vous.

DONNÉES ENTREPRISE :
Nom: ${ctx.enterprise.name}
Pays: ${ctx.enterprise.country}
Secteur: ${ctx.enterprise.sector}

DONNÉES DU MEMO D'INVESTISSEMENT (déjà analysé) :
${JSON.stringify(memoData).substring(0, 6000)}

CONSIGNES :
1. Sois CONCIS — chaque champ doit tenir en 1-2 phrases max
2. Mets en avant les chiffres les plus impressionnants
3. La proposition de valeur doit être percutante et mémorable
4. Les points forts sont les 4-5 arguments qui font dire "je veux en savoir plus"
5. Le score_ir reprend le score du memo

RETOURNE UNIQUEMENT LE JSON suivant le schéma :
${ONEPAGER_SCHEMA}`;
}

// ══════════════════════════════════════════════════════════════════════
// HTML GENERATORS
// ══════════════════════════════════════════════════════════════════════

function generateMemoHtml(data: any): string {
  const d = data;
  const pg = d.page_garde || {};
  const re = d.resume_executif || {};
  const pe = d.presentation_entreprise || {};
  const am = d.analyse_marche || {};
  const me = d.modele_economique || {};
  const af = d.analyse_financiere || {};
  const eg = d.equipe_gouvernance || {};
  const esg = d.analyse_esg || {};
  const ar = d.analyse_risques || {};
  const ti = d.these_investissement || {};
  const sp = d.structure_proposee || {};
  const rf = d.recommandation_finale || {};
  const an = d.annexes || {};

  const riskTable = (risks: any[]) => {
    if (!risks || risks.length === 0) return "<p><em>Non évalué</em></p>";
    return `<table class="risk-table">
      <tr><th>Risque</th><th>Prob.</th><th>Impact</th><th>Mitigation</th></tr>
      ${risks.map((r: any) => `<tr>
        <td>${r.risque || ""}</td>
        <td class="badge badge-${(r.probabilite || "").toLowerCase() === "élevé" ? "high" : (r.probabilite || "").toLowerCase() === "moyen" ? "medium" : "low"}">${r.probabilite || ""}</td>
        <td class="badge badge-${(r.impact || "").toLowerCase() === "élevé" ? "high" : (r.impact || "").toLowerCase() === "moyen" ? "medium" : "low"}">${r.impact || ""}</td>
        <td>${r.mitigation || ""}</td>
      </tr>`).join("")}
    </table>`;
  };

  const fundingTable = (items: any[]) => {
    if (!items || items.length === 0) return "";
    return `<table class="funding-table">
      <tr><th>Poste</th><th>Montant</th><th>%</th><th>Justification</th></tr>
      ${items.map((i: any) => `<tr><td>${i.poste}</td><td>${i.montant}</td><td>${i.pourcentage}</td><td>${i.justification}</td></tr>`).join("")}
    </table>`;
  };

  const verdictClass = (v: string) => {
    const vl = (v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (vl.includes("investir")) return "verdict-investir";
    if (vl.includes("decliner") || vl.includes("décliner")) return "verdict-decliner";
    return "verdict-approfondir";
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Investment Memorandum — ${pg.entreprise || ""}</title>
<style>
  :root { --primary: #1a365d; --accent: #2b6cb0; --success: #276749; --warning: #975a16; --danger: #9b2c2c; --gray: #4a5568; --bg: #f7fafc; --white: #ffffff; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; font-size: 11pt; line-height: 1.6; color: #2d3748; background: var(--bg); }
  .container { max-width: 210mm; margin: 0 auto; background: var(--white); box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .cover { background: linear-gradient(135deg, var(--primary) 0%, #2c5282 100%); color: white; padding: 80px 60px; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
  .cover h1 { font-size: 36pt; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.5px; }
  .cover .subtitle { font-size: 16pt; opacity: 0.85; margin-bottom: 48px; }
  .cover .meta { font-size: 11pt; opacity: 0.7; line-height: 2; }
  .cover .badge-conf { display: inline-block; border: 1px solid rgba(255,255,255,0.4); padding: 4px 16px; border-radius: 4px; font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; margin-top: 40px; }
  .content { padding: 40px 60px; }
  h2 { font-size: 18pt; color: var(--primary); border-bottom: 2px solid var(--accent); padding-bottom: 8px; margin: 32px 0 16px; page-break-after: avoid; }
  h3 { font-size: 13pt; color: var(--accent); margin: 20px 0 10px; }
  p { margin-bottom: 10px; text-align: justify; }
  .key-points { background: #ebf8ff; border-left: 4px solid var(--accent); padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 16px 0; }
  .key-points li { margin: 6px 0; padding-left: 8px; }
  .score-badge { display: inline-flex; align-items: center; gap: 12px; background: var(--primary); color: white; padding: 12px 24px; border-radius: 8px; font-size: 14pt; font-weight: 700; margin: 16px 0; }
  .score-badge .label { font-size: 10pt; font-weight: 400; opacity: 0.8; }
  .verdict { padding: 20px 24px; border-radius: 8px; margin: 16px 0; font-weight: 600; font-size: 12pt; }
  .verdict-investir { background: #f0fff4; border: 2px solid var(--success); color: var(--success); }
  .verdict-approfondir { background: #fffff0; border: 2px solid var(--warning); color: var(--warning); }
  .verdict-decliner { background: #fff5f5; border: 2px solid var(--danger); color: var(--danger); }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
  th { background: var(--primary); color: white; padding: 8px 12px; text-align: left; font-weight: 600; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f7fafc; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: 600; }
  .badge-low { background: #f0fff4; color: var(--success); }
  .badge-medium { background: #fffff0; color: var(--warning); }
  .badge-high { background: #fff5f5; color: var(--danger); }
  .id-card { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #f7fafc; padding: 16px 20px; border-radius: 8px; margin: 12px 0; }
  .id-card .field { font-size: 10pt; }
  .id-card .field-label { color: var(--gray); font-size: 9pt; }
  .id-card .field-value { font-weight: 600; }
  .conditions li { margin: 8px 0; padding: 8px 16px; background: #fffff0; border-left: 3px solid var(--warning); border-radius: 0 4px 4px 0; }
  @media print {
    body { background: white; }
    .container { max-width: none; box-shadow: none; }
    h2 { page-break-after: avoid; }
    .cover { page-break-after: always; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="cover">
    <h1>${pg.titre || "Investment Memorandum"}</h1>
    <div class="subtitle">${pg.sous_titre || ""}</div>
    <div class="meta">
      <div><strong>Entreprise :</strong> ${pg.entreprise || ""}</div>
      <div><strong>Date :</strong> ${pg.date || ""}</div>
      <div><strong>Référence :</strong> ${pg.reference || ""}</div>
      <div><strong>Généré par :</strong> ESONO Investment Readiness Platform</div>
    </div>
    <div class="badge-conf">${d.metadata?.classification || "Confidentiel"}</div>
  </div>
  <div class="content">
    <h2>1. Résumé exécutif</h2>
    <p><strong>${re.accroche || ""}</strong></p>
    <p>${re.opportunite || ""}</p>
    <p><strong>Financement recherché :</strong> ${re.montant_recherche || "À déterminer"}</p>
    <div class="key-points">
      <strong>Points clés :</strong>
      <ul>${(re.points_cles || []).map((p: string) => `<li>${p}</li>`).join("")}</ul>
    </div>
    <div class="score-badge">
      <span>${d.score || "—"}/100</span>
      <span class="label">Score Investment Readiness</span>
    </div>
    <div class="verdict ${verdictClass(rf.verdict || "")}">
      Recommandation : ${rf.verdict || "À déterminer"}
    </div>

    <h2>2. Présentation de l'entreprise</h2>
    ${pe.identite ? `<div class="id-card">
      <div class="field"><span class="field-label">Raison sociale</span><br><span class="field-value">${pe.identite.nom || ""}</span></div>
      <div class="field"><span class="field-label">Forme juridique</span><br><span class="field-value">${pe.identite.forme_juridique || ""}</span></div>
      <div class="field"><span class="field-label">Date de création</span><br><span class="field-value">${pe.identite.date_creation || ""}</span></div>
      <div class="field"><span class="field-label">Siège social</span><br><span class="field-value">${pe.identite.siege_social || ""}</span></div>
      <div class="field"><span class="field-label">Secteur</span><br><span class="field-value">${pe.identite.secteur || ""}</span></div>
      <div class="field"><span class="field-label">Effectif</span><br><span class="field-value">${pe.identite.effectif || ""}</span></div>
    </div>` : ""}
    <h3>Historique</h3><p>${pe.historique || ""}</p>
    <h3>Mission & Vision</h3><p>${pe.mission_vision || ""}</p>
    <h3>Activités principales</h3><p>${pe.activites_principales || ""}</p>
    <h3>Proposition de valeur</h3><p>${pe.proposition_valeur || ""}</p>

    <h2>3. Analyse du marché</h2>
    <h3>Taille du marché</h3><p>${am.taille_marche || ""}</p>
    <h3>Dynamique de croissance</h3><p>${am.dynamique_croissance || ""}</p>
    <h3>Positionnement concurrentiel</h3>
    <p>${am.positionnement || ""}</p>
    <p>${am.concurrence || ""}</p>
    <h3>Avantages concurrentiels</h3>
    <ul>${(am.avantages_concurrentiels || []).map((a: string) => `<li>${a}</li>`).join("")}</ul>
    <h3>Barrières à l'entrée</h3><p>${am.barrieres_entree || ""}</p>

    <h2>4. Modèle économique</h2>
    <p>${me.description || ""}</p>
    <h3>Segments clients</h3><p>${me.segments_clients || ""}</p>
    <h3>Sources de revenus</h3><p>${me.sources_revenus || ""}</p>
    <h3>Structure de coûts</h3><p>${me.structure_couts || ""}</p>
    <h3>Unit Economics</h3><p>${me.unit_economics || ""}</p>
    <h3>Scalabilité</h3><p>${me.scalabilite || ""}</p>

    <h2>5. Analyse financière</h2>
    ${af.performance_historique ? `
    <h3>Performance historique</h3>
    <p><strong>Chiffre d'affaires :</strong> ${af.performance_historique.chiffre_affaires || ""}</p>
    <p><strong>Marges :</strong> ${af.performance_historique.marges || ""}</p>
    <p><strong>Trésorerie :</strong> ${af.performance_historique.tresorerie || ""}</p>
    <p><strong>Endettement :</strong> ${af.performance_historique.endettement || ""}</p>` : ""}
    ${af.projections ? `
    <h3>Projections financières</h3>
    <p><strong>Scénario réaliste :</strong> ${af.projections.scenario_realiste || ""}</p>
    <p><strong>Scénario optimiste :</strong> ${af.projections.scenario_optimiste || ""}</p>
    <p><strong>Scénario pessimiste :</strong> ${af.projections.scenario_pessimiste || ""}</p>
    <p><strong>TRI estimé :</strong> ${af.projections.tri_estime || "Non calculé"}</p>
    <p><strong>Point mort :</strong> ${af.projections.point_mort || "Non calculé"}</p>
    <h3>Hypothèses clés</h3>
    <ul>${(af.projections.hypotheses_cles || []).map((h: string) => `<li>${h}</li>`).join("")}</ul>` : ""}
    ${af.besoins_financement ? `
    <h3>Besoins de financement</h3>
    <p><strong>Montant total :</strong> ${af.besoins_financement.montant_total || ""}</p>
    <p><strong>Calendrier :</strong> ${af.besoins_financement.calendrier_deploiement || ""}</p>
    ${fundingTable(af.besoins_financement.utilisation_fonds)}` : ""}

    <h2>6. Équipe & gouvernance</h2>
    <h3>Fondateurs</h3><p>${eg.fondateurs || ""}</p>
    <h3>Équipe dirigeante</h3><p>${eg.equipe_dirigeante || ""}</p>
    <h3>Gouvernance actuelle</h3><p>${eg.gouvernance_actuelle || ""}</p>
    <h3>Gaps identifiés</h3><p>${eg.gaps_identifies || ""}</p>

    <h2>7. Analyse ESG & Impact</h2>
    <p><strong>Impact social :</strong> ${esg.impact_social || ""}</p>
    <p><strong>Impact environnemental :</strong> ${esg.impact_environnemental || ""}</p>
    <p><strong>Gouvernance :</strong> ${esg.gouvernance || ""}</p>
    <h3>ODD alignés</h3>
    <ul>${(esg.odd_alignes || []).map((o: string) => `<li>${o}</li>`).join("")}</ul>
    <p><strong>Score ESG :</strong> ${esg.score_esg || ""}</p>

    <h2>8. Analyse des risques</h2>
    <h3>Risques opérationnels</h3>${riskTable(ar.risques_operationnels)}
    <h3>Risques financiers</h3>${riskTable(ar.risques_financiers)}
    <h3>Risques de marché</h3>${riskTable(ar.risques_marche)}
    <h3>Risques réglementaires</h3>${riskTable(ar.risques_reglementaires)}
    <p><strong>Profil de risque global :</strong> ${ar.matrice_risques_globale || ""}</p>

    <h2>9. Thèse d'investissement</h2>
    <p>${ti.pourquoi_investir || ""}</p>
    <h3>Catalyseurs de croissance</h3>
    <ul>${(ti.catalyseurs_croissance || []).map((c: string) => `<li>${c}</li>`).join("")}</ul>
    <h3>Création de valeur</h3><p>${ti.creation_valeur || ""}</p>
    <h3>Alignement stratégique</h3><p>${ti.alignement_strategique || ""}</p>

    <h2>10. Structure de l'investissement proposée</h2>
    <div class="id-card">
      <div class="field"><span class="field-label">Instrument</span><br><span class="field-value">${sp.instrument || ""}</span></div>
      <div class="field"><span class="field-label">Montant</span><br><span class="field-value">${sp.montant || ""}</span></div>
      <div class="field"><span class="field-label">Valorisation indicative</span><br><span class="field-value">${sp.valorisation_indicative || ""}</span></div>
      <div class="field"><span class="field-label">Participation visée</span><br><span class="field-value">${sp.participation_visee || ""}</span></div>
      <div class="field"><span class="field-label">Horizon de sortie</span><br><span class="field-value">${sp.horizon_sortie || ""}</span></div>
      <div class="field"><span class="field-label">Scénarios de sortie</span><br><span class="field-value">${sp.scenarios_sortie || ""}</span></div>
    </div>
    <p><strong>Droits investisseur :</strong> ${sp.droits_investisseur || ""}</p>

    <h2>11. Recommandation finale</h2>
    <div class="verdict ${verdictClass(rf.verdict || "")}">
      ${rf.verdict || "À déterminer"}
    </div>
    <p>${rf.synthese || ""}</p>
    ${(rf.conditions_prealables || []).length > 0 ? `
    <h3>Conditions préalables</h3>
    <ul class="conditions">${rf.conditions_prealables.map((c: string) => `<li>${c}</li>`).join("")}</ul>` : ""}
    ${(rf.prochaines_etapes || []).length > 0 ? `
    <h3>Prochaines étapes</h3>
    <ol>${rf.prochaines_etapes.map((e: string) => `<li>${e}</li>`).join("")}</ol>` : ""}

    <h2>Annexes</h2>
    <p><strong>Méthodologie :</strong> ${an.methodologie || ""}</p>
    ${(an.sources_donnees || []).length > 0 ? `
    <h3>Sources de données</h3>
    <ul>${an.sources_donnees.map((s: string) => `<li>${s}</li>`).join("")}</ul>` : ""}
  </div>
</div>
</body>
</html>`;
}

function generateOnepagerHtml(data: any): string {
  const h = data.header || {};
  const sn = data.snapshot || {};
  const ps = data.probleme_solution || {};
  const m = data.marche || {};
  const t = data.traction || {};
  const f = data.financier_resume || {};
  const imp = data.impact || {};
  const eq = data.equipe || {};

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Teaser — ${h.entreprise || ""}</title>
<style>
  :root { --primary: #1a365d; --accent: #2b6cb0; --success: #276749; --gray: #4a5568; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Segoe UI", system-ui, sans-serif; font-size: 9pt; line-height: 1.5; color: #2d3748; }
  .page { width: 210mm; min-height: 297mm; max-height: 297mm; overflow: hidden; margin: 0 auto; padding: 20px 28px; background: white; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid var(--primary); padding-bottom: 12px; margin-bottom: 14px; }
  .header-left h1 { font-size: 18pt; color: var(--primary); font-weight: 700; }
  .header-left .sector { font-size: 10pt; color: var(--accent); font-weight: 600; }
  .header-right { text-align: right; font-size: 8pt; color: var(--gray); }
  .score-pill { display: inline-block; background: var(--primary); color: white; padding: 4px 14px; border-radius: 20px; font-size: 11pt; font-weight: 700; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .full { grid-column: 1 / -1; }
  .block { background: #f7fafc; border-radius: 6px; padding: 10px 14px; border-left: 3px solid var(--accent); }
  .block h3 { font-size: 9pt; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 700; }
  .block p { margin: 3px 0; }
  .block .metric { font-weight: 700; color: var(--primary); }
  .value-prop { background: linear-gradient(135deg, var(--primary), #2c5282); color: white; border-radius: 8px; padding: 14px 20px; text-align: center; font-size: 11pt; font-weight: 600; grid-column: 1 / -1; }
  .highlights { grid-column: 1 / -1; }
  .highlights ul { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; list-style: none; }
  .highlights li { padding: 3px 0 3px 16px; position: relative; font-size: 8.5pt; }
  .highlights li::before { content: "✓"; position: absolute; left: 0; color: var(--success); font-weight: 700; }
  .snapshot { display: flex; justify-content: space-between; background: var(--primary); color: white; border-radius: 6px; padding: 10px 16px; grid-column: 1 / -1; }
  .snapshot .item { text-align: center; }
  .snapshot .item .val { font-size: 11pt; font-weight: 700; }
  .snapshot .item .lbl { font-size: 7pt; opacity: 0.8; text-transform: uppercase; }
  .footer { margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7.5pt; color: var(--gray); }
  .footer .conf { font-weight: 600; }
  @media print { .page { box-shadow: none; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <h1>${h.entreprise || ""}</h1>
      <div class="sector">${h.secteur || ""} — ${h.pays || ""}</div>
    </div>
    <div class="header-right">
      <div>Opportunité d'investissement</div>
      <div>${h.date || ""}</div>
      <div class="score-pill">${data.score_ir || "—"}/100</div>
    </div>
  </div>
  <div class="grid">
    <div class="value-prop">${data.proposition_valeur || ""}</div>
    <div class="snapshot">
      <div class="item"><div class="val">${sn.date_creation || "—"}</div><div class="lbl">Création</div></div>
      <div class="item"><div class="val">${sn.effectif || "—"}</div><div class="lbl">Effectif</div></div>
      <div class="item"><div class="val">${sn.ca_dernier_exercice || "—"}</div><div class="lbl">CA</div></div>
      <div class="item"><div class="val">${sn.croissance_ca || "—"}</div><div class="lbl">Croissance</div></div>
      <div class="item"><div class="val">${sn.ebitda_marge || "—"}</div><div class="lbl">EBITDA</div></div>
    </div>
    <div class="block">
      <h3>Problème</h3>
      <p>${ps.probleme || ""}</p>
    </div>
    <div class="block">
      <h3>Solution</h3>
      <p>${ps.solution || ""}</p>
    </div>
    <div class="block">
      <h3>Marché</h3>
      <p><span class="metric">TAM :</span> ${m.tam || ""}</p>
      <p><span class="metric">SAM :</span> ${m.sam || ""}</p>
      <p><span class="metric">Croissance :</span> ${m.croissance || ""}</p>
    </div>
    <div class="block">
      <h3>Traction</h3>
      <p><span class="metric">Clients :</span> ${t.clients || ""}</p>
      <p><span class="metric">Revenus :</span> ${t.revenus || ""}</p>
      <p><span class="metric">Croissance :</span> ${t.croissance || ""}</p>
    </div>
    <div class="block">
      <h3>Financement recherché</h3>
      <p class="metric" style="font-size:12pt;">${f.besoin_financement || "À déterminer"}</p>
      <p>${f.utilisation || ""}</p>
      <p style="font-size:8pt;color:var(--gray)">Projection Y5 : ${f.projection_5ans || "—"}</p>
    </div>
    <div class="block">
      <h3>Impact & ODD</h3>
      <p><strong>${imp.impact_cle || ""}</strong></p>
      ${(imp.odd_principaux || []).map((o: string) => `<p style="font-size:8pt;">• ${o}</p>`).join("")}
    </div>
    <div class="highlights block">
      <h3>Points forts</h3>
      <ul>${(data.points_forts || []).map((p: string) => `<li>${p}</li>`).join("")}</ul>
    </div>
    <div class="block full">
      <h3>Équipe</h3>
      <p><strong>${eq.fondateur || ""}</strong></p>
      <p>${eq.equipe_cle || ""}</p>
    </div>
  </div>
  <div class="footer">
    <div class="conf">${h.classification || "Confidentiel"}</div>
    <div>Généré par ESONO Investment Readiness Platform</div>
    <div>${(data.contact || {}).email || ""}</div>
  </div>
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
    const { supabase, enterprise, enterprise_id, deliverableMap } = ctx;

    // Check that we have minimum data to generate a meaningful memo
    const hasMinimumData = deliverableMap["bmc_analysis"] || deliverableMap["inputs_data"] || deliverableMap["framework_data"];
    if (!hasMinimumData) {
      return errorResponse(
        "Données insuffisantes — générez au moins le BMC ou le Framework financier avant le memo d'investissement.",
        400
      );
    }

    // Build RAG context
    const ragContext = await buildRAGContext(
      supabase,
      enterprise.country || "Côte d'Ivoire",
      enterprise.sector || "",
      ["investment_readiness", "financial_analysis", "esg", "market_analysis"]
    );

    console.log(`[generate-investment-memo] Generating for ${enterprise.name} (${enterprise_id})`);

    // ── STEP 1: Generate Investment Memo ──
    const memoData = await callAI(
      MEMO_SYSTEM_PROMPT,
      buildMemoPrompt(ctx, ragContext),
      16384
    );
    console.log(`[generate-investment-memo] Memo generated, score: ${memoData.score}`);

    // ── STEP 2: Generate One-Pager from Memo data ──
    const onepagerData = await callAI(
      ONEPAGER_SYSTEM_PROMPT,
      buildOnepagerPrompt(ctx, memoData),
      4096
    );
    console.log(`[generate-investment-memo] One-pager generated`);

    // ── STEP 3: Generate HTML renderings ──
    const memoHtml = generateMemoHtml(memoData);
    const onepagerHtml = generateOnepagerHtml(onepagerData);

    // ── STEP 4: Save combined deliverable ──
    const combinedData = {
      memo: memoData,
      onepager: onepagerData,
      memo_html: memoHtml,
      onepager_html: onepagerHtml,
      score: memoData.score || onepagerData.score_ir || 0,
      metadata: {
        generated_at: new Date().toISOString(),
        version: "1.0",
        modules_used: Object.keys(deliverableMap).filter(
          (k) => deliverableMap[k] && Object.keys(deliverableMap[k]).length > 0
        ),
      },
    };

    await saveDeliverable(
      supabase,
      enterprise_id,
      "investment_memo",
      combinedData,
      "investment_memo",
      memoHtml
    );

    // ── STEP 5: Also store one-pager separately ──
    await supabase.from("deliverables").upsert({
      enterprise_id,
      type: "onepager",
      data: onepagerData,
      score: onepagerData.score_ir || memoData.score || null,
      html_content: onepagerHtml,
      ai_generated: true,
      version: 1,
    }, { onConflict: "enterprise_id,type" });

    return jsonResponse({
      success: true,
      score: memoData.score,
    });
  } catch (e: any) {
    console.error("[generate-investment-memo] Error:", e);
    if (e.status) return errorResponse(e.message, e.status);
    return errorResponse(e.message || "Erreur interne", 500);
  }
});
