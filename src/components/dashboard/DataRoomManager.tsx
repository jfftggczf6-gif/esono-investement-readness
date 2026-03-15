import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Upload, FileText, Trash2, Share2, Link, Eye, EyeOff,
  Shield, TrendingUp, Users, Leaf, Building2, AlertTriangle, Loader2, Copy, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DataRoomManagerProps {
  enterpriseId: string;
  enterpriseName: string;
  enterpriseSlug?: string | null;
}

const CATEGORIES = [
  { id: 'legal',      label: 'Juridique & Corporate', icon: Shield,   color: 'text-blue-600',    bg: 'bg-blue-50',   border: 'border-blue-200',   examples: 'RCCM, statuts, NIF, PV AG, registre' },
  { id: 'finance',    label: 'Finance',               icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-200',  examples: 'Bilan, CdR, relevés, budget, proforma' },
  { id: 'commercial', label: 'Commercial',            icon: Users,    color: 'text-orange-600',  bg: 'bg-orange-50', border: 'border-orange-200', examples: 'Contrats clients, factures, pipeline' },
  { id: 'team',       label: 'Équipe',                icon: Building2, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', examples: 'CVs fondateurs, organigramme' },
  { id: 'impact',     label: 'ESG & Impact',          icon: Leaf,     color: 'text-teal-600',    bg: 'bg-teal-50',   border: 'border-teal-200',   examples: 'Rapport RSE, indicateurs ODD, certifs' },
];

const EVIDENCE_LABELS = ['N0 Déclaratif', 'N1 Faible', 'N2 Intermédiaire', 'N3 Solide'];
const EVIDENCE_COLORS = [
  'bg-red-100 text-red-700 border-red-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'bg-green-100 text-green-700 border-green-200',
];

interface DataRoomDocument {
  id: string;
  category: string;
  label: string;
  filename: string;
  file_size: number | null;
  evidence_level: number;
  is_generated: boolean;
  deliverable_type: string | null;
  created_at: string;
}

interface ShareEntry {
  id: string;
  investor_email: string | null;
  investor_name: string | null;
  access_token: string;
  expires_at: string | null;
  can_download: boolean;
  viewed_at: string | null;
  created_at: string;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DataRoomManager({ enterpriseId, enterpriseName: _enterpriseName, enterpriseSlug: initialSlug }: DataRoomManagerProps) {
  const [documents, setDocuments] = useState<DataRoomDocument[]>([]);
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [resolvedSlug, setResolvedSlug] = useState<string>(initialSlug || '');

  // Share form state
  const [shareForm, setShareForm] = useState({ name: '', email: '', days: 30, can_download: true });
  const [sharing, setSharing] = useState(false);

  const ensureSlug = async (): Promise<string> => {
    if (resolvedSlug) return resolvedSlug;
    const generated = `${enterpriseId.slice(0, 8)}-${Date.now().toString(36)}`;
    await (supabase as any).from('enterprises').update({ data_room_slug: generated, data_room_enabled: true }).eq('id', enterpriseId);
    setResolvedSlug(generated);
    return generated;
  };

  const load = async () => {
    setLoading(true);
    const [{ data: docs }, { data: shareRows }] = await Promise.all([
      (supabase as any).from('data_room_documents').select('*').eq('enterprise_id', enterpriseId).order('created_at', { ascending: false }),
      (supabase as any).from('data_room_shares').select('*').eq('enterprise_id', enterpriseId).order('created_at', { ascending: false }),
    ]);
    setDocuments((docs as DataRoomDocument[]) || []);
    setShares((shareRows as ShareEntry[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (initialSlug) setResolvedSlug(initialSlug);
    load();
  }, [enterpriseId]);

  const handleUploadClick = (categoryId: string) => {
    setPendingCategory(categoryId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !pendingCategory) return;
    e.target.value = '';

    setUploadingCategory(pendingCategory);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expirée');

      for (const file of Array.from(files)) {
        const path = `${enterpriseId}/dataroom/${pendingCategory}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
        if (uploadError) throw new Error(uploadError.message);

        const { error: dbError } = await (supabase as any).from('data_room_documents').insert({
          enterprise_id: enterpriseId,
          category: pendingCategory,
          label: file.name.replace(/\.[^/.]+$/, ''),
          filename: file.name,
          storage_path: path,
          file_size: file.size,
          evidence_level: 1,
          is_generated: false,
          uploaded_by: session.user.id,
        });
        if (dbError) throw new Error(dbError.message);
      }
      toast.success(`${Array.from(files).length} fichier(s) ajouté(s)`);
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Erreur upload');
    }
    setUploadingCategory(null);
    setPendingCategory(null);
  };

  const handleDeleteDoc = async (doc: DataRoomDocument) => {
    await supabase.storage.from('documents').remove([doc.filename]);
    await (supabase as any).from('data_room_documents').delete().eq('id', doc.id);
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
    toast.success('Document supprimé');
  };

  const handleCreateShare = async () => {
    if (!shareForm.name.trim() || !shareForm.email.trim()) {
      toast.error('Nom et email requis');
      return;
    }
    setSharing(true);
    try {
      const expiresAt = new Date(Date.now() + shareForm.days * 24 * 60 * 60 * 1000).toISOString();
      const { data: _data, error } = await (supabase as any).from('data_room_shares').insert({
        enterprise_id: enterpriseId,
        investor_name: shareForm.name,
        investor_email: shareForm.email,
        expires_at: expiresAt,
        can_download: shareForm.can_download,
      }).select().single();
      if (error) throw new Error(error.message);

      // Enable data room + ensure slug exists
      const slug = await ensureSlug();
      await (supabase as any).from('enterprises').update({ data_room_enabled: true, data_room_slug: slug }).eq('id', enterpriseId);

      toast.success(`Partage créé pour ${shareForm.name}`);
      setShowShareModal(false);
      setShareForm({ name: '', email: '', days: 30, can_download: true });
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Erreur création partage');
    }
    setSharing(false);
  };

  const handleRevokeShare = async (shareId: string) => {
    await (supabase as any).from('data_room_shares').delete().eq('id', shareId);
    setShares(prev => prev.filter(s => s.id !== shareId));
    toast.success('Accès révoqué');
  };

  const copyLink = async (_share: ShareEntry) => {
    // Token is sent separately — link only contains the slug
    const slug = await ensureSlug();
    const link = `${window.location.origin}/dataroom/${slug}`;
    navigator.clipboard.writeText(link);
    toast.success('Lien copié — envoyez le token séparément à l\'investisseur');
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success('Token d\'accès copié');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const docsByCategory = (catId: string) => documents.filter(d => d.category === catId);
  const totalDocs = documents.length;
  const totalShares = shares.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-base">Data Room</h3>
          <p className="text-xs text-muted-foreground">{totalDocs} document{totalDocs !== 1 ? 's' : ''} · {totalShares} partage{totalShares !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setShowShareModal(true)} className="gap-2">
          <Share2 className="h-4 w-4" /> Partager avec un investisseur
        </Button>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {CATEGORIES.map(cat => {
          const catDocs = docsByCategory(cat.id);
          const Icon = cat.icon;
          const isUploading = uploadingCategory === cat.id;
          return (
            <Card key={cat.id} className={`border ${cat.border}`}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-lg ${cat.bg} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${cat.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-foreground">{cat.label}</CardTitle>
                      <p className="text-[10px] text-muted-foreground">{cat.examples}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {catDocs.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{catDocs.length}</Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUploading}
                      onClick={() => handleUploadClick(cat.id)}
                      className="text-xs h-7 px-2.5"
                    >
                      {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                      Ajouter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {catDocs.length > 0 && (
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-50">
                    {catDocs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 px-4 py-2.5">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.label || doc.filename}</p>
                          <p className="text-[10px] text-muted-foreground">{formatSize(doc.file_size)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {doc.is_generated && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 text-blue-600 border-blue-200">
                              IA
                            </Badge>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${EVIDENCE_COLORS[Math.min(doc.evidence_level, 3)]}`}>
                            {EVIDENCE_LABELS[Math.min(doc.evidence_level, 3)]}
                          </span>
                          <button
                            onClick={() => handleDeleteDoc(doc)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
              {catDocs.length === 0 && (
                <CardContent className="px-4 pb-3 pt-0">
                  <p className="text-[11px] text-muted-foreground/60 italic">Aucun document — cliquez sur Ajouter</p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Active Shares */}
      {shares.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Partages actifs</h4>
          {shares.map(share => {
            const isExpired = share.expires_at ? new Date(share.expires_at) < new Date() : false;
            return (
              <div key={share.id} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${isExpired ? 'bg-red-50 border-red-200' : 'bg-white border-border'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{share.investor_name || 'Investisseur'}</span>
                    {share.investor_email && <span className="text-muted-foreground text-xs">{share.investor_email}</span>}
                    {isExpired && <Badge variant="outline" className="text-xs text-red-600 border-red-300">Expiré</Badge>}
                    {share.viewed_at && <Badge variant="outline" className="text-xs text-green-600 border-green-300 flex items-center gap-1"><Eye className="h-2.5 w-2.5" /> Vu</Badge>}
                    {!share.viewed_at && !isExpired && <Badge variant="outline" className="text-xs text-muted-foreground flex items-center gap-1"><EyeOff className="h-2.5 w-2.5" /> Pas encore vu</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {share.can_download ? '⬇ Téléchargement autorisé' : '👁 Lecture seule'} ·
                    Expire le {share.expires_at ? new Date(share.expires_at).toLocaleDateString('fr-FR') : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={() => copyLink(share)}>
                    <Link className="h-3 w-3" /> Lien
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={() => copyToken(share.access_token)}>
                    <Copy className="h-3 w-3" /> Token
                  </Button>
                  <button
                    onClick={() => handleRevokeShare(share.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    title="Révoquer l'accès"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg"
      />

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-display font-bold">Partager la Data Room</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              L'investisseur recevra un lien + un token d'accès séparé. Le token n'est jamais dans l'URL.
            </p>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Nom de l'investisseur <span className="text-destructive">*</span></label>
              <input
                type="text"
                value={shareForm.name}
                onChange={e => setShareForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ex: Proparco / Jean Dupont"
                className="w-full mt-1 rounded-md border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
              <input
                type="email"
                value={shareForm.email}
                onChange={e => setShareForm(f => ({ ...f, email: e.target.value }))}
                placeholder="investisseur@fonds.com"
                className="w-full mt-1 rounded-md border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expiration</label>
              <select
                value={shareForm.days}
                onChange={e => setShareForm(f => ({ ...f, days: parseInt(e.target.value) }))}
                className="w-full mt-1 rounded-md border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value={7}>7 jours</option>
                <option value={14}>14 jours</option>
                <option value={30}>30 jours</option>
                <option value={60}>60 jours</option>
                <option value={90}>90 jours</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shareForm.can_download}
                onChange={e => setShareForm(f => ({ ...f, can_download: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Autoriser le téléchargement</span>
            </label>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Sécurité</p>
              <p>Envoyez le lien et le token dans deux messages séparés. Ne mettez jamais le token dans le lien.</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowShareModal(false)}>Annuler</Button>
              <Button size="sm" onClick={handleCreateShare} disabled={sharing} className="gap-2">
                {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Créer le partage
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
