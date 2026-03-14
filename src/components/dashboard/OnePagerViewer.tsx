import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';

interface OnePagerViewerProps {
  data: any;
}

const OnePagerViewer = ({ data }: OnePagerViewerProps) => {
  if (!data) return <div className="p-6 text-center text-muted-foreground">Aucune donnée disponible</div>;

  const onepager = data.onepager || null;
  const onepagerHtml = data.onepager_html || null;

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

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => handleCopy(onepagerHtml)} disabled={!onepagerHtml}>
          <Copy className="w-4 h-4 mr-1" /> Copier HTML
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleOpenNewTab(onepagerHtml)} disabled={!onepagerHtml}>
          <ExternalLink className="w-4 h-4 mr-1" /> Ouvrir
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleDownload(onepagerHtml, 'one-pager.html')} disabled={!onepagerHtml}>
          <Download className="w-4 h-4 mr-1" /> Télécharger
        </Button>
      </div>

      {onepagerHtml ? (
        <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '70vh' }}>
          <iframe
            srcDoc={onepagerHtml}
            className="w-full h-full"
            sandbox="allow-same-origin"
            title="One-Pager"
          />
        </div>
      ) : onepager ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{onepager.header?.entreprise || 'One-Pager'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {onepager.proposition_valeur && (
              <div className="bg-primary text-primary-foreground rounded-lg p-4 text-center font-semibold">
                {onepager.proposition_valeur}
              </div>
            )}
            {(onepager.points_forts || []).length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2">Points forts :</p>
                <ul className="space-y-1">
                  {onepager.points_forts.map((p: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="text-center text-muted-foreground py-8">One-pager non disponible</div>
      )}
    </div>
  );
};

export default OnePagerViewer;
