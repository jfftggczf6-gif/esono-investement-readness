import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface BmcViewerProps {
  data: any;
}

const BLOC_LABELS: Record<string, string> = {
  proposition_valeur: 'Proposition de Valeur',
  activites_cles: 'Activités Clés',
  ressources_cles: 'Ressources Clés',
  segments_clients: 'Segments Clients',
  relations_clients: 'Relations Clients',
  flux_revenus: 'Flux de Revenus',
  partenaires_cles: 'Partenaires Clés',
  canaux: 'Canaux',
  structure_couts: 'Structure de Coûts',
};

const BLOC_ICONS: Record<string, string> = {
  proposition_valeur: '💎',
  activites_cles: '⚙️',
  ressources_cles: '🏗️',
  segments_clients: '👥',
  relations_clients: '❤️',
  flux_revenus: '💵',
  partenaires_cles: '🤝',
  canaux: '📦',
  structure_couts: '💰',
};

export default function BmcViewer({ data }: BmcViewerProps) {
  if (!data) return null;

  const canvas = data.canvas || {};
  const diag = data.diagnostic || {};
  const swot = data.swot || {};
  const reco = data.recommandations || {};
  const scores = diag.scores_par_bloc || {};

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-success' : s >= 60 ? 'text-warning' : 'text-destructive';
  const scoreBg = (s: number) =>
    s >= 80 ? 'bg-success/10' : s >= 60 ? 'bg-warning/10' : 'bg-destructive/10';

  return (
    <div className="space-y-6">
      {/* Header with score */}
      <Card className="bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(222,47%,25%)] text-primary-foreground border-0">
        <CardContent className="py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-display font-bold">Business Model Canvas</h2>
              {data.resume && (
                <p className="mt-2 text-sm opacity-80 italic">"{data.resume}"</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {(data.tags || []).map((tag: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-white/15 text-xs font-medium">{tag}</span>
                ))}
              </div>
            </div>
            <div className="text-center ml-6">
              <p className="text-5xl font-display font-black">{data.score_global || '—'}</p>
              <p className="text-xs opacity-60 mt-1">Score BMC</p>
              {data.maturite && (
                <Badge className="mt-2 bg-white/20 text-primary-foreground border-0 text-[10px]">{data.maturite}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canvas Grid - simplified for in-app display */}
      <div>
        <h3 className="text-sm font-display font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Canvas — Vue d'ensemble
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Proposition de valeur - full width */}
          <CanvasBlock
            title="💎 Proposition de Valeur"
            className="md:col-span-3"
          >
            <p className="font-semibold text-sm mb-1">{canvas.proposition_valeur?.enonce}</p>
            <ul className="text-xs space-y-0.5">
              {(canvas.proposition_valeur?.avantages || []).map((a: string, i: number) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-success mt-0.5">✓</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </CanvasBlock>

          <CanvasBlock title="🤝 Partenaires Clés">
            <BulletList items={canvas.partenaires_cles?.items} />
            {canvas.partenaires_cles?.element_critique && (
              <p className="text-[10px] text-destructive font-medium mt-1">⚠ {canvas.partenaires_cles.element_critique}</p>
            )}
          </CanvasBlock>

          <CanvasBlock title="⚙️ Activités Clés">
            <BulletList items={canvas.activites_cles?.items} />
          </CanvasBlock>

          <CanvasBlock title="🏗️ Ressources Clés">
            <BulletList items={canvas.ressources_cles?.items} />
            {canvas.ressources_cles?.element_critique && (
              <p className="text-[10px] text-destructive font-medium mt-1">⚠ {canvas.ressources_cles.element_critique}</p>
            )}
          </CanvasBlock>

          <CanvasBlock title="👥 Segments Clients">
            <p className="text-xs font-medium">{canvas.segments_clients?.principal}</p>
            <p className="text-[10px] text-muted-foreground">{canvas.segments_clients?.zone} • {canvas.segments_clients?.type_marche}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Problème: {canvas.segments_clients?.probleme_resolu}</p>
          </CanvasBlock>

          <CanvasBlock title="❤️ Relations Clients">
            <p className="text-xs font-medium">{canvas.relations_clients?.type}</p>
            <BulletList items={canvas.relations_clients?.items} />
          </CanvasBlock>

          <CanvasBlock title="📦 Canaux">
            <BulletList items={canvas.canaux?.items} />
          </CanvasBlock>

          {/* Cost & Revenue - bottom row */}
          <CanvasBlock title="💰 Structure de Coûts" className="md:col-span-2">
            {(canvas.structure_couts?.postes || []).slice(0, 4).map((p: any, i: number) => (
              <div key={i} className="flex justify-between text-[11px] py-0.5">
                <span>{p.libelle}</span>
                <span className="text-muted-foreground">{p.montant} ({p.pourcentage}%)</span>
              </div>
            ))}
            <p className="text-xs font-bold mt-1 pt-1 border-t border-border">Total ≈ {canvas.structure_couts?.total_mensuel}</p>
          </CanvasBlock>

          <CanvasBlock title="💵 Flux de Revenus">
            <p className="text-xs font-medium">{canvas.flux_revenus?.produit_principal}</p>
            <p className="text-[11px] text-muted-foreground">CA ≈ {canvas.flux_revenus?.ca_mensuel}</p>
            <p className="text-[11px] text-muted-foreground">Marge ≈ {canvas.flux_revenus?.marge_brute}</p>
          </CanvasBlock>
        </div>
      </div>

      {/* Diagnostic scores */}
      <div>
        <h3 className="text-sm font-display font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          📊 Diagnostic — Scores par bloc
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(scores).map(([key, val]: [string, any]) => (
            <div key={key} className={`rounded-lg p-3 ${scoreBg(val?.score || 0)}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs">{BLOC_ICONS[key] || '📌'}</span>
                <span className="text-[11px] font-semibold">{BLOC_LABELS[key] || key}</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={val?.score || 0} className="h-1.5 flex-1" />
                <span className={`text-xs font-bold ${scoreColor(val?.score || 0)}`}>{val?.score}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{val?.commentaire}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Forces & Vigilance */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-success/20 bg-success/5">
          <CardContent className="py-4">
            <h4 className="text-xs font-bold text-success mb-2">✅ Forces</h4>
            <ul className="space-y-1">
              {(diag.forces || []).map((f: string, i: number) => (
                <li key={i} className="text-xs text-foreground">{f}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="py-4">
            <h4 className="text-xs font-bold text-warning mb-2">⚠️ Points de vigilance</h4>
            <ul className="space-y-1">
              {(diag.points_vigilance || []).map((p: string, i: number) => (
                <li key={i} className="text-xs text-foreground">{p}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* SWOT */}
      <div>
        <h3 className="text-sm font-display font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          🧭 Matrice SWOT
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <SwotBox title="Forces" items={swot.forces} className="bg-success/5 border-success/20" />
          <SwotBox title="Faiblesses" items={swot.faiblesses} className="bg-destructive/5 border-destructive/20" />
          <SwotBox title="Opportunités" items={swot.opportunites} className="bg-info/5 border-info/20" />
          <SwotBox title="Menaces" items={swot.menaces} className="bg-warning/5 border-warning/20" />
        </div>
      </div>

      {/* Recommandations */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <h3 className="text-sm font-display font-semibold">🎯 Recommandations Stratégiques</h3>
          {reco.court_terme && (
            <div>
              <p className="text-[11px] font-bold text-primary">📌 Court terme</p>
              <p className="text-xs text-muted-foreground">{reco.court_terme}</p>
            </div>
          )}
          {reco.moyen_terme && (
            <div>
              <p className="text-[11px] font-bold text-primary">📈 Moyen terme</p>
              <p className="text-xs text-muted-foreground">{reco.moyen_terme}</p>
            </div>
          )}
          {reco.long_terme && (
            <div>
              <p className="text-[11px] font-bold text-primary">🚀 Long terme</p>
              <p className="text-xs text-muted-foreground">{reco.long_terme}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CanvasBlock({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border rounded-lg p-3 ${className}`}>
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2 pb-1.5 border-b border-border">
        {title}
      </h4>
      {children}
    </div>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-0.5">
      {items.map((item, i) => (
        <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
          <span className="text-primary mt-0.5">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SwotBox({ title, items, className = '' }: { title: string; items?: string[]; className?: string }) {
  return (
    <div className={`rounded-lg border p-3 ${className}`}>
      <h4 className="text-xs font-bold mb-1.5">{title}</h4>
      <ul className="space-y-0.5">
        {(items || []).map((item, i) => (
          <li key={i} className="text-[11px] text-foreground">• {item}</li>
        ))}
      </ul>
    </div>
  );
}
