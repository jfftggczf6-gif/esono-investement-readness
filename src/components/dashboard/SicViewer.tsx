import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SicViewerProps {
  data: any;
}

const ODD_COLORS: Record<number, string> = {
  1:'#E5243B',2:'#DDA63A',3:'#4C9F38',4:'#C5192D',5:'#FF3A21',6:'#26BDE2',7:'#FCC30B',8:'#A21942',
  9:'#FD6925',10:'#DD1367',11:'#FD9D24',12:'#BF8B2E',13:'#3F7E44',14:'#0A97D9',15:'#56C02B',16:'#00689D',17:'#19486A',
};

function fmtNum(n: any): string {
  if (n == null) return '—';
  const num = typeof n === 'string' ? parseInt(n.replace(/\D/g, '')) : Number(n);
  if (isNaN(num)) return String(n);
  return new Intl.NumberFormat('fr-FR').format(num);
}

function scoreColor(s: number): string {
  if (s >= 86) return '#16a34a';
  if (s >= 71) return '#22c55e';
  if (s >= 51) return '#eab308';
  if (s >= 31) return '#f97316';
  return '#ef4444';
}

const TC_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
const TC_LABELS = ['PROBLÈME', 'ACTIVITÉS', 'OUTPUTS', 'OUTCOMES', 'IMPACT'];
const TC_KEYS = ['probleme', 'activites', 'outputs', 'outcomes', 'impact'];

export default function SicViewer({ data }: SicViewerProps) {
  const [expandedDim, setExpandedDim] = useState<string | null>(null);

  if (!data) return null;

  const score = data.score_global ?? data.score ?? 0;
  const color = scoreColor(score);
  const dims = data.dimensions || {};
  const chiffres = data.chiffres_cles || {};
  const canvas = data.canvas_blocs || {};
  const risques = data.risques_attenuation?.risques || [];
  const tc = data.theorie_du_changement || data.theorie_changement || {};
  const changements = data.changements || {};
  const recos = data.recommandations || [];
  const oddBloc = canvas.odd_cibles || {};

  const dimOrder = ['probleme_vision', 'beneficiaires', 'mesure_impact', 'alignement_odd', 'gestion_risques'];

  return (
    <div className="max-w-[900px] mx-auto space-y-6" style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>

      {/* ===== BLOC 1 — SCORE GLOBAL (hero) ===== */}
      <div className="rounded-2xl p-8" style={{ background: 'linear-gradient(135deg, #1a2744 0%, #2d4a7c 50%, #1a2744 100%)' }}>
        <div className="flex items-center gap-4 mb-3">
          <span className="text-5xl font-black text-white leading-none" style={{ fontSize: 48 }}>{score}</span>
          <span className="text-2xl text-white/40 font-light">/100</span>
        </div>
        <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
        </div>
        <p className="text-lg font-semibold" style={{ color }}>{data.label || data.palier || ''}</p>
        {data.synthese_impact && (
          <p className="text-sm text-white/60 italic mt-3 max-w-[700px] leading-relaxed">{data.synthese_impact}</p>
        )}
      </div>

      {/* ===== BLOC 2 — 5 JAUGES DE DIMENSIONS ===== */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-black uppercase tracking-[0.15em] text-foreground mb-5 pb-2 border-b-2 border-border">
          SCORES PAR DIMENSION
        </h2>
        <div className="space-y-3">
          {dimOrder.map(key => {
            const dim = dims[key];
            if (!dim) return null;
            const s = dim.score || 0;
            const c = scoreColor(s);
            const isOpen = expandedDim === key;
            return (
              <div key={key}>
                <button
                  onClick={() => setExpandedDim(isOpen ? null : key)}
                  className="w-full flex items-center gap-4 group"
                >
                  <span className="w-[200px] text-left text-[13px] font-semibold text-foreground truncate">{dim.label || key}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s}%`, backgroundColor: c }} />
                  </div>
                  <span className="text-sm font-bold w-12 text-right" style={{ color: c }}>{s}%</span>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isOpen && dim.commentaire && (
                  <p className="ml-[216px] mt-2 text-xs text-muted-foreground leading-relaxed bg-muted/50 rounded-lg p-3">
                    {dim.commentaire}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== BLOC 3 — 4 CHIFFRES CLÉS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { val: chiffres.beneficiaires_directs?.nombre, label: `Bénéf. directs${chiffres.beneficiaires_directs?.horizon ? ` (${chiffres.beneficiaires_directs.horizon})` : ''}` },
          { val: chiffres.beneficiaires_indirects?.nombre, label: 'Bénéf. indirects' },
          { val: chiffres.impact_total_projete?.nombre, label: 'Impact total projeté' },
          { val: chiffres.odd_adresses?.nombre, label: 'ODD adressés' },
        ].map((item, i) => (
          <div key={i} className="rounded-xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #1a2744, #2d4a7c)' }}>
            <p className="text-3xl font-black text-white leading-none mb-1">{fmtNum(item.val)}</p>
            <p className="text-[11px] text-white/50 uppercase tracking-wider">{item.label}</p>
          </div>
        ))}
      </div>

      {/* ===== BLOC 4 — CANVAS VISUEL (6 blocs) ===== */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <h2 className="text-sm font-black uppercase tracking-[0.15em] text-foreground p-6 pb-4 border-b border-border">
          SOCIAL IMPACT CANVAS
        </h2>

        {/* Row 1: 4 cols */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
          <CanvasBlock icon="🔴" title={canvas.probleme_social?.titre || 'PROBLÈME SOCIAL'} points={canvas.probleme_social?.points} />
          <CanvasBlock icon="🟢" title={canvas.transformation_visee?.titre || 'TRANSFORMATION VISÉE'} points={canvas.transformation_visee?.points} />
          <CanvasBlock icon="👥" title={canvas.beneficiaires?.titre || 'BÉNÉFICIAIRES'} points={canvas.beneficiaires?.points} />
          {/* ODD block */}
          <div className="bg-card p-4 min-h-[180px]">
            <h4 className="text-[9px] font-black uppercase tracking-[0.12em] text-primary mb-3 pb-1.5 border-b border-border">
              🎯 {oddBloc.titre || 'ODD CIBLÉS'}
            </h4>
            <div className="flex flex-wrap gap-2 mb-3">
              {(oddBloc.odds || []).map((odd: any, i: number) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded flex items-center justify-center text-white text-sm font-bold"
                  style={{
                    backgroundColor: odd.couleur || ODD_COLORS[odd.numero] || '#666',
                    border: odd.alignement === 'fort' ? '3px solid white' : odd.alignement === 'faible' ? '1px dashed rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.7)',
                  }}
                  title={`ODD ${odd.numero}: ${odd.nom} (${odd.alignement})`}
                >
                  {odd.numero}
                </div>
              ))}
            </div>
            <ul className="space-y-0.5">
              {(oddBloc.odds || []).map((odd: any, i: number) => (
                <li key={i} className="text-[10px] text-muted-foreground">{odd.nom}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Row 2: 2 cols */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border-t border-border">
          {/* Indicateurs */}
          <div className="bg-card p-4 min-h-[180px]">
            <h4 className="text-[9px] font-black uppercase tracking-[0.12em] text-primary mb-3 pb-1.5 border-b border-border">
              📏 {canvas.indicateurs_mesure?.titre || 'INDICATEURS & MESURE'}
            </h4>
            <ul className="space-y-1.5 mb-3">
              {(canvas.indicateurs_mesure?.indicateurs || []).map((ind: any, i: number) => (
                <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    ind.type === 'impact' ? 'bg-green-100 text-green-700' :
                    ind.type === 'outcome' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{ind.type}</span>
                  <span>{ind.nom}</span>
                </li>
              ))}
            </ul>
            {canvas.indicateurs_mesure?.cible_1_an && (
              <p className="text-[10px] text-muted-foreground">🎯 Cible 1 an: {canvas.indicateurs_mesure.cible_1_an}</p>
            )}
            {canvas.indicateurs_mesure?.methode && (
              <p className="text-[10px] text-muted-foreground">📐 {canvas.indicateurs_mesure.methode}</p>
            )}
            {canvas.indicateurs_mesure?.frequence && (
              <p className="text-[10px] text-muted-foreground">🔄 {canvas.indicateurs_mesure.frequence}</p>
            )}
          </div>

          <CanvasBlock icon="💡" title={canvas.solution_activites?.titre || 'SOLUTION & ACTIVITÉS'} points={canvas.solution_activites?.points} />
        </div>
      </div>

      {/* ===== BLOC 5 — RISQUES & ATTÉNUATION ===== */}
      {risques.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <h2 className="text-sm font-black uppercase tracking-[0.15em] text-foreground p-6 pb-4 border-b border-border">
            RISQUES & ATTÉNUATION
          </h2>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">⚠️ Risque</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">✅ Atténuation</th>
              </tr>
            </thead>
            <tbody>
              {risques.map((r: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/30'}>
                  <td className="p-3 text-foreground">{r.risque}</td>
                  <td className="p-3 text-muted-foreground">{r.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== BLOC 6 — THÉORIE DU CHANGEMENT ===== */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-black uppercase tracking-[0.15em] text-foreground mb-5 pb-2 border-b-2 border-border">
          THÉORIE DU CHANGEMENT
        </h2>
        {/* Desktop: horizontal */}
        <div className="hidden md:flex items-stretch gap-1">
          {TC_KEYS.map((key, i) => (
            <div key={key} className="flex items-stretch" style={{ width: '19%' }}>
              <div className="rounded-lg p-3 flex-1 min-h-[100px]" style={{ backgroundColor: TC_COLORS[i] + '20', borderLeft: `4px solid ${TC_COLORS[i]}` }}>
                <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: TC_COLORS[i] }}>{TC_LABELS[i]}</p>
                <p className="text-[11px] text-foreground leading-snug">{tc[key] || '—'}</p>
              </div>
              {i < 4 && (
                <div className="flex items-center px-1 text-muted-foreground text-lg">→</div>
              )}
            </div>
          ))}
        </div>
        {/* Mobile: vertical */}
        <div className="md:hidden space-y-2">
          {TC_KEYS.map((key, i) => (
            <div key={key}>
              <div className="rounded-lg p-3" style={{ backgroundColor: TC_COLORS[i] + '20', borderLeft: `4px solid ${TC_COLORS[i]}` }}>
                <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: TC_COLORS[i] }}>{TC_LABELS[i]}</p>
                <p className="text-[11px] text-foreground leading-snug">{tc[key] || '—'}</p>
              </div>
              {i < 4 && <div className="text-center text-muted-foreground text-lg">↓</div>}
            </div>
          ))}
        </div>
      </div>

      {/* ===== BLOC 7 — CHANGEMENTS ATTENDUS ===== */}
      {(changements.court_terme || changements.moyen_terme || changements.long_terme) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Court terme (0-12 mois)', val: changements.court_terme, color: '#22c55e' },
            { label: 'Moyen terme (1-3 ans)', val: changements.moyen_terme, color: '#3b82f6' },
            { label: 'Long terme (3-5 ans)', val: changements.long_terme, color: '#8b5cf6' },
          ].map((item, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5" style={{ borderLeftWidth: 4, borderLeftColor: item.color }}>
              <h4 className="text-xs font-bold text-foreground mb-2">{item.label}</h4>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{item.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* ===== BLOC 8 — TOP 3 RECOMMANDATIONS ===== */}
      {recos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recos.slice(0, 3).map((r: any, i: number) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 relative">
              <div className="absolute -top-2 -left-2 h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: scoreColor(70) }}>
                {r.priorite || i + 1}
              </div>
              <h4 className="text-sm font-bold text-foreground mb-2 mt-2">{r.titre}</h4>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">{r.detail}</p>
              {r.impact_score && (
                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
                  {r.impact_score}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-6 border-t border-border">
        <p className="text-[11px] text-muted-foreground">
          Document généré par ESONO — Investment Readiness Platform • {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}

/* ===== Sub-components ===== */

function CanvasBlock({ icon, title, points }: { icon: string; title: string; points?: string[] }) {
  return (
    <div className="bg-card p-4 min-h-[180px]">
      <h4 className="text-[9px] font-black uppercase tracking-[0.12em] text-primary mb-3 pb-1.5 border-b border-border">
        {icon} {title}
      </h4>
      <ul className="space-y-1">
        {(points || []).map((p, i) => (
          <li key={i} className="text-[11px] text-muted-foreground">• {p}</li>
        ))}
      </ul>
    </div>
  );
}
