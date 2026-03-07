import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import FrameworkViewerComponent from './FrameworkViewer';
import PlanOvoViewerComponent from './PlanOvoViewer';

interface DeliverableViewerProps {
  moduleCode: string;
  data: any;
}

export default function DeliverableViewer({ moduleCode, data }: DeliverableViewerProps) {
  if (!data || typeof data !== 'object') return null;

  switch (moduleCode) {
    case 'sic': return <SicViewer data={data} />;
    case 'framework': return <FrameworkViewerComponent data={data} />;
    case 'diagnostic': return <DiagnosticViewer data={data} />;
    case 'plan_ovo': return <PlanOvoViewerComponent data={data} />;
    case 'business_plan': return <BusinessPlanViewer data={data} />;
    case 'odd': return <OddViewer data={data} />;
    default: return <GenericJsonViewer data={data} />;
  }
}

// ===== SIC VIEWER =====
function SicViewer({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <ScoreHeader title="Social Impact Canvas" score={data.score} subtitle={data.mission_sociale} />
      
      {data.probleme_social && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-1">🎯 Problème social adressé</h4>
          <p className="text-sm text-muted-foreground">{data.probleme_social}</p>
        </CardContent></Card>
      )}

      {data.theorie_changement && (
        <Card><CardContent className="py-4 space-y-3">
          <h4 className="text-xs font-bold text-primary">🔄 Théorie du changement</h4>
          {['inputs', 'activites', 'outputs', 'outcomes', 'impact'].map(key => (
            <div key={key}>
              <p className="text-[11px] font-semibold capitalize text-muted-foreground">{key}</p>
              <ul className="text-xs space-y-0.5">
                {(data.theorie_changement[key] || []).map((item: string, i: number) => (
                  <li key={i} className="flex gap-1.5"><span className="text-primary">→</span>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent></Card>
      )}

      {data.odd_alignment?.length > 0 && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">🌍 Alignement ODD</h4>
          <div className="grid grid-cols-2 gap-2">
            {data.odd_alignment.map((odd: any, i: number) => (
              <div key={i} className="p-2 rounded-lg bg-muted/50 text-xs">
                <span className="font-bold">ODD {odd.odd_number}</span> — {odd.odd_name}
                <Badge variant="outline" className="ml-1 text-[9px]">{odd.level}</Badge>
                <p className="text-muted-foreground mt-0.5">{odd.contribution}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      <RecommendationsList items={data.recommandations} />
    </div>
  );
}

// ===== INPUTS VIEWER =====
function InputsViewer({ data }: { data: any }) {
  const cr = data.compte_resultat || {};
  const bilan = data.bilan || {};
  const kpis = data.kpis || {};
  const alertes = data.alertes || [];
  const croisements = data.croisements_bmc_fin || [];
  const tresBfr = data.tresorerie_bfr || {};
  const sante = data.sante_financiere || {};
  const marge = data.analyse_marge || {};
  const proj = data.projection_5ans || {};
  const seuil = data.seuil_rentabilite || {};
  const scenarios = data.scenarios || {};
  const planAction = data.plan_action || [];
  const risques = data.risques_cles || [];
  const bailleurs = data.bailleurs_potentiels || [];
  const croisBmc = data.croisement_bmc_financiers || {};
  const manquantes = data.donnees_manquantes || [];

  const formatAmount = (n: number) => {
    if (!n && n !== 0) return '—';
    return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
  };

  return (
    <div className="space-y-4">
      <ScoreHeader
        title="Framework d'Analyse Financière"
        score={data.score}
        subtitle={`${data.periode || ''} • Fiabilité: ${data.fiabilite || 'N/A'}`}
      />

      {/* KPIs Bar */}
      {kpis.ca_annee_n && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Marge EBITDA', value: kpis.marge_ebitda },
            { label: 'CA Année N', value: formatAmount(kpis.ca_annee_n) },
            { label: 'EBITDA', value: formatAmount(kpis.ebitda) },
            { label: 'CA An 5 projeté', value: formatAmount(kpis.ca_an5_projete) },
          ].map((k, i) => (
            <Card key={i}><CardContent className="py-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
              <p className="text-sm font-bold mt-0.5">{k.value}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Alertes */}
      {alertes.length > 0 && (
        <Card className="border-warning/30 bg-warning/5"><CardContent className="py-3">
          <h4 className="text-xs font-bold text-warning mb-2">⚠️ Alertes & Points de vigilance</h4>
          <ul className="space-y-1">
            {alertes.map((a: any, i: number) => (
              <li key={i} className="text-xs text-warning/80">• {typeof a === 'string' ? a : a.message} {a.detail && <span className="text-muted-foreground">— {a.detail}</span>}</li>
            ))}
          </ul>
        </CardContent></Card>
      )}

      {/* Croisements BMC ↔ Fin */}
      {croisements.length > 0 && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">🔗 Croisement BMC ↔ Financiers</h4>
          <div className="space-y-2">
            {croisements.map((c: any, i: number) => (
              <div key={i} className="p-2 rounded-lg bg-muted/30 text-xs">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge variant="outline" className="text-[9px]">{c.bloc_bmc}</Badge>
                  <span className="font-semibold">{c.titre}</span>
                </div>
                <p className="text-muted-foreground">{c.recommandation}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Compte de résultat */}
      {Object.keys(cr).length > 0 && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">📊 Compte de résultat</h4>
          <div className="space-y-1">
            {Object.entries(cr).map(([key, val]) => (
              <div key={key} className={`flex justify-between text-xs py-0.5 border-b border-border/50 ${key.includes('resultat') ? 'font-bold' : ''}`}>
                <span className="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                <span className="font-medium">{formatAmount(val as number)}</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Indicateurs Clés + Verdict */}
      {data.indicateurs_cles && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">📈 Indicateurs Clés</h4>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {Object.entries(data.indicateurs_cles).map(([k, v]) => (
              <div key={k} className="p-2 rounded bg-muted/50 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">{k.replace(/_/g, ' ')}</p>
                <p className="text-lg font-bold">{v as string}</p>
              </div>
            ))}
          </div>
          {data.verdict_indicateurs && (
            <p className="text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-3">{data.verdict_indicateurs}</p>
          )}
        </CardContent></Card>
      )}

      {/* Ratios historiques */}
      {data.ratios_historiques?.length > 0 && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">📊 Ratios Historiques</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b">
                <th className="text-left py-1">Ratio</th><th className="text-right py-1">N-2</th><th className="text-right py-1">N-1</th><th className="text-right py-1">N</th><th className="text-right py-1">Benchmark</th>
              </tr></thead>
              <tbody>
                {data.ratios_historiques.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-1 font-medium">{r.ratio}</td>
                    <td className="text-right">{r.n_moins_2}</td>
                    <td className="text-right">{r.n_moins_1}</td>
                    <td className="text-right font-bold">{r.n}</td>
                    <td className="text-right text-muted-foreground">{r.benchmark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      )}

      {/* Trésorerie & BFR */}
      {(tresBfr.tresorerie_nette || tresBfr.composantes?.length) && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">💧 Trésorerie & BFR</h4>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { l: 'Trésorerie nette', v: formatAmount(tresBfr.tresorerie_nette) },
              { l: 'Cash-flow opérationnel', v: formatAmount(tresBfr.cashflow_operationnel) },
              { l: 'CAF', v: formatAmount(tresBfr.caf) },
              { l: 'DSCR', v: tresBfr.dscr || '—' },
            ].map((m, i) => (
              <div key={i} className="p-2 rounded bg-muted/50 text-center">
                <p className="text-[9px] text-muted-foreground uppercase">{m.l}</p>
                <p className="text-xs font-bold">{m.v}</p>
              </div>
            ))}
          </div>
          {tresBfr.composantes?.length > 0 && (
            <div className="space-y-1">
              {tresBfr.composantes.map((c: any, i: number) => (
                <div key={i} className="flex justify-between text-xs py-0.5 border-b border-border/30">
                  <span className="text-muted-foreground">{c.indicateur}</span>
                  <div className="flex gap-4">
                    <span className="font-bold">{c.valeur}</span>
                    <span className="text-muted-foreground text-[10px]">Benchmark: {c.benchmark}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tresBfr.verdict && (
            <p className="text-xs italic text-muted-foreground mt-2 border-l-2 border-primary/30 pl-3">{tresBfr.verdict}</p>
          )}
        </CardContent></Card>
      )}

      {/* Bilan */}
      {bilan.actif && (
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="py-4">
            <h4 className="text-xs font-bold text-primary mb-2">Actif</h4>
            {Object.entries(bilan.actif).map(([k, v]) => (
              <div key={k} className={`flex justify-between text-[11px] py-0.5 ${k.includes('total') ? 'font-bold border-t border-border' : ''}`}>
                <span className="text-muted-foreground">{k.replace(/_/g, ' ')}</span>
                <span className="font-medium">{formatAmount(v as number)}</span>
              </div>
            ))}
          </CardContent></Card>
          <Card><CardContent className="py-4">
            <h4 className="text-xs font-bold text-primary mb-2">Passif</h4>
            {Object.entries(bilan.passif || {}).map(([k, v]) => (
              <div key={k} className={`flex justify-between text-[11px] py-0.5 ${k.includes('total') ? 'font-bold border-t border-border' : ''}`}>
                <span className="text-muted-foreground">{k.replace(/_/g, ' ')}</span>
                <span className="font-medium">{formatAmount(v as number)}</span>
              </div>
            ))}
          </CardContent></Card>
        </div>
      )}

      {/* État de santé financière - Forces / Faiblesses */}
      {(sante.forces?.length > 0 || sante.faiblesses?.length > 0) && (
        <>
          {sante.resume_chiffres?.length > 0 && (
            <Card><CardContent className="py-3">
              <h4 className="text-xs font-bold text-primary mb-1">📊 État de santé financière</h4>
              <div className="flex flex-wrap gap-2">
                {sante.resume_chiffres.map((c: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{c}</Badge>
                ))}
              </div>
            </CardContent></Card>
          )}
          <StrengthsWeaknesses strengths={sante.forces} weaknesses={sante.faiblesses} />
        </>
      )}

      {/* Analyse de la marge */}
      {marge.activites?.length > 0 && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">💰 Où se crée la marge</h4>
          {marge.verdict && <p className="text-xs italic text-muted-foreground mb-3 border-l-2 border-primary/30 pl-3">{marge.verdict}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b">
                <th className="text-left py-1">Activité</th><th className="text-right py-1">CA</th><th className="text-right py-1">Marge</th><th className="text-right py-1">%</th><th className="py-1">Action</th>
              </tr></thead>
              <tbody>
                {marge.activites.map((a: any, i: number) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-1">{a.nom}</td>
                    <td className="text-right">{formatAmount(a.ca)}</td>
                    <td className="text-right">{formatAmount(a.marge_brute)}</td>
                    <td className="text-right font-bold">{a.marge_pct}</td>
                    <td><Badge variant="outline" className={`text-[9px] ${a.classification === 'RENFORCER' ? 'text-success border-success/30' : a.classification === 'RESTRUCTURER' ? 'text-destructive border-destructive/30' : 'text-warning border-warning/30'}`}>{a.classification}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {marge.message_cle && <p className="text-xs font-medium mt-2 text-primary">{marge.message_cle}</p>}
        </CardContent></Card>
      )}

      {/* Projection 5 ans */}
      {proj.lignes?.length > 0 && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">📈 Projection Financière 5 Ans</h4>
          {proj.verdict && <p className="text-xs italic text-muted-foreground mb-3 border-l-2 border-primary/30 pl-3">{proj.verdict}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b">
                <th className="text-left py-1">Poste</th><th className="text-right py-1">An 1</th><th className="text-right py-1">An 2</th><th className="text-right py-1">An 3</th><th className="text-right py-1">An 4</th><th className="text-right py-1">An 5</th><th className="text-right py-1">CAGR</th>
              </tr></thead>
              <tbody>
                {proj.lignes.map((l: any, i: number) => (
                  <tr key={i} className={`border-b border-border/30 ${l.poste.includes('CA') ? 'font-bold' : ''}`}>
                    <td className="py-1">{l.poste}</td>
                    <td className="text-right">{new Intl.NumberFormat('fr-FR').format(l.an1)}</td>
                    <td className="text-right">{new Intl.NumberFormat('fr-FR').format(l.an2)}</td>
                    <td className="text-right">{new Intl.NumberFormat('fr-FR').format(l.an3)}</td>
                    <td className="text-right">{new Intl.NumberFormat('fr-FR').format(l.an4)}</td>
                    <td className="text-right">{new Intl.NumberFormat('fr-FR').format(l.an5)}</td>
                    <td className="text-right text-primary font-bold">{l.cagr || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      )}

      {/* Seuil de rentabilité */}
      {seuil.ca_point_mort && (
        <Card><CardContent className="py-3">
          <h4 className="text-xs font-bold text-primary mb-1">🎯 Seuil de Rentabilité (Année 1)</h4>
          <p className="text-sm">CA au point mort = <span className="font-bold">{formatAmount(seuil.ca_point_mort)}</span> · Atteint en <span className="font-bold">{seuil.atteint_en}</span></p>
          {seuil.verdict && <p className="text-xs text-muted-foreground mt-1 italic">{seuil.verdict}</p>}
        </CardContent></Card>
      )}

      {/* Scénarios */}
      {scenarios.tableau?.length > 0 && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">🔄 Analyse par Scénarios (Année 5)</h4>
          {scenarios.verdict && <p className="text-xs italic text-muted-foreground mb-3 border-l-2 border-primary/30 pl-3">{scenarios.verdict}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b">
                <th className="text-left py-1">Indicateur</th>
                <th className="text-right py-1 text-warning">⚠️ Prudent</th>
                <th className="text-right py-1 text-primary">📊 Central</th>
                <th className="text-right py-1 text-success">🚀 Ambitieux</th>
              </tr></thead>
              <tbody>
                {scenarios.tableau.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-1 font-medium">{r.indicateur}</td>
                    <td className="text-right">{r.prudent}</td>
                    <td className="text-right font-bold">{r.central}</td>
                    <td className="text-right">{r.ambitieux}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {scenarios.sensibilite?.length > 0 && (
            <div className="mt-3 p-2 rounded bg-muted/30">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Sensibilité (±10%)</p>
              <ul className="text-[11px] space-y-0.5">
                {scenarios.sensibilite.map((s: string, i: number) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          )}
          {scenarios.recommandation_scenario && (
            <p className="text-xs font-medium mt-2 text-primary">📌 {scenarios.recommandation_scenario}</p>
          )}
        </CardContent></Card>
      )}

      {/* Plan d'action */}
      {planAction.length > 0 && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">🎯 Plan d'Action & Trajectoire</h4>
          <div className="space-y-1.5">
            {planAction.map((a: any, i: number) => (
              <div key={i} className={`p-2 rounded-lg border-l-4 text-xs ${
                a.horizon === 'COURT' ? 'border-l-success bg-success/5' :
                a.horizon === 'MOYEN' ? 'border-l-primary bg-primary/5' :
                'border-l-purple-500 bg-purple-50'
              }`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge variant="outline" className="text-[9px]">{a.horizon}</Badge>
                  <span className="font-semibold">{a.action}</span>
                </div>
                <div className="flex gap-4 text-muted-foreground">
                  {a.cout && <span>💰 {a.cout}</span>}
                  {a.impact && <span>→ {a.impact}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Impact attendu + Besoins financiers */}
      {(data.impact_attendu || data.besoins_financiers) && (
        <div className="grid grid-cols-2 gap-3">
          {data.impact_attendu && (
            <Card className="bg-success/5 border-success/20"><CardContent className="py-3">
              <h4 className="text-xs font-bold text-success mb-1">📈 Impact attendu</h4>
              {Object.entries(data.impact_attendu).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs py-0.5">
                  <span className="text-muted-foreground">{k.replace(/_/g, ' ')}</span>
                  <span className="font-bold">{v as string}</span>
                </div>
              ))}
            </CardContent></Card>
          )}
          {data.besoins_financiers && (
            <Card className="bg-primary/5 border-primary/20"><CardContent className="py-3">
              <h4 className="text-xs font-bold text-primary mb-1">💰 Besoins financiers</h4>
              <p className="text-xs">CAPEX total: <span className="font-bold">{data.besoins_financiers.capex_total}</span></p>
              <p className="text-xs text-muted-foreground">Timing: {data.besoins_financiers.timing}</p>
            </CardContent></Card>
          )}
        </div>
      )}

      {/* Synthèse expert */}
      {data.synthese_expert && (
        <Card className="bg-gradient-to-br from-muted/50 to-muted/20"><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">🧠 Synthèse Expert</h4>
          <p className="text-xs leading-relaxed text-muted-foreground">{data.synthese_expert}</p>
        </CardContent></Card>
      )}

      {/* Risques clés */}
      {risques.length > 0 && (
        <Card className="border-destructive/20"><CardContent className="py-4">
          <h4 className="text-xs font-bold text-destructive mb-2">🚨 Risques Clés</h4>
          {risques.map((r: any, i: number) => (
            <div key={i} className="flex items-start gap-2 text-xs py-1 border-b border-border/30">
              <Badge variant="outline" className={`text-[9px] flex-none ${r.severite === 'HAUTE' ? 'text-destructive border-destructive/30' : r.severite === 'CRITIQUE' ? 'text-destructive border-destructive' : 'text-warning border-warning/30'}`}>{r.severite}</Badge>
              <span>{r.risque}</span>
            </div>
          ))}
        </CardContent></Card>
      )}

      {/* Bailleurs potentiels */}
      {bailleurs.length > 0 && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">🏦 Bailleurs Potentiels</h4>
          {bailleurs.map((b: any, i: number) => (
            <div key={i} className="p-2 rounded bg-muted/30 mb-1 text-xs">
              <span className="font-bold">{b.nom}</span>
              <p className="text-muted-foreground mt-0.5">{b.raison}</p>
            </div>
          ))}
        </CardContent></Card>
      )}

      {/* Incohérences BMC ↔ Financiers */}
      {croisBmc.incoherences?.length > 0 && (
        <Card className="border-warning/20"><CardContent className="py-4">
          <h4 className="text-xs font-bold text-warning mb-2">⚠️ Incohérences BMC ↔ Financiers</h4>
          {croisBmc.synthese && <p className="text-xs text-muted-foreground mb-2">{croisBmc.synthese}</p>}
          {croisBmc.incoherences.map((inc: any, i: number) => (
            <div key={i} className="flex items-start gap-2 text-xs py-1 border-b border-border/30">
              <Badge variant="outline" className={`text-[9px] flex-none ${inc.severite === 'CRITIQUE' ? 'text-destructive border-destructive' : inc.severite === 'HAUTE' ? 'text-destructive border-destructive/30' : 'text-warning border-warning/30'}`}>{inc.severite}</Badge>
              <span>{inc.description}</span>
            </div>
          ))}
        </CardContent></Card>
      )}

      {/* Données manquantes */}
      {manquantes.length > 0 && (
        <Card className="border-muted"><CardContent className="py-3">
          <h4 className="text-xs font-bold text-muted-foreground mb-1">📋 Données manquantes détectées</h4>
          <ul className="text-[11px] text-muted-foreground space-y-0.5">
            {manquantes.map((d: string, i: number) => <li key={i}>• {d}</li>)}
          </ul>
        </CardContent></Card>
      )}

      {/* Hypothèses */}
      {data.hypotheses?.length > 0 && (
        <Card className="border-warning/20 bg-warning/5"><CardContent className="py-3">
          <p className="text-[11px] font-bold text-warning mb-1">⚠️ Hypothèses</p>
          <ul className="text-[11px] text-muted-foreground space-y-0.5">
            {data.hypotheses.map((h: string, i: number) => <li key={i}>• {h}</li>)}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}

// ===== FRAMEWORK VIEWER (now in separate file: FrameworkViewer.tsx) =====

// ===== DIAGNOSTIC VIEWER =====
function DiagnosticViewer({ data }: { data: any }) {
  const dimensions = data.diagnostic_par_dimension || {};

  return (
    <div className="space-y-4">
      <ScoreHeader title="Diagnostic Expert" score={data.score} subtitle={data.synthese_executive} badge={data.niveau_maturite} />

      {Object.keys(dimensions).length > 0 && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-3">📊 Scores par dimension</h4>
          <div className="space-y-2">
            {Object.entries(dimensions).map(([key, dim]: [string, any]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className={`font-bold ${dim.score >= 70 ? 'text-success' : dim.score >= 50 ? 'text-warning' : 'text-destructive'}`}>
                    {dim.score}%
                  </span>
                </div>
                <Progress value={dim.score} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground">{dim.analyse}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {data.swot && (
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">🧭 SWOT</h4>
          <div className="grid grid-cols-2 gap-2">
            <SwotBox title="Forces" items={data.swot.forces} className="bg-success/5 border-success/20" />
            <SwotBox title="Faiblesses" items={data.swot.faiblesses} className="bg-destructive/5 border-destructive/20" />
            <SwotBox title="Opportunités" items={data.swot.opportunites} className="bg-info/5 border-info/20" />
            <SwotBox title="Menaces" items={data.swot.menaces} className="bg-warning/5 border-warning/20" />
          </div>
        </div>
      )}

      {data.risques_critiques?.length > 0 && (
        <Card className="border-destructive/20"><CardContent className="py-4">
          <h4 className="text-xs font-bold text-destructive mb-2">🚨 Risques critiques</h4>
          {data.risques_critiques.map((r: any, i: number) => (
            <div key={i} className="p-2 rounded bg-destructive/5 mb-1 text-xs">
              <span className="font-medium">{r.risque}</span>
              <Badge variant="outline" className="ml-1 text-[9px]">{r.severite}</Badge>
              <p className="text-muted-foreground mt-0.5">→ {r.mitigation}</p>
            </div>
          ))}
        </CardContent></Card>
      )}

      <p className="text-sm font-medium text-primary italic">{data.verdict}</p>
    </div>
  );
}

// ===== BUSINESS PLAN VIEWER =====
function BusinessPlanViewer({ data }: { data: any }) {
  const re = data.resume_executif || {};

  return (
    <div className="space-y-4">
      <ScoreHeader title="Business Plan" score={data.score} subtitle={re.accroche} />

      {re.probleme && (
        <Card><CardContent className="py-4 space-y-3">
          <h4 className="text-xs font-bold text-primary">📋 Résumé Exécutif</h4>
          {['probleme', 'solution', 'marche', 'modele_economique', 'equipe', 'besoin_financement', 'vision'].map(key => (
            re[key] ? (
              <div key={key}>
                <p className="text-[11px] font-semibold capitalize text-muted-foreground">{key.replace(/_/g, ' ')}</p>
                <p className="text-xs">{re[key]}</p>
              </div>
            ) : null
          ))}
        </CardContent></Card>
      )}

      {data.analyse_marche && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">📊 Analyse de marché</h4>
          <p className="text-xs mb-2">Taille: <span className="font-medium">{data.analyse_marche.taille_marche}</span></p>
          <p className="text-xs mb-1">Positionnement: <span className="font-medium">{data.analyse_marche.positionnement}</span></p>
          {data.analyse_marche.tendances?.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] font-semibold">Tendances:</p>
              <ul className="text-[11px] text-muted-foreground">{data.analyse_marche.tendances.map((t: string, i: number) => <li key={i}>• {t}</li>)}</ul>
            </div>
          )}
        </CardContent></Card>
      )}

      {data.plan_financier_resume?.utilisation_fonds?.length > 0 && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">💰 Utilisation des fonds</h4>
          {data.plan_financier_resume.utilisation_fonds.map((f: any, i: number) => (
            <div key={i} className="flex justify-between text-xs py-1 border-b border-border/30">
              <span>{f.poste}</span>
              <span className="font-medium">{f.montant} ({f.pourcentage}%)</span>
            </div>
          ))}
        </CardContent></Card>
      )}

      {data.risques_et_mitigations?.length > 0 && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">⚠️ Risques</h4>
          {data.risques_et_mitigations.map((r: any, i: number) => (
            <div key={i} className="p-2 rounded bg-muted/30 mb-1 text-xs">
              <span className="font-medium">{r.risque}</span>
              <Badge variant="outline" className="ml-1 text-[9px]">{r.probabilite}</Badge>
              <p className="text-muted-foreground mt-0.5">→ {r.mitigation}</p>
            </div>
          ))}
        </CardContent></Card>
      )}

      {data.conclusion && (
        <Card className="bg-primary/5 border-primary/20"><CardContent className="py-4">
          <p className="text-sm italic text-primary">{data.conclusion}</p>
        </CardContent></Card>
      )}
    </div>
  );
}

// ===== ODD VIEWER =====
function OddViewer({ data }: { data: any }) {
  const statusIcon = (s: string) => {
    if (s === 'pass') return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    if (s === 'fail') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
  };

  return (
    <div className="space-y-4">
      <ScoreHeader title="Due Diligence ODD" score={data.score} subtitle={data.synthese} badge={data.readiness_level} />

      {data.scores_par_categorie && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-3">📊 Scores par catégorie</h4>
          <div className="space-y-2">
            {Object.entries(data.scores_par_categorie).map(([key, cat]: [string, any]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="capitalize font-medium">{key}</span>
                  <span className={`font-bold ${cat.score >= 70 ? 'text-success' : cat.score >= 50 ? 'text-warning' : 'text-destructive'}`}>
                    {cat.score}% ({cat.items_pass}/{cat.items_total})
                  </span>
                </div>
                <Progress value={cat.score} className="h-1.5" />
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {data.checklist?.length > 0 && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">✅ Checklist</h4>
          <div className="space-y-1">
            {data.checklist.map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/30 text-xs">
                {statusIcon(item.status)}
                <div className="flex-1">
                  <span className="font-medium">{item.critere}</span>
                  <Badge variant="outline" className="ml-1 text-[9px]">{item.categorie}</Badge>
                  <p className="text-muted-foreground mt-0.5">{item.commentaire}</p>
                  {item.status !== 'pass' && item.action_requise && (
                    <p className="text-primary mt-0.5 font-medium">→ {item.action_requise}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {data.red_flags?.length > 0 && (
        <Card className="border-destructive/20"><CardContent className="py-3">
          <h4 className="text-xs font-bold text-destructive mb-1">🚩 Red Flags</h4>
          <ul className="text-xs text-destructive/80 space-y-0.5">{data.red_flags.map((r: string, i: number) => <li key={i}>• {r}</li>)}</ul>
        </CardContent></Card>
      )}

      {data.actions_prioritaires?.length > 0 && (
        <Card><CardContent className="py-4">
          <h4 className="text-xs font-bold text-primary mb-2">🎯 Actions prioritaires</h4>
          {data.actions_prioritaires.map((a: any, i: number) => (
            <div key={i} className="p-2 rounded bg-muted/30 mb-1 text-xs">
              <span className="font-medium">{a.action}</span>
              <div className="flex gap-1 mt-0.5">
                <Badge variant="outline" className="text-[9px]">{a.priorite}</Badge>
                <Badge variant="outline" className="text-[9px]">{a.delai}</Badge>
              </div>
            </div>
          ))}
        </CardContent></Card>
      )}
    </div>
  );
}

// ===== GENERIC FALLBACK =====
function GenericJsonViewer({ data }: { data: any }) {
  return (
    <Card><CardContent className="py-4">
      <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-[600px] text-muted-foreground">
        {JSON.stringify(data, null, 2)}
      </pre>
    </CardContent></Card>
  );
}

// ===== SHARED COMPONENTS =====
function ScoreHeader({ title, score, subtitle, badge }: { title: string; score?: number; subtitle?: string; badge?: string }) {
  return (
    <Card className="bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(222,47%,25%)] text-primary-foreground border-0">
      <CardContent className="py-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-display font-bold">{title}</h2>
            {subtitle && <p className="mt-1.5 text-sm opacity-80">{subtitle}</p>}
            {badge && <Badge className="mt-2 bg-white/20 text-primary-foreground border-0 text-[10px]">{badge}</Badge>}
          </div>
          {score !== undefined && (
            <div className="text-center ml-4">
              <p className="text-4xl font-display font-black">{score}</p>
              <p className="text-[10px] opacity-60">/100</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SwotBox({ title, items, className = '' }: { title: string; items?: any[]; className?: string }) {
  return (
    <div className={`rounded-lg border p-3 ${className}`}>
      <h4 className="text-xs font-bold mb-1.5">{title}</h4>
      <ul className="space-y-0.5">
        {(items || []).map((item: any, i: number) => (
          <li key={i} className="text-[11px]">• {typeof item === 'string' ? item : item.item || item.description}</li>
        ))}
      </ul>
    </div>
  );
}

function StrengthsWeaknesses({ strengths, weaknesses }: { strengths?: string[]; weaknesses?: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="border-success/20 bg-success/5"><CardContent className="py-3">
        <h4 className="text-xs font-bold text-success mb-1">✅ Points forts</h4>
        <ul className="text-[11px] space-y-0.5">{(strengths || []).map((s, i) => <li key={i}>• {s}</li>)}</ul>
      </CardContent></Card>
      <Card className="border-destructive/20 bg-destructive/5"><CardContent className="py-3">
        <h4 className="text-xs font-bold text-destructive mb-1">⚠️ Points faibles</h4>
        <ul className="text-[11px] space-y-0.5">{(weaknesses || []).map((w, i) => <li key={i}>• {w}</li>)}</ul>
      </CardContent></Card>
    </div>
  );
}

function RecommendationsList({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <Card><CardContent className="py-4">
      <h4 className="text-xs font-bold text-primary mb-2">🎯 Recommandations</h4>
      <ul className="space-y-1">
        {items.map((r, i) => (
          <li key={i} className="text-xs flex gap-1.5"><span className="text-primary">→</span>{r}</li>
        ))}
      </ul>
    </CardContent></Card>
  );
}
