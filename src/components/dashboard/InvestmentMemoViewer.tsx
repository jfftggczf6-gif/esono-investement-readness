import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';

interface InvestmentMemoViewerProps {
  data: any;
}

const InvestmentMemoViewer = ({ data }: InvestmentMemoViewerProps) => {
  if (!data) return <div className="p-6 text-center text-muted-foreground">Aucune donnée disponible</div>;

  const memo = data.memo || data;
  const memoHtml = data.memo_html || null;
  const score = data.score || memo?.score || 0;
  const metadata = data.metadata || {};

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s >= 60) return 'bg-green-100 text-green-800 border-green-200';
    if (s >= 40) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'Prêt pour investissement';
    if (s >= 60) return 'Prêt avec réserves';
    if (s >= 40) return 'Potentiel identifié';
    return 'Non prêt';
  };

  const getVerdictStyle = (verdict: string) => {
    const v = (verdict || '').toLowerCase();
    if (v.includes('investir')) return 'bg-green-50 border-green-400 text-green-800';
    if (v.includes('déclin') || v.includes('declin')) return 'bg-red-50 border-red-400 text-red-800';
    return 'bg-amber-50 border-amber-400 text-amber-800';
  };

  const handleCopy = (html: string | null) => {
    if (!html) return;
    navigator.clipboard.writeText(html);
    toast.success('HTML copié dans le presse-papier');
  };

  const handleOpenNewTab = (html: string | null) => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleDownload = (html: string | null, filename: string) => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rf = memo?.recommandation_finale || {};
  const re = memo?.resume_executif || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Badge className={`text-lg px-4 py-1 border ${getScoreColor(score)}`}>
            {score}/100
          </Badge>
          <span className={`text-sm font-medium ${score >= 60 ? 'text-green-700' : score >= 40 ? 'text-amber-700' : 'text-red-700'}`}>
            {getScoreLabel(score)}
          </span>
        </div>
        {rf.verdict && (
          <div className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm ${getVerdictStyle(rf.verdict)}`}>
            Recommandation : {rf.verdict}
          </div>
        )}
      </div>

      {/* Metadata */}
      {metadata.generated_at && (
        <p className="text-xs text-muted-foreground">
          Généré le {new Date(metadata.generated_at).toLocaleDateString('fr-FR')}
          {metadata.modules_used?.length > 0 && ` · ${metadata.modules_used.length} modules analysés`}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => handleCopy(memoHtml)} disabled={!memoHtml}>
          <Copy className="w-4 h-4 mr-1" /> Copier HTML
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleOpenNewTab(memoHtml)} disabled={!memoHtml}>
          <ExternalLink className="w-4 h-4 mr-1" /> Ouvrir
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleDownload(memoHtml, 'investment-memo.html')} disabled={!memoHtml}>
          <Download className="w-4 h-4 mr-1" /> Télécharger
        </Button>
      </div>

      {memoHtml ? (
        <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '70vh' }}>
          <iframe
            srcDoc={memoHtml}
            className="w-full h-full"
            sandbox="allow-same-origin"
            title="Mémo d'investissement"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {re.accroche && (
            <Card>
              <CardHeader><CardTitle className="text-base">Résumé exécutif</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="font-semibold text-foreground">{re.accroche}</p>
                {re.opportunite && <p className="text-muted-foreground">{re.opportunite}</p>}
                {re.montant_recherche && (
                  <p><span className="font-medium">Financement recherché :</span> {re.montant_recherche}</p>
                )}
                {(re.points_cles || []).length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {re.points_cles.map((p: string, i: number) => <li key={i}>{p}</li>)}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
          {rf.synthese && (
            <Card>
              <CardHeader><CardTitle className="text-base">Recommandation finale</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{rf.synthese}</p>
                {(rf.conditions_prealables || []).length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium text-sm mb-1">Conditions préalables :</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
                      {rf.conditions_prealables.map((c: string, i: number) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default InvestmentMemoViewer;
