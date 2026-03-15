import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, Upload, Share2, Download, Settings, AlertCircle } from 'lucide-react';

interface ActivityEntry {
  id: string;
  action: string;
  actor_role: string | null;
  resource_type: string | null;
  deliverable_type: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface ActivityTimelineProps {
  enterpriseId: string;
  limit?: number;
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  generate:       { icon: Sparkles, color: 'text-blue-600 bg-blue-50',    label: 'Génération' },
  upload:         { icon: Upload,   color: 'text-indigo-600 bg-indigo-50', label: 'Upload' },
  share:          { icon: Share2,   color: 'text-emerald-600 bg-emerald-50', label: 'Partage' },
  download:       { icon: Download, color: 'text-gray-600 bg-gray-100',   label: 'Téléchargement' },
  mode_change:    { icon: Settings, color: 'text-purple-600 bg-purple-50', label: 'Mode changé' },
  reconstruction: { icon: Sparkles, color: 'text-amber-600 bg-amber-50',  label: 'Reconstruction' },
};

const DELIVERABLE_LABELS: Record<string, string> = {
  bmc_analysis:    'Business Model Canvas',
  sic_analysis:    'Social Impact Canvas',
  inputs_data:     'Données Financières',
  framework_data:  'Plan Financier',
  plan_ovo:        'Plan OVO',
  business_plan:   'Business Plan',
  odd_analysis:    'Analyse ODD',
  diagnostic_data: 'Diagnostic Expert',
  gap_analysis:    'Gap Analysis',
  investment_memo: 'Mémo Investisseur',
  onepager:        'One-Pager',
  pitch_deck:      'Pitch Deck',
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `il y a ${days}j`;
  if (hours > 0) return `il y a ${hours}h`;
  if (mins > 0) return `il y a ${mins} min`;
  return "À l'instant";
}

function buildActionLabel(entry: ActivityEntry): string {
  const config = ACTION_CONFIG[entry.action];
  const base = config?.label || entry.action;
  const deliv = entry.deliverable_type ? DELIVERABLE_LABELS[entry.deliverable_type] || entry.deliverable_type : null;
  const meta = entry.metadata || {};

  switch (entry.action) {
    case 'generate':
      return `${deliv || 'Livrable'} généré${meta.score !== undefined ? ` · Score ${meta.score}/100` : ''}`;
    case 'upload':
      return `Document uploadé${meta.filename ? ` · ${meta.filename}` : ''}`;
    case 'share':
      return `Data Room partagée${meta.investor_name ? ` avec ${meta.investor_name}` : ''}`;
    case 'download':
      return `${deliv || 'Fichier'} téléchargé`;
    case 'mode_change':
      return `Mode changé → ${meta.new_mode || ''}`;
    case 'reconstruction':
      return `Reconstruction depuis traces${meta.files_count ? ` · ${meta.files_count} fichiers` : ''}`;
    default:
      return base;
  }
}

export default function ActivityTimeline({ enterpriseId, limit = 20 }: ActivityTimelineProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await (supabase as any)
          .from('activity_log')
          .select('*')
          .eq('enterprise_id', enterpriseId)
          .order('created_at', { ascending: false })
          .limit(limit);
        setEntries((data as ActivityEntry[]) || []);
      } catch (_) { /* silent */ }
      setLoading(false);
    };
    load();
  }, [enterpriseId, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <AlertCircle className="h-5 w-5 mx-auto mb-2 opacity-40" />
        Aucune activité enregistrée
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, i) => {
        const config = ACTION_CONFIG[entry.action] || { icon: Sparkles, color: 'text-gray-500 bg-gray-100', label: entry.action };
        const Icon = config.icon;
        const isLast = i === entries.length - 1;

        return (
          <div key={entry.id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full ${config.color} flex items-center justify-center flex-shrink-0 border-2 border-background`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-1" />}
            </div>

            {/* Content */}
            <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-foreground leading-tight">{buildActionLabel(entry)}</p>
                  {entry.actor_role && (
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {entry.actor_role === 'coach' ? '👨‍🏫 Coach' : entry.actor_role === 'system' ? '🤖 Système' : '👤 Entrepreneur'}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {formatRelativeTime(entry.created_at)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
