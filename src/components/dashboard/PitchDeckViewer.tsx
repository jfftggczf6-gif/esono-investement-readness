import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Download, ChevronLeft, ChevronRight, Presentation } from 'lucide-react';
import { toast } from 'sonner';

interface PitchDeckViewerProps {
  data: any;
}

const SLIDE_LAYOUTS: Record<string, string> = {
  cover: 'Couverture',
  problem: 'Problème',
  solution: 'Solution',
  market: 'Marché',
  business_model: 'Modèle Éco.',
  traction: 'Traction',
  roadmap: 'Roadmap',
  team: 'Équipe',
  financials: 'Finances',
  esg: 'ESG & Impact',
  deal: 'Deal',
  cta: 'CTA',
};

const PitchDeckViewer = ({ data }: PitchDeckViewerProps) => {
  const [activeSlide, setActiveSlide] = useState(0);

  if (!data) return <div className="p-6 text-center text-gray-400">Aucune donnée disponible</div>;

  const slides = data.slides || [];
  const pitchHtml = data.pitch_html || null;
  const score = data.score || 0;
  const metadata = data.metadata || {};

  const getScoreColor = (s: number) => {
    if (s >= 70) return 'bg-green-100 text-green-800 border-green-200';
    if (s >= 40) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const handleOpenNewTab = () => {
    if (!pitchHtml) return;
    const blob = new Blob([pitchHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleDownload = () => {
    if (!pitchHtml) return;
    const blob = new Blob([pitchHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pitch-deck-${metadata.company_name || 'entreprise'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!pitchHtml) return;
    navigator.clipboard.writeText(pitchHtml);
    toast.success('HTML copié dans le presse-papier');
  };

  const currentSlide = slides[activeSlide];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Badge className={`text-base px-3 py-1 border ${getScoreColor(score)}`}>
            {score}/100
          </Badge>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Presentation className="w-4 h-4" />
            <span>{slides.length} slides</span>
          </div>
        </div>
        {metadata.generated_at && (
          <p className="text-xs text-gray-400">
            Généré le {new Date(metadata.generated_at).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={handleCopy} disabled={!pitchHtml}>
          <Copy className="w-4 h-4 mr-1" /> Copier HTML
        </Button>
        <Button variant="outline" size="sm" onClick={handleOpenNewTab} disabled={!pitchHtml}>
          <ExternalLink className="w-4 h-4 mr-1" /> Ouvrir présentation
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={!pitchHtml}>
          <Download className="w-4 h-4 mr-1" /> Télécharger HTML
        </Button>
      </div>

      {/* HTML viewer */}
      {pitchHtml ? (
        <div className="border rounded-xl overflow-hidden bg-white" style={{ height: '65vh' }}>
          <iframe
            srcDoc={pitchHtml}
            className="w-full h-full"
            sandbox="allow-scripts allow-same-origin"
            title="Pitch Deck"
          />
        </div>
      ) : slides.length > 0 ? (
        /* Fallback: JSON slide navigator */
        <div className="space-y-3">
          {/* Slide thumbnails */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {slides.map((s: any, i: number) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`flex-shrink-0 text-[10px] px-2.5 py-1.5 rounded border font-medium transition-all ${
                  activeSlide === i
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {i + 1}. {SLIDE_LAYOUTS[s.layout] || s.title}
              </button>
            ))}
          </div>

          {/* Active slide content */}
          {currentSlide && (
            <div className="border rounded-xl bg-white overflow-hidden">
              <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-400 bg-blue-900/40 px-2 py-0.5 rounded">
                    {String(activeSlide + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-bold text-white">{currentSlide.title}</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setActiveSlide(i => Math.max(0, i - 1))}
                    disabled={activeSlide === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-500 self-center">{activeSlide + 1}/{slides.length}</span>
                  <button
                    onClick={() => setActiveSlide(i => Math.min(slides.length - 1, i + 1))}
                    disabled={activeSlide === slides.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <SlideContentRenderer slide={currentSlide} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-8">Pitch deck non disponible</div>
      )}
    </div>
  );
};

function SlideContentRenderer({ slide }: { slide: any }) {
  const c = slide.content || {};

  switch (slide.layout) {
    case 'cover':
      return (
        <div className="text-center py-8 space-y-3">
          {c.sector && <span className="text-xs uppercase tracking-widest text-blue-600 font-bold">{c.sector}</span>}
          <h1 className="text-3xl font-black text-gray-900">{c.company_name}</h1>
          <p className="text-lg text-gray-500">{c.tagline}</p>
          {c.headline_metric && <p className="text-2xl font-bold text-emerald-600">{c.headline_metric}</p>}
        </div>
      );
    case 'problem':
      return (
        <div className="space-y-3">
          <p className="text-base font-semibold text-gray-800">{c.problem_statement}</p>
          <div className="space-y-2">
            {(c.pain_points || []).map((p: string, i: number) => (
              <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-800">
                <span>⚠</span><span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case 'market':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'TAM', val: c.tam, cls: 'bg-blue-50 border-blue-200' },
              { label: 'SAM', val: c.sam, cls: 'bg-green-50 border-green-200' },
              { label: 'SOM', val: c.som, cls: 'bg-yellow-50 border-yellow-200' },
            ].map(m => (
              <div key={m.label} className={`text-center rounded-xl border p-4 ${m.cls}`}>
                <div className="text-xs font-black uppercase tracking-wider text-gray-500">{m.label}</div>
                <div className="text-sm font-bold text-gray-900 mt-2">{m.val}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">📈 {c.growth_rate} — {c.market_trend}</p>
        </div>
      );
    case 'deal':
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl font-black text-blue-700">{c.amount_sought}</span>
            <span className="text-sm bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-lg font-semibold">{c.instrument}</span>
          </div>
          {(c.use_of_funds || []).map((u: any, i: number) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="h-2 bg-blue-600 rounded-full opacity-70" style={{ width: u.percentage }} />
              <span className="flex-1 text-gray-700">{u.category}</span>
              <span className="font-bold text-blue-700">{u.percentage}</span>
            </div>
          ))}
        </div>
      );
    default:
      return (
        <div className="space-y-2">
          {Object.entries(c).map(([key, val]) => {
            if (!val || (Array.isArray(val) && val.length === 0)) return null;
            return (
              <div key={key} className="text-sm">
                <span className="font-semibold text-gray-500 text-xs uppercase tracking-wide">{key.replace(/_/g, ' ')} </span>
                {Array.isArray(val) ? (
                  <ul className="mt-1 space-y-1">
                    {(val as any[]).map((item, i) => (
                      <li key={i} className="text-gray-700 text-sm">
                        {typeof item === 'object' ? JSON.stringify(item) : `• ${item}`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-800">{String(val)}</span>
                )}
              </div>
            );
          })}
        </div>
      );
  }
}

export default PitchDeckViewer;
