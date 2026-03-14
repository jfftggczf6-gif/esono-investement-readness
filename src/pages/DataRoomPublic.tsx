import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FolderOpen, Shield, TrendingUp, Users, Leaf, Building2,
  FileText, Download, Lock, Loader2, AlertTriangle, Eye,
} from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const CATEGORIES = [
  { id: 'legal',      label: 'Juridique & Corporate', icon: Shield,    color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  { id: 'finance',    label: 'Finance',               icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-200' },
  { id: 'commercial', label: 'Commercial',            icon: Users,     color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'team',       label: 'Équipe',                icon: Building2, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  { id: 'impact',     label: 'ESG & Impact',          icon: Leaf,      color: 'text-teal-600',   bg: 'bg-teal-50',   border: 'border-teal-200' },
];

const EVIDENCE_LABELS = ['N0', 'N1', 'N2', 'N3'];
const EVIDENCE_COLORS = [
  'bg-red-100 text-red-700',
  'bg-orange-100 text-orange-700',
  'bg-yellow-100 text-yellow-700',
  'bg-green-100 text-green-700',
];

interface DocEntry {
  id: string;
  category: string;
  label: string;
  filename: string;
  file_size: number | null;
  evidence_level: number;
  is_generated: boolean;
  deliverable_type: string | null;
}

interface EnterpriseInfo {
  name: string;
  sector: string;
  country: string;
  logo_url: string | null;
}

async function callDataRoom(action: string, token: string, slug: string, extra?: Record<string, any>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/access-data-room`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, token, slug, ...extra }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
  return json;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DataRoomPublic() {
  const { slug } = useParams<{ slug: string }>();
  const [token, setToken] = useState('');
  const [state, setState] = useState<'enter_token' | 'loading' | 'authenticated' | 'error'>('enter_token');
  const [enterprise, setEnterprise] = useState<EnterpriseInfo | null>(null);
  const [canDownload, setCanDownload] = useState(false);
  const [documents, setDocuments] = useState<DocEntry[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmitToken = async () => {
    if (!token.trim()) return;
    setState('loading');
    try {
      const res = await callDataRoom('validate', token.trim(), slug || '');
      setEnterprise(res.enterprise);
      setCanDownload(res.can_download);
      setExpiresAt(res.expires_at);

      const docsRes = await callDataRoom('documents', token.trim(), slug || '');
      setDocuments(docsRes.documents || []);
      setState('authenticated');
    } catch (e: any) {
      setErrorMsg(e.message || 'Token invalide');
      setState('error');
    }
  };

  const handleDownload = async (doc: DocEntry) => {
    if (!canDownload) return;
    setDownloadingId(doc.id);
    try {
      const res = await callDataRoom('download', token.trim(), slug || '', { document_id: doc.id });
      const a = document.createElement('a');
      a.href = res.download_url;
      a.download = res.filename;
      a.click();
    } catch (e: any) {
      toast.error(e.message || 'Erreur téléchargement');
    }
    setDownloadingId(null);
  };

  const docsByCategory = (catId: string) => documents.filter(d => d.category === catId);

  // ── Token entry screen ───────────────────────────────────────────────────
  if (state === 'enter_token' || state === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(222,47%,11%)] via-[hsl(222,47%,16%)] to-[hsl(222,47%,22%)] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-display font-black text-white">Data Room</h1>
            <p className="text-white/50 text-sm mt-2">ESONO Investment Readiness</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Lock className="h-4 w-4" />
              <span>Saisissez votre code d'accès</span>
            </div>
            <input
              type="text"
              value={token}
              onChange={e => setToken(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmitToken()}
              placeholder="Collez votre token ici…"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 font-mono"
              autoFocus
            />
            {state === 'error' && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {errorMsg}
              </div>
            )}
            <Button
              onClick={handleSubmitToken}
              disabled={!token.trim()}
              className="w-full bg-white text-gray-900 hover:bg-white/90 font-bold"
            >
              Accéder à la Data Room
            </Button>
            <p className="text-[11px] text-white/30 text-center">
              Code transmis par l'entreprise séparément du lien
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Authenticated: show documents ────────────────────────────────────────
  const totalDocs = documents.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            {enterprise?.logo_url ? (
              <img src={enterprise.logo_url} alt="logo" className="h-7 w-7 rounded object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-sm font-display font-bold text-primary-foreground">
                  {(enterprise?.name || 'E').charAt(0)}
                </span>
              </div>
            )}
            <div>
              <p className="font-display font-bold text-sm">{enterprise?.name}</p>
              <p className="text-[10px] text-muted-foreground">{enterprise?.sector} · {enterprise?.country}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {expiresAt && (
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Accès jusqu'au {new Date(expiresAt).toLocaleDateString('fr-FR')}
              </p>
            )}
            <Badge variant="outline" className="text-xs gap-1 text-green-700 border-green-300 bg-green-50">
              <Eye className="h-3 w-3" /> {canDownload ? 'Lecture + Téléchargement' : 'Lecture seule'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container py-8 max-w-4xl space-y-6">
        <div>
          <h2 className="text-xl font-display font-black">Data Room — {enterprise?.name}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {totalDocs} document{totalDocs !== 1 ? 's' : ''} disponible{totalDocs !== 1 ? 's' : ''}
            {!canDownload && ' — Mode lecture seule'}
          </p>
        </div>

        {totalDocs === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucun document partagé pour l'instant</p>
          </div>
        )}

        {CATEGORIES.map(cat => {
          const catDocs = docsByCategory(cat.id);
          if (catDocs.length === 0) return null;
          const Icon = cat.icon;
          return (
            <Card key={cat.id} className={`border ${cat.border}`}>
              <CardHeader className="py-3 px-5">
                <div className="flex items-center gap-2.5">
                  <div className={`h-8 w-8 rounded-lg ${cat.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${cat.color}`} />
                  </div>
                  <CardTitle className="text-sm font-bold">{cat.label}</CardTitle>
                  <Badge variant="secondary" className="text-xs ml-auto">{catDocs.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {catDocs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 px-5 py-3">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {doc.filename}
                          {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}
                          {doc.is_generated ? ' · Généré par IA' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${EVIDENCE_COLORS[Math.min(doc.evidence_level, 3)]}`}>
                          {EVIDENCE_LABELS[Math.min(doc.evidence_level, 3)]}
                        </span>
                        {canDownload && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs gap-1"
                            disabled={downloadingId === doc.id}
                            onClick={() => handleDownload(doc)}
                          >
                            {downloadingId === doc.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Download className="h-3 w-3" />}
                            Télécharger
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        <p className="text-center text-xs text-muted-foreground pt-4 border-t">
          Powered by ESONO Investment Readiness · Accès confidentiel
        </p>
      </div>
    </div>
  );
}
