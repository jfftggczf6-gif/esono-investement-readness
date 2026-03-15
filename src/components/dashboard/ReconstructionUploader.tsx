import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileText, X, Wand2, CheckCircle2, AlertTriangle, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ReconstructionUploaderProps {
  enterpriseId: string;
  onComplete: (data: Record<string, any>) => void;
}

const ACCEPTED_TYPES = [
  '.csv', '.txt', '.md',
  '.xlsx', '.xls',
  '.docx', '.doc',
  '.pdf',
];

const CONFIDENCE_COLOR = (c: number) => {
  if (c >= 70) return 'text-green-700 bg-green-50 border-green-200';
  if (c >= 40) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
};

const FIELD_LABELS: Record<string, string> = {
  chiffre_affaires: "Chiffre d'affaires",
  achats_matieres: 'Achats matières',
  charges_personnel: 'Charges personnel',
  charges_externes: 'Charges externes',
  tresorerie: 'Trésorerie',
  capitaux_propres: 'Capitaux propres',
};

interface UploadedFile {
  name: string;
  size: number;
  file: File;
}

export default function ReconstructionUploader({ enterpriseId, onComplete }: ReconstructionUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'reconstructing' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const valid: UploadedFile[] = [];
    Array.from(incoming).forEach(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (ACCEPTED_TYPES.includes(ext)) {
        valid.push({ name: f.name, size: f.size, file: f });
      } else {
        toast.warning(`Format non supporté : ${f.name} (images non traitées en Mode Reconstruction)`);
      }
    });
    setFiles(prev => [...prev, ...valid].slice(0, 10));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleReconstruct = async () => {
    if (files.length === 0) {
      toast.error('Uploadez au moins un document');
      return;
    }

    setStatus('uploading');
    setProgress(10);

    try {
      // 1. Upload files to Supabase Storage
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const path = `${enterpriseId}/${Date.now()}_${f.name}`;
        const { error } = await supabase.storage.from('documents').upload(path, f.file, { upsert: true });
        if (error) throw new Error(`Upload échoué pour ${f.name}: ${error.message}`);
        setProgress(10 + Math.round(((i + 1) / files.length) * 40));
      }

      setStatus('reconstructing');
      setProgress(55);
      toast.info('Reconstruction en cours…', { duration: 10000 });

      // 2. Call reconstruction edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expirée');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reconstruct-from-traces`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enterprise_id: enterpriseId }),
          signal: AbortSignal.timeout(180000),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Erreur ${response.status}`);
      }

      const json = await response.json();
      setProgress(100);
      setStatus('done');
      setResult(json.data);
      toast.success('Reconstruction terminée');
    } catch (e: any) {
      setStatus('idle');
      setProgress(0);
      toast.error(e.message || 'Erreur lors de la reconstruction');
    }
  };

  if (status === 'done' && result) {
    const report = result.reconstruction_report;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Reconstruction terminée</p>
            <p className="text-xs text-green-700">Score de confiance global : {result.score}/100 — {result.fiabilite}</p>
          </div>
        </div>

        {/* Confidence by field */}
        {report?.confidence_by_field && (
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold">Confiance par donnée</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {Object.entries(report.confidence_by_field).map(([key, val]: [string, any]) => (
                  <div key={key} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground">{FIELD_LABELS[key] || key}</span>
                      {val.source && (
                        <p className="text-xs text-muted-foreground truncate">{val.source}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {val.estimated && (
                        <Badge variant="outline" className="text-[10px] py-0 text-amber-600 border-amber-300">
                          Estimé
                        </Badge>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${CONFIDENCE_COLOR(val.confidence)}`}>
                        {val.confidence}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assumptions */}
        {(report?.assumptions || []).length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Hypothèses utilisées
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-4">
              <ul className="space-y-1.5">
                {report.assumptions.map((a: string, i: number) => (
                  <li key={i} className="text-xs text-amber-800">• {a}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Analyst note */}
        {report?.analyst_note && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5 border">
            <span className="font-medium">Note de l'analyste :</span> {report.analyst_note}
          </p>
        )}

        <div className="flex gap-2">
          <Button size="sm" onClick={() => onComplete(result)}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Utiliser ces données
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setStatus('idle'); setResult(null); setFiles([]); setProgress(0); }}>
            <Edit3 className="h-4 w-4 mr-1" /> Recommencer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/40 hover:bg-muted/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
        <Wand2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium text-sm text-foreground mb-1">Uploadez tout ce que vous avez</p>
        <p className="text-xs text-muted-foreground">
          Relevés bancaires, factures, listes clients, fichiers Excel, tableaux…
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-2">
          Formats : CSV, TXT, Excel, Word, PDF — max 10 fichiers
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border bg-background text-sm">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{f.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(f.size)}</p>
              </div>
              <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Progress */}
      {(status === 'uploading' || status === 'reconstructing') && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{status === 'uploading' ? 'Envoi des fichiers…' : 'Reconstruction en cours…'}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
          {status === 'reconstructing' && (
            <p className="text-xs text-muted-foreground text-center">
              L'IA analyse vos documents et reconstitue les données financières…
            </p>
          )}
        </div>
      )}

      <Button
        onClick={handleReconstruct}
        disabled={files.length === 0 || status !== 'idle'}
        className="w-full gap-2"
      >
        <Wand2 className="h-4 w-4" />
        {files.length === 0 ? 'Ajoutez des documents' : `Reconstruire depuis ${files.length} fichier${files.length > 1 ? 's' : ''}`}
      </Button>

      <p className="text-[11px] text-muted-foreground text-center">
        Les images (JPG, PNG) ne sont pas traitées — utilisez des fichiers PDF ou Excel si possible.
      </p>
    </div>
  );
}
