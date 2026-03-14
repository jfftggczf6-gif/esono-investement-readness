import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, errorResponse, jsonResponse,
  verifyAndGetContext, callAI, saveDeliverable,
  buildRAGContext, getFiscalParams,
} from "../_shared/helpers.ts";
import { normalizeInputs } from "../_shared/normalizers.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Reconstruction mode: works with ANY textual document fragments.
// Accepts: CSV, TXT, XLSX-extracted text, readable PDF, DOCX.
// Does NOT attempt OCR — images are noted but not parsed.
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un analyste financier expert en reconstitution de données PME africaines (zones UEMOA/CEMAC, SYSCOHADA révisé 2017).

CONTEXTE: La PME n'a pas de comptabilité formelle. Tu reçois des FRAGMENTS documentaires (relevés bancaires partiels, factures éparses, listes de clients, notes internes, exports Excel incomplets).

TA MISSION:
1. Identifier chaque fragment et la donnée financière qu'il permet d'estimer
2. Reconstituer les états financiers avec un niveau de confiance par donnée (0-100%)
3. Documenter clairement chaque hypothèse utilisée
4. NE PAS inventer de données sans base documentaire — si tu ne peux pas estimer, mets 0

RÈGLES DE RECONSTRUCTION:
- Relevés bancaires → Estimer le CA annuel (total crédits - virements internes, × annualisation)
- Factures → Estimer CA minimum (somme factures trouvées, noter période couverte)
- Liste clients/commandes → Estimer CA moyen par client × nombre de clients
- Charges: utiliser les benchmarks sectoriels africains si aucun document disponible (marquer estimated:true)
- Toujours indiquer la source de chaque estimation

OUTPUT: Même structure que inputs_data + reconstruction_report détaillé.

IMPORTANT: Réponds UNIQUEMENT en JSON valide. Pas de markdown, pas d'explication hors JSON.`;

const buildPrompt = (
  name: string,
  sector: string,
  country: string,
  docs: string,
  ragContext: string,
  fiscalParams: any,
  wizardData: any
) => `
Reconstitue les données financières de "${name}" (Secteur: ${sector}, Pays: ${country}).

${wizardData ? `DONNÉES SAISIES PAR L'ENTREPRENEUR (à croiser avec les documents):\n${JSON.stringify(wizardData, null, 2)}\n` : ""}

FRAGMENTS DOCUMENTAIRES DISPONIBLES:
${docs || "AUCUN DOCUMENT — utiliser uniquement les benchmarks sectoriels et les données déclaratives si présentes."}

${ragContext}

PARAMÈTRES FISCAUX ${country}:
${JSON.stringify(fiscalParams)}

Analyse chaque fragment et reconstitue ce JSON:
{
  "score": <0-100: confiance globale dans la reconstruction>,
  "periode": "<exercice estimé ex: Exercice 2024>",
  "devise": "FCFA",
  "fiabilite": "<Élevée|Moyenne|Faible>",
  "source_documents": ["<fichiers analysés>"],

  "compte_resultat": {
    "chiffre_affaires": <number>,
    "achats_matieres": <number>,
    "charges_personnel": <number>,
    "charges_externes": <number>,
    "dotations_amortissements": <number>,
    "resultat_exploitation": <number>,
    "charges_financieres": <number>,
    "resultat_net": <number>
  },

  "bilan": {
    "actif": {
      "immobilisations": <number>,
      "stocks": <number>,
      "creances_clients": <number>,
      "tresorerie": <number>,
      "total_actif": <number>
    },
    "passif": {
      "capitaux_propres": <number>,
      "dettes_lt": <number>,
      "dettes_ct": <number>,
      "fournisseurs": <number>,
      "total_passif": <number>
    }
  },

  "effectifs": {
    "total": <number>,
    "cadres": <number>,
    "employes": <number>
  },

  "kpis": {
    "marge_brute_pct": "<xx%>",
    "marge_nette_pct": "<xx%>",
    "ratio_endettement_pct": "<xx%>"
  },

  "donnees_manquantes": ["<donnée non reconstituable>"],
  "hypotheses": ["<hypothèse utilisée>"],

  "reconstruction_report": {
    "method": "Trace-based reconstruction",
    "data_sources": ["<fichiers ou fragments utilisés>"],
    "confidence_by_field": {
      "chiffre_affaires": { "confidence": <0-100>, "source": "<d'où vient cette valeur>", "estimated": <true|false> },
      "achats_matieres":  { "confidence": <0-100>, "source": "<...>", "estimated": <true|false> },
      "charges_personnel":{ "confidence": <0-100>, "source": "<...>", "estimated": <true|false> },
      "charges_externes": { "confidence": <0-100>, "source": "<...>", "estimated": <true|false> },
      "tresorerie":       { "confidence": <0-100>, "source": "<...>", "estimated": <true|false> },
      "capitaux_propres": { "confidence": <0-100>, "source": "<...>", "estimated": <true|false> }
    },
    "assumptions": ["<hypothèse explicite utilisée>"],
    "missing_data": ["<donnée non reconstituable même partiellement>"],
    "reconstruction_quality": "<Bonne|Partielle|Limitée>",
    "analyst_note": "<Note de l'analyste sur la qualité globale de la reconstruction>"
  }
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ctx = await verifyAndGetContext(req);
    const ent = ctx.enterprise;

    // Optional: wizard data passed in request body for cross-referencing
    let wizardData: any = null;
    try {
      const body = await req.json().catch(() => ({}));
      wizardData = body.wizard_data || null;
    } catch (_) { /* no body */ }

    const fiscalParams = getFiscalParams(ent.country || "Côte d'Ivoire");
    const ragContext = await buildRAGContext(
      ctx.supabase,
      ent.country || "",
      ent.sector || "",
      ["benchmarks", "fiscal", "secteur"]
    );

    const prompt = buildPrompt(
      ent.name,
      ent.sector || "",
      ent.country || "",
      ctx.documentContent,
      ragContext,
      fiscalParams,
      wizardData
    );

    const rawData = await callAI(SYSTEM_PROMPT, prompt, 12288);

    // Normalize to inputs_data compatible structure
    const normalized = normalizeInputs(rawData);

    // Preserve reconstruction_report from raw AI output
    const reconstructionReport = rawData.reconstruction_report || null;

    const finalData = {
      ...normalized,
      source: 'reconstruction',
      reconstruction_report: reconstructionReport,
    };

    // Save as inputs_data (same type — pipeline reuses it)
    await saveDeliverable(ctx.supabase, ctx.enterprise_id, "inputs_data", finalData, "inputs");

    return jsonResponse({
      success: true,
      data: finalData,
      score: finalData.score,
      reconstruction_report: reconstructionReport,
    });
  } catch (e: any) {
    console.error("reconstruct-from-traces error:", e);
    return errorResponse(e.message || "Erreur inconnue", e.status || 500);
  }
});
