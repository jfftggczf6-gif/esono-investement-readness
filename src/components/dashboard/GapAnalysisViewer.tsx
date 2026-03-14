import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Download, AlertTriangle, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface GapAnalysisViewerProps {
  data: any;
}

const CATEGORY_LABELS: Record<string, string> = {
  corporate: 'Corporate & Légal',
  finance: 'Finance',
  commercial: 'Commercial',
  legal: 'Juridique',
  esg: 'ESG & Impact',
};

const LEVEL_CONFIG = [
  { label: 'N0 Déclaratif',     bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200' },
  { label: 'N1 Faible',         bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  { label: 'N2 Intermédiaire',  bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  { label: 'N3 Solide',         bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200' },
];

const INVESTOR_TYPE_COLOR: Record<string, string> = {
  'incub': 'bg-gray-100 text-gray-700',
  'micro': 'bg-blue-100 text-blue-700',
  'impact': 'bg-teal-100 text-teal-700',
  'private': 'bg-purple-100 text-purple-700',
  'due': 'bg-green-100 text-green-700',
};

function getInvestorColor(investorType: string) {
  const lower = (investorType || '').toLowerCase();
  if (lower.includes('incub') || lower.includes('subven')) return INVESTOR_TYPE_COLOR['incub'];
  if (lower.includes('micro') || lower.includes('banq')) return INVESTOR_TYPE_COLOR['micro'];
  if (lower.includes('impact') || lower.includes('dfi')) return INVESTOR_TYPE_COLOR['impact'];
  if (lower.includes('private') || lower.includes('mezzanine')) return INVESTOR_TYPE_COLOR['private'];
  return INVESTOR_TYPE_COLOR['due'];
}

function getScoreColor(score: number) {
  if (score >= 70) return 'text-green-700';
  if (score >= 40) return 'text-amber-700';
  return 'text-red-700';
}

function getScoreBg(score: number) {
  if (score >= 70) return 'bg-green-50 border-green-200';
  if (score >= 40) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

function getProgressColor(score: number) {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

const GapAnalysisViewer = ({ data }: GapAnalysisViewerProps) => {
  if (!data) return <div className="p-6 text-center text-gray-400">Aucune donnée disponible</div>;

  const score = data.score_global || data.score || 0;
  const categories = data.categories || {};
  const rp = data.readiness_pathway || {};
  const reconstructionNeeded = data.reconstruction_needed || [];
  const completeness = data.completeness_summary || {};

  const handleCopyHtml = () => {
    // Build a simple text summary for copy
    const lines = [
      `Score Global: ${score}/100`,
      `Type d'investisseur recommandé: ${rp.investor_type || '—'}`,
      '',
      ...Object.entries(categories).map(([key, cat]: [string, any]) =>
        `${CATEGORY_LABELS[key] || key}: ${cat.score}/100`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Résumé copié dans le presse-papier');
  };

  const handleDownload = () => {
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gap-analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header: score + readiness pathway */}
      <div className="flex gap-4 flex-wrap items-start">
        <div className={`flex-shrink-0 text-center px-6 py-4 rounded-xl border-2 ${getScoreBg(score)}`}>
          <div className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</div>
          <div className="text-xs text-gray-500 mt-0.5">/ 100</div>
          <div className="text-xs font-medium text-gray-600 mt-1">Score global</div>
        </div>
        {rp.investor_type && (
          <div className="flex-1 min-w-[200px] p-4 rounded-xl border bg-white space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pathway recommandé</span>
            </div>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getInvestorColor(rp.investor_type)}`}>
              {rp.investor_type}
            </div>
            {rp.rationale && (
              <p className="text-sm text-gray-600">{rp.rationale}</p>
            )}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCopyHtml}>
          <Copy className="w-4 h-4 mr-1" /> Copier résumé
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-1" /> Télécharger JSON
        </Button>
      </div>

      {/* Completeness summary */}
      {completeness.total_items_checked > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg border">
            <div className="text-xl font-bold text-gray-700">{completeness.total_items_checked}</div>
            <div className="text-xs text-gray-500">Éléments vérifiés</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="text-xl font-bold text-green-700">{completeness.items_present}</div>
            <div className="text-xs text-gray-500">Présents</div>
          </div>
          <div className="text-center p-3 bg-teal-50 rounded-lg border border-teal-100">
            <div className="text-xl font-bold text-teal-700">{completeness.items_with_strong_proof}</div>
            <div className="text-xs text-gray-500">Preuves solides (N≥2)</div>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">Analyse par catégorie</h3>
        {Object.entries(categories).map(([key, cat]: [string, any]) => (
          <Card key={key} className="overflow-hidden">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  {CATEGORY_LABELS[key] || key}
                </CardTitle>
                <span className={`text-sm font-bold ${getScoreColor(cat.score)}`}>
                  {cat.score}/100
                </span>
              </div>
              <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full rounded-full transition-all ${getProgressColor(cat.score)}`}
                  style={{ width: `${cat.score}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-50">
                {(cat.items || []).map((item: any, i: number) => {
                  const lvl = Math.min(Math.max(item.level || 0, 0), 3);
                  const lc = LEVEL_CONFIG[lvl];
                  return (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                      <div className="flex-shrink-0 mt-0.5">
                        {item.present ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`font-medium ${item.present ? 'text-gray-700' : 'text-gray-400'}`}>
                          {item.label}
                        </span>
                        {item.comment && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.comment}</p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded border ${lc.bg} ${lc.text} ${lc.border}`}>
                        {lc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next steps */}
      {(rp.next_steps || []).length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700">Prochaines étapes recommandées</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ol className="space-y-2">
              {rp.next_steps.map((step: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Missing critical items */}
      {reconstructionNeeded.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Éléments critiques manquants ({reconstructionNeeded.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1.5">
              {reconstructionNeeded.map((item: string, i: number) => (
                <li key={i} className="flex items-center gap-2 text-sm text-amber-800">
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GapAnalysisViewer;
