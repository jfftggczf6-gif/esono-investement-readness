import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, errorResponse, jsonResponse,
  verifyAndGetContext, callAI, saveDeliverable,
  buildRAGContext,
} from "../_shared/helpers.ts";

// ─────────────────────────────────────────────────────────────────────────────
// generate-pitch-deck
// Requires: bmc_analysis OR plan_ovo OR investment_memo (at least one)
// Produces: 12-slide pitch deck (JSON + HTML navigable)
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un expert en pitch de startups et PME africaines pour des fonds d'impact (IFC, AfDB, Proparco, Enabel, Partech Africa).
Tu rédiges des pitch decks professionnels, percutants, adaptés aux comités d'investissement.

STRUCTURE OBLIGATOIRE: 12 slides précises. Chaque slide a un rôle unique.
STYLE: Direct, chiffré, sans jargon. Phrases courtes. Données avant narratif.
ADAPTÉ AFRIQUE: Contexte FCFA, marché local, ODD, impact mesurable.

IMPORTANT: Réponds UNIQUEMENT en JSON valide. Pas de markdown. Pas de commentaires hors JSON.`;

const buildPrompt = (
  ent: any,
  bmc: any,
  planOvo: any,
  investmentMemo: any,
  gapAnalysis: any,
  ragContext: string,
  baseYear: number
) => {
  const memoData = investmentMemo?.memo || investmentMemo || {};
  const ovoData = planOvo || {};

  return `
Génère un pitch deck complet pour la PME suivante:
Nom: ${ent.name}
Secteur: ${ent.sector || 'Non précisé'}
Pays: ${ent.country || 'Afrique'}
Année de référence: ${baseYear}

${bmc?.canvas ? `BMC:\n${JSON.stringify(bmc.canvas, null, 2)}\n` : ''}
${memoData?.resume_executif ? `Résumé exécutif (Investment Memo):\n${JSON.stringify(memoData.resume_executif, null, 2)}\n` : ''}
${memoData?.deal_structure ? `Structure deal:\n${JSON.stringify(memoData.deal_structure, null, 2)}\n` : ''}
${ovoData?.scenarios ? `Scénarios financiers:\n${JSON.stringify(ovoData.scenarios, null, 2)}\n` : ''}
${gapAnalysis?.readiness_pathway ? `Readiness Pathway:\n${JSON.stringify(gapAnalysis.readiness_pathway, null, 2)}\n` : ''}

${ragContext}

Retourne EXACTEMENT ce JSON avec 12 slides:
{
  "slides": [
    {
      "id": 1,
      "title": "Cover",
      "layout": "cover",
      "content": {
        "company_name": "<nom>",
        "tagline": "<phrase d'accroche 10 mots max>",
        "sector": "<secteur>",
        "country": "<pays>",
        "founded": "<année de création ou N/A>",
        "headline_metric": "<1 chiffre clé ex: 850M FCFA de CA>",
        "contact": "<email ou site>"
      }
    },
    {
      "id": 2,
      "title": "Le Problème",
      "layout": "problem",
      "content": {
        "problem_statement": "<1-2 phrases, problème marché>",
        "pain_points": ["<douleur 1>", "<douleur 2>", "<douleur 3>"],
        "market_gap": "<opportunité manquée>",
        "affected_population": "<qui est impacté et combien>"
      }
    },
    {
      "id": 3,
      "title": "Notre Solution",
      "layout": "solution",
      "content": {
        "value_proposition": "<proposition de valeur en 1 phrase>",
        "how_it_works": "<description courte du produit/service>",
        "key_differentiators": ["<différenciateur 1>", "<différenciateur 2>", "<différenciateur 3>"],
        "unfair_advantage": "<avantage concurrentiel durable>"
      }
    },
    {
      "id": 4,
      "title": "Marché",
      "layout": "market",
      "content": {
        "tam": "<Total Addressable Market en FCFA ou USD>",
        "sam": "<Serviceable Addressable Market>",
        "som": "<Serviceable Obtainable Market (objectif 3 ans)>",
        "growth_rate": "<croissance annuelle du marché %>",
        "geography": "<zones géographiques ciblées>",
        "market_trend": "<tendance favorable>"
      }
    },
    {
      "id": 5,
      "title": "Modèle Économique",
      "layout": "business_model",
      "content": {
        "revenue_streams": ["<source de revenus 1>", "<source de revenus 2>"],
        "pricing": "<modèle de pricing>",
        "unit_economics": {
          "revenue_per_client": "<CA moyen par client>",
          "cogs_per_unit": "<coût variable par unité>",
          "gross_margin": "<marge brute %>",
          "cac": "<coût d'acquisition client>",
          "ltv": "<valeur vie client>"
        },
        "scalability": "<comment le modèle passe à l'échelle>"
      }
    },
    {
      "id": 6,
      "title": "Traction",
      "layout": "traction",
      "content": {
        "revenue_current": "<CA actuel>",
        "revenue_growth_yoy": "<croissance YoY %>",
        "clients_count": "<nombre de clients>",
        "key_milestones": [
          { "date": "<date>", "milestone": "<réalisation>" },
          { "date": "<date>", "milestone": "<réalisation>" },
          { "date": "<date>", "milestone": "<réalisation>" }
        ],
        "partnerships": ["<partenaire stratégique 1>", "<partenaire 2>"],
        "nps_or_retention": "<satisfaction client ou taux de rétention si disponible>"
      }
    },
    {
      "id": 7,
      "title": "Roadmap",
      "layout": "roadmap",
      "content": {
        "next_quarters": [
          { "period": "T+1 (0-3 mois)", "objectives": ["<objectif 1>", "<objectif 2>"] },
          { "period": "T+2 (3-6 mois)", "objectives": ["<objectif 1>", "<objectif 2>"] },
          { "period": "T+3 (6-12 mois)", "objectives": ["<objectif 1>", "<objectif 2>"] }
        ],
        "use_of_funds_milestone": "<ce que le financement permettra d'atteindre>"
      }
    },
    {
      "id": 8,
      "title": "Équipe",
      "layout": "team",
      "content": {
        "founders": [
          { "name": "<Fondateur 1>", "role": "<titre>", "background": "<1 ligne>", "key_skill": "<compétence clé>" },
          { "name": "<Fondateur 2 si existant>", "role": "<titre>", "background": "<1 ligne>", "key_skill": "<compétence clé>" }
        ],
        "team_size": "<nombre total d'employés>",
        "key_advisors": ["<advisor 1>", "<advisor 2>"],
        "team_strength": "<pourquoi cette équipe est la bonne pour ce marché>"
      }
    },
    {
      "id": 9,
      "title": "Analyse Financière",
      "layout": "financials",
      "content": {
        "historical": {
          "revenue_n_minus_1": "<CA N-1>",
          "revenue_n": "<CA N (actuel)>",
          "ebitda_margin": "<marge EBITDA %>",
          "net_result": "<résultat net>"
        },
        "projections": {
          "revenue_y1": "<projection année 1>",
          "revenue_y2": "<projection année 2>",
          "revenue_y3": "<projection année 3>",
          "break_even": "<point mort prévu>"
        },
        "key_ratios": {
          "gross_margin": "<marge brute %>",
          "debt_equity": "<ratio dettes/capitaux propres>",
          "cash_position": "<trésorerie actuelle>"
        }
      }
    },
    {
      "id": 10,
      "title": "Impact ESG",
      "layout": "esg",
      "content": {
        "impact_headline": "<impact principal en 1 phrase>",
        "sdg_aligned": ["<ODD n°X: titre>", "<ODD n°Y: titre>"],
        "impact_metrics": [
          { "metric": "<indicateur>", "current_value": "<valeur actuelle>", "target_3y": "<objectif 3 ans>" },
          { "metric": "<indicateur 2>", "current_value": "<valeur>", "target_3y": "<objectif>" }
        ],
        "environmental_footprint": "<empreinte environnementale ou engagement>",
        "social_impact": "<impact social mesurable>",
        "governance": "<niveau de gouvernance (conseil, audit, reporting)>"
      }
    },
    {
      "id": 11,
      "title": "Opportunité d'Investissement",
      "layout": "deal",
      "content": {
        "amount_sought": "<montant recherché en FCFA ou USD>",
        "instrument": "<type: equity / quasi-equity / dette / grant / mixte>",
        "pre_money_valuation": "<valorisation pré-money si equity>",
        "equity_offered": "<% offert si equity>",
        "use_of_funds": [
          { "category": "<usage 1>", "amount": "<montant>", "percentage": "<% du total>" },
          { "category": "<usage 2>", "amount": "<montant>", "percentage": "<% du total>" },
          { "category": "<usage 3>", "amount": "<montant>", "percentage": "<% du total>" }
        ],
        "expected_irr": "<TRI attendu pour l'investisseur>",
        "exit_strategy": "<stratégie de sortie prévue>",
        "investor_type_targeted": "<type d'investisseur cible>"
      }
    },
    {
      "id": 12,
      "title": "Prochaines Étapes",
      "layout": "cta",
      "content": {
        "ask": "<ce que vous demandez concrètement à l'investisseur>",
        "next_steps": ["<étape 1>", "<étape 2>", "<étape 3>"],
        "contact_name": "<nom du contact>",
        "contact_email": "<email>",
        "contact_phone": "<téléphone>",
        "closing_statement": "<phrase de clôture percutante>"
      }
    }
  ],
  "metadata": {
    "generated_at": "${new Date().toISOString()}",
    "total_slides": 12,
    "company_name": "${ent.name}",
    "sector": "${ent.sector || ''}",
    "country": "${ent.country || ''}"
  },
  "score": <0-100: qualité et complétude des données disponibles pour le pitch>
}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// HTML Generator — navigable presentation
// ─────────────────────────────────────────────────────────────────────────────
function generatePitchDeckHtml(data: any, ent: any): string {
  const slides = data.slides || [];
  const companyName = ent.name || data.metadata?.company_name || 'Entreprise';
  const sector = ent.sector || data.metadata?.sector || '';

  const slideHtmlMap: Record<string, (slide: any) => string> = {
    cover: (s) => `
      <div class="slide-inner cover-slide">
        <div class="cover-bg"></div>
        <div class="cover-content">
          <div class="company-badge">${s.content.sector || sector}</div>
          <h1 class="company-name">${s.content.company_name}</h1>
          <p class="tagline">${s.content.tagline}</p>
          ${s.content.headline_metric ? `<div class="headline-metric">${s.content.headline_metric}</div>` : ''}
          <div class="cover-meta">
            <span>${s.content.country || ''}</span>
            ${s.content.founded && s.content.founded !== 'N/A' ? `<span>Fondée en ${s.content.founded}</span>` : ''}
          </div>
        </div>
      </div>`,
    problem: (s) => `
      <div class="slide-inner">
        <div class="slide-header"><span class="slide-num">02</span><h2>${s.title}</h2></div>
        <p class="slide-lead">${s.content.problem_statement}</p>
        <div class="pain-points">
          ${(s.content.pain_points || []).map((p: string) => `<div class="pain-item"><span class="pain-icon">⚠</span><span>${p}</span></div>`).join('')}
        </div>
        ${s.content.affected_population ? `<div class="stat-box"><span class="stat-label">Population concernée</span><span class="stat-val">${s.content.affected_population}</span></div>` : ''}
      </div>`,
    solution: (s) => `
      <div class="slide-inner">
        <div class="slide-header"><span class="slide-num">03</span><h2>${s.title}</h2></div>
        <div class="value-prop-box">${s.content.value_proposition}</div>
        <p class="slide-desc">${s.content.how_it_works}</p>
        <div class="differentiators">
          ${(s.content.key_differentiators || []).map((d: string, i: number) => `<div class="diff-item"><span class="diff-num">${i + 1}</span><span>${d}</span></div>`).join('')}
        </div>
      </div>`,
    market: (s) => `
      <div class="slide-inner">
        <div class="slide-header"><span class="slide-num">04</span><h2>${s.title}</h2></div>
        <div class="market-circles">
          <div class="market-circle tam"><span class="market-label">TAM</span><span class="market-val">${s.content.tam}</span></div>
          <div class="market-circle sam"><span class="market-label">SAM</span><span class="market-val">${s.content.sam}</span></div>
          <div class="market-circle som"><span class="market-label">SOM</span><span class="market-val">${s.content.som}</span></div>
        </div>
        <p class="market-trend">📈 ${s.content.growth_rate} — ${s.content.market_trend}</p>
      </div>`,
    business_model: (s) => `
      <div class="slide-inner">
        <div class="slide-header"><span class="slide-num">05</span><h2>${s.title}</h2></div>
        <div class="bm-grid">
          <div class="bm-col">
            <p class="bm-label">Sources de revenus</p>
            ${(s.content.revenue_streams || []).map((r: string) => `<div class="bm-item">💰 ${r}</div>`).join('')}
            <p class="bm-label mt">Pricing</p>
            <div class="bm-item">${s.content.pricing}</div>
          </div>
          <div class="bm-col">
            <p class="bm-label">Économie unitaire</p>
            ${s.content.unit_economics ? Object.entries(s.content.unit_economics).map(([k, v]) => `<div class="unit-row"><span>${k}</span><span class="unit-val">${v}</span></div>`).join('') : ''}
          </div>
        </div>
      </div>`,
    traction: (s) => `
      <div class="slide-inner">
        <div class="slide-header"><span class="slide-num">06</span><h2>${s.title}</h2></div>
        <div class="traction-stats">
          <div class="tstat"><div class="tstat-val">${s.content.revenue_current}</div><div class="tstat-label">CA actuel</div></div>
          <div class="tstat"><div class="tstat-val">${s.content.revenue_growth_yoy}</div><div class="tstat-label">Croissance YoY</div></div>
          <div class="tstat"><div class="tstat-val">${s.content.clients_count}</div><div class="tstat-label">Clients</div></div>
        </div>
        <div class="milestones">
          ${(s.content.key_milestones || []).map((m: any) => `<div class="milestone"><span class="m-date">${m.date}</span><span class="m-text">${m.milestone}</span></div>`).join('')}
        </div>
      </div>`,
    roadmap: (s) => `
      <div class="slide-inner">
        <div class="slide-header"><span class="slide-num">07</span><h2>${s.title}</h2></div>
        <div class="roadmap-cols">
          ${(s.content.next_quarters || []).map((q: any) => `
            <div class="roadmap-quarter">
              <div class="q-period">${q.period}</div>
              ${(q.objectives || []).map((o: string) => `<div class="q-obj">→ ${o}</div>`).join('')}
            </div>`).join('')}
        </div>
        ${s.content.use_of_funds_milestone ? `<div class="funds-goal">🎯 ${s.content.use_of_funds_milestone}</div>` : ''}
      </div>`,
    team: (s) => `
      <div class="slide-inner">
        <div class="slide-header"><span class="slide-num">08</span><h2>${s.title}</h2></div>
        <div class="team-grid">
          ${(s.content.founders || []).filter((f: any) => f.name && f.name !== 'N/A').map((f: any) => `
            <div class="founder-card">
              <div class="founder-avatar">${(f.name || 'X').charAt(0)}</div>
              <div class="founder-name">${f.name}</div>
              <div class="founder-role">${f.role}</div>
              <div class="founder-bg">${f.background}</div>
              <div class="founder-skill">⭐ ${f.key_skill}</div>
            </div>`).join('')}
        </div>
        <div class="team-summary">Équipe de ${s.content.team_size} · ${s.content.team_strength}</div>
      </div>`,
    financials: (s) => `
      <div class="slide-inner">
        <div class="slide-header"><span class="slide-num">09</span><h2>${s.title}</h2></div>
        <div class="fin-grid">
          <div class="fin-col">
            <p class="fin-label">Historique</p>
            <div class="fin-row"><span>CA N-1</span><span>${s.content.historical?.revenue_n_minus_1 || '—'}</span></div>
            <div class="fin-row"><span>CA N</span><span>${s.content.historical?.revenue_n || '—'}</span></div>
            <div class="fin-row"><span>Marge EBITDA</span><span>${s.content.historical?.ebitda_margin || '—'}</span></div>
          </div>
          <div class="fin-col">
            <p class="fin-label">Projections</p>
            <div class="fin-row"><span>Année 1</span><span class="green">${s.content.projections?.revenue_y1 || '—'}</span></div>
            <div class="fin-row"><span>Année 2</span><span class="green">${s.content.projections?.revenue_y2 || '—'}</span></div>
            <div class="fin-row"><span>Année 3</span><span class="green">${s.content.projections?.revenue_y3 || '—'}</span></div>
          </div>
        </div>
      </div>`,
    esg: (s) => `
      <div class="slide-inner">
        <div class="slide-header"><span class="slide-num">10</span><h2>${s.title}</h2></div>
        <div class="impact-headline">${s.content.impact_headline}</div>
        <div class="sdg-badges">
          ${(s.content.sdg_aligned || []).map((sdg: string) => `<span class="sdg-badge">${sdg}</span>`).join('')}
        </div>
        <div class="impact-metrics">
          ${(s.content.impact_metrics || []).map((m: any) => `
            <div class="impact-row">
              <span class="impact-metric">${m.metric}</span>
              <span class="impact-now">${m.current_value}</span>
              <span class="impact-arrow">→</span>
              <span class="impact-target">${m.target_3y}</span>
            </div>`).join('')}
        </div>
      </div>`,
    deal: (s) => `
      <div class="slide-inner">
        <div class="slide-header"><span class="slide-num">11</span><h2>${s.title}</h2></div>
        <div class="deal-header">
          <div class="deal-amount">${s.content.amount_sought}</div>
          <div class="deal-instrument">${s.content.instrument}</div>
          ${s.content.pre_money_valuation ? `<div class="deal-val">Valorisation pré-money : ${s.content.pre_money_valuation}</div>` : ''}
        </div>
        <p class="fin-label" style="margin:12px 0 6px">Utilisation des fonds</p>
        <div class="use-of-funds">
          ${(s.content.use_of_funds || []).map((u: any) => `
            <div class="fund-item">
              <div class="fund-bar" style="width:${u.percentage}"></div>
              <span>${u.category}</span>
              <span class="fund-pct">${u.percentage}</span>
            </div>`).join('')}
        </div>
      </div>`,
    cta: (s) => `
      <div class="slide-inner cta-slide">
        <div class="slide-header"><span class="slide-num">12</span><h2>${s.title}</h2></div>
        <div class="ask-box">${s.content.ask}</div>
        <div class="next-steps">
          ${(s.content.next_steps || []).map((ns: string, i: number) => `
            <div class="next-step"><span class="ns-num">${i + 1}</span><span>${ns}</span></div>`).join('')}
        </div>
        <div class="contact-info">
          ${s.content.contact_name ? `<div>👤 ${s.content.contact_name}</div>` : ''}
          ${s.content.contact_email ? `<div>✉ ${s.content.contact_email}</div>` : ''}
        </div>
        <div class="closing">${s.content.closing_statement}</div>
      </div>`,
  };

  const slidesHtml = slides.map((slide: any, index: number) => {
    const renderer = slideHtmlMap[slide.layout] || ((s: any) => `<div class="slide-inner"><h2>${s.title}</h2><pre>${JSON.stringify(s.content, null, 2)}</pre></div>`);
    return `<div class="slide" id="slide-${index + 1}" data-slide="${index + 1}">${renderer(slide)}</div>`;
  }).join('\n');

  const thumbnails = slides.map((s: any, i: number) => `
    <div class="thumb" data-target="${i + 1}" onclick="goTo(${i + 1})">
      <span class="thumb-num">${i + 1}</span>
      <span class="thumb-title">${s.title}</span>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Pitch Deck — ${companyName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: #0f172a; color: #1e293b; display: flex; height: 100vh; overflow: hidden; }

  /* Sidebar */
  #sidebar { width: 180px; background: #1e293b; overflow-y: auto; flex-shrink: 0; padding: 12px 0; }
  .sidebar-header { padding: 8px 12px 12px; border-bottom: 1px solid #334155; margin-bottom: 8px; }
  .sidebar-header h3 { font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em; text-transform: uppercase; }
  .sidebar-header p { font-size: 10px; color: #64748b; margin-top: 2px; }
  .thumb { padding: 8px 12px; cursor: pointer; border-left: 3px solid transparent; transition: all 0.15s; }
  .thumb:hover { background: #334155; }
  .thumb.active { background: #1d4ed8; border-left-color: #3b82f6; }
  .thumb-num { display: block; font-size: 9px; color: #94a3b8; font-weight: 700; }
  .thumb.active .thumb-num { color: #bfdbfe; }
  .thumb-title { font-size: 10px; color: #e2e8f0; font-weight: 500; }

  /* Main area */
  #main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  #viewer { flex: 1; overflow: hidden; position: relative; background: #f8fafc; }
  .slide { display: none; width: 100%; height: 100%; padding: 0; }
  .slide.active { display: flex; align-items: stretch; }
  .slide-inner { width: 100%; padding: 40px 56px; display: flex; flex-direction: column; justify-content: center; max-height: 100%; overflow-y: auto; }

  /* Controls */
  #controls { background: #1e293b; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  #controls button { background: #334155; color: #e2e8f0; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; }
  #controls button:hover { background: #475569; }
  #controls button:disabled { opacity: 0.3; cursor: not-allowed; }
  #slide-counter { color: #94a3b8; font-size: 12px; }
  #fullscreen-btn { background: #1d4ed8 !important; }

  /* Cover slide */
  .cover-slide { background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 60%, #064e3b 100%); color: white; min-height: 100%; justify-content: center; align-items: center; text-align: center; padding: 60px; }
  .cover-slide .cover-bg { position: absolute; inset: 0; background: url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='g' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M60 0L0 0 0 60' fill='none' stroke='rgba(255,255,255,0.03)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3C/svg%3E"); }
  .cover-slide .cover-content { position: relative; z-index: 1; }
  .company-badge { display: inline-block; padding: 4px 14px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); border-radius: 100px; font-size: 11px; font-weight: 600; color: #bfdbfe; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 20px; }
  .company-name { font-size: 52px; font-weight: 900; color: white; letter-spacing: -0.02em; line-height: 1; }
  .tagline { font-size: 20px; color: rgba(255,255,255,0.7); margin-top: 16px; font-weight: 300; }
  .headline-metric { margin-top: 24px; font-size: 28px; font-weight: 800; color: #34d399; }
  .cover-meta { margin-top: 20px; display: flex; gap: 20px; justify-content: center; font-size: 13px; color: rgba(255,255,255,0.5); }

  /* Slide header */
  .slide-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0; flex-shrink: 0; }
  .slide-num { font-size: 11px; font-weight: 800; color: #1d4ed8; letter-spacing: 0.1em; background: #eff6ff; padding: 3px 8px; border-radius: 4px; }
  .slide-header h2 { font-size: 26px; font-weight: 800; color: #0f172a; }
  .slide-lead { font-size: 18px; color: #334155; font-weight: 500; margin-bottom: 20px; line-height: 1.5; }
  .slide-desc { font-size: 14px; color: #64748b; margin-bottom: 16px; line-height: 1.6; }

  /* Problem */
  .pain-points { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
  .pain-item { display: flex; align-items: flex-start; gap: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; font-size: 14px; color: #991b1b; }
  .pain-icon { font-size: 16px; flex-shrink: 0; }
  .stat-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px 16px; font-size: 14px; color: #166534; }
  .stat-label { font-weight: 600; }
  .stat-val { font-size: 18px; font-weight: 800; display: block; margin-top: 4px; }

  /* Solution */
  .value-prop-box { background: #1e3a8a; color: white; border-radius: 12px; padding: 20px 24px; font-size: 18px; font-weight: 700; margin-bottom: 20px; line-height: 1.4; }
  .differentiators { display: flex; flex-direction: column; gap: 10px; }
  .diff-item { display: flex; align-items: center; gap: 12px; font-size: 14px; }
  .diff-num { width: 28px; height: 28px; background: #1d4ed8; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }

  /* Market */
  .market-circles { display: flex; gap: 20px; margin-bottom: 20px; }
  .market-circle { flex: 1; border-radius: 12px; padding: 20px; text-align: center; border: 2px solid; }
  .market-circle.tam { background: #eff6ff; border-color: #bfdbfe; }
  .market-circle.sam { background: #f0fdf4; border-color: #86efac; }
  .market-circle.som { background: #fefce8; border-color: #fde68a; }
  .market-label { display: block; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: #64748b; text-transform: uppercase; }
  .market-val { display: block; font-size: 15px; font-weight: 700; margin-top: 6px; color: #0f172a; }
  .market-trend { font-size: 14px; color: #166534; background: #f0fdf4; border-radius: 8px; padding: 10px 14px; }

  /* Business model */
  .bm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .bm-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.08em; margin-bottom: 8px; }
  .bm-label.mt { margin-top: 14px; }
  .bm-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; font-size: 13px; color: #334155; margin-bottom: 6px; }
  .unit-row { display: flex; justify-content: space-between; font-size: 12px; padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
  .unit-val { font-weight: 600; color: #1d4ed8; }

  /* Traction */
  .traction-stats { display: flex; gap: 20px; margin-bottom: 24px; }
  .tstat { flex: 1; text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
  .tstat-val { font-size: 22px; font-weight: 900; color: #1d4ed8; }
  .tstat-label { font-size: 11px; color: #94a3b8; margin-top: 4px; }
  .milestones { display: flex; flex-direction: column; gap: 8px; }
  .milestone { display: flex; gap: 12px; align-items: flex-start; }
  .m-date { font-size: 11px; font-weight: 700; color: #1d4ed8; background: #eff6ff; padding: 3px 8px; border-radius: 4px; flex-shrink: 0; }
  .m-text { font-size: 13px; color: #334155; }

  /* Roadmap */
  .roadmap-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
  .roadmap-quarter { background: #f8fafc; border-radius: 10px; padding: 16px; border: 1px solid #e2e8f0; }
  .q-period { font-size: 11px; font-weight: 800; color: #1d4ed8; margin-bottom: 10px; }
  .q-obj { font-size: 12px; color: #334155; margin-bottom: 6px; padding-left: 8px; border-left: 2px solid #bfdbfe; }
  .funds-goal { font-size: 13px; font-weight: 600; color: #166534; background: #f0fdf4; border-radius: 8px; padding: 10px 14px; border: 1px solid #86efac; }

  /* Team */
  .team-grid { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
  .founder-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; min-width: 180px; flex: 1; }
  .founder-avatar { width: 44px; height: 44px; background: #1d4ed8; color: white; border-radius: 50%; font-size: 18px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
  .founder-name { font-size: 14px; font-weight: 700; color: #0f172a; }
  .founder-role { font-size: 11px; color: #64748b; margin-top: 2px; }
  .founder-bg { font-size: 12px; color: #334155; margin-top: 8px; line-height: 1.4; }
  .founder-skill { font-size: 11px; color: #166534; margin-top: 8px; background: #f0fdf4; border-radius: 4px; padding: 4px 8px; }
  .team-summary { font-size: 12px; color: #64748b; background: #f1f5f9; border-radius: 6px; padding: 8px 12px; }

  /* Financials */
  .fin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .fin-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.08em; margin-bottom: 10px; }
  .fin-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
  .fin-row .green { color: #166534; font-weight: 700; }

  /* ESG */
  .impact-headline { font-size: 20px; font-weight: 700; color: #0f172a; background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 0 10px 10px 0; margin-bottom: 20px; }
  .sdg-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
  .sdg-badge { background: #064e3b; color: #6ee7b7; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 100px; }
  .impact-metrics { display: flex; flex-direction: column; gap: 10px; }
  .impact-row { display: flex; align-items: center; gap: 12px; font-size: 13px; }
  .impact-metric { flex: 1; color: #334155; }
  .impact-now { font-weight: 700; color: #64748b; }
  .impact-arrow { color: #10b981; }
  .impact-target { font-weight: 800; color: #166534; }

  /* Deal */
  .deal-header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
  .deal-amount { font-size: 36px; font-weight: 900; color: #1d4ed8; }
  .deal-instrument { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; }
  .deal-val { font-size: 13px; color: #64748b; }
  .use-of-funds { display: flex; flex-direction: column; gap: 8px; }
  .fund-item { display: flex; align-items: center; gap: 10px; font-size: 13px; }
  .fund-bar { height: 8px; background: #1d4ed8; border-radius: 100px; min-width: 20px; opacity: 0.7; }
  .fund-pct { margin-left: auto; font-weight: 700; color: #1d4ed8; }

  /* CTA */
  .cta-slide { background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); color: white; }
  .cta-slide .slide-header h2 { color: white; }
  .cta-slide .slide-header { border-bottom-color: rgba(255,255,255,0.15); }
  .ask-box { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; padding: 16px 20px; font-size: 16px; font-weight: 600; color: white; margin-bottom: 20px; }
  .next-steps { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
  .next-step { display: flex; gap: 12px; align-items: flex-start; }
  .ns-num { width: 24px; height: 24px; background: #1d4ed8; border-radius: 50%; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .next-step span:last-child { font-size: 13px; color: rgba(255,255,255,0.85); }
  .contact-info { display: flex; gap: 20px; font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 20px; flex-wrap: wrap; }
  .closing { font-size: 20px; font-weight: 700; color: #34d399; }
</style>
</head>
<body>
<div id="sidebar">
  <div class="sidebar-header">
    <h3>Pitch Deck</h3>
    <p>${companyName}</p>
  </div>
  ${thumbnails}
</div>
<div id="main">
  <div id="viewer">
    ${slidesHtml}
  </div>
  <div id="controls">
    <button onclick="prev()" id="btn-prev" disabled>← Précédent</button>
    <span id="slide-counter">1 / ${slides.length}</span>
    <div style="display:flex;gap:8px">
      <button onclick="next()" id="btn-next">Suivant →</button>
      <button id="fullscreen-btn" onclick="toggleFullscreen()">⛶ Plein écran</button>
    </div>
  </div>
</div>
<script>
  let cur = 1;
  const total = ${slides.length};
  function goTo(n) {
    document.querySelectorAll('.slide').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
    const slide = document.getElementById('slide-' + n);
    const thumb = document.querySelector('.thumb[data-target="' + n + '"]');
    if (slide) slide.classList.add('active');
    if (thumb) { thumb.classList.add('active'); thumb.scrollIntoView({ block: 'nearest' }); }
    cur = n;
    document.getElementById('slide-counter').textContent = cur + ' / ' + total;
    document.getElementById('btn-prev').disabled = cur === 1;
    document.getElementById('btn-next').disabled = cur === total;
  }
  function prev() { if (cur > 1) goTo(cur - 1); }
  function next() { if (cur < total) goTo(cur + 1); }
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });
  goTo(1);
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ctx = await verifyAndGetContext(req);
    const ent = ctx.enterprise;
    const dm = ctx.deliverableMap;

    // Require at least one rich deliverable
    const hasBmc = !!(dm["bmc_analysis"]?.canvas);
    const hasPlanOvo = !!(dm["plan_ovo"]?.scenarios);
    const hasMemo = !!(dm["investment_memo"]);
    const hasFramework = !!(dm["framework_data"]);

    if (!hasBmc && !hasPlanOvo && !hasMemo && !hasFramework) {
      return errorResponse(
        "Pitch Deck nécessite au minimum : BMC, Plan Financier ou Mémo Investisseur. Veuillez générer ces modules d'abord.",
        400
      );
    }

    const ragContext = await buildRAGContext(
      ctx.supabase, ent.country || "", ent.sector || "", ["benchmarks"]
    );

    const prompt = buildPrompt(
      ent,
      dm["bmc_analysis"],
      dm["plan_ovo"],
      dm["investment_memo"],
      dm["gap_analysis"],
      ragContext,
      ctx.baseYear,
    );

    const rawData = await callAI(SYSTEM_PROMPT, prompt, 16384);

    // Generate navigable HTML
    const pitchHtml = generatePitchDeckHtml(rawData, ent);

    const finalData = {
      ...rawData,
      pitch_html: pitchHtml,
    };

    await saveDeliverable(ctx.supabase, ctx.enterprise_id, "pitch_deck", finalData, "pitch_deck", pitchHtml);

    return jsonResponse({ success: true, data: finalData, score: finalData.score || 0 });
  } catch (e: any) {
    console.error("generate-pitch-deck error:", e);
    return errorResponse(e.message || "Erreur inconnue", e.status || 500);
  }
});
