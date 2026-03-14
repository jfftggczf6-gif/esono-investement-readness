import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, Wand2, FolderOpen, CheckCircle2, ChevronRight } from 'lucide-react';

type OperatingMode = 'assisted' | 'reconstruction' | 'due_diligence';

interface ModeSelectionModalProps {
  open: boolean;
  onSelect: (mode: OperatingMode) => void;
}

const MODES = [
  {
    id: 'assisted' as OperatingMode,
    icon: Search,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    selectedBorder: 'border-blue-500',
    selectedBg: 'bg-blue-50/80',
    title: 'Mode Assisté',
    subtitle: "Vous avez les infos mais rien n'est formalisé",
    desc: "On vous guide étape par étape pour saisir vos données financières et commerciales. Idéal si vous démarrez.",
    features: [
      'Formulaires guidés avec explications simples',
      'Calcul automatique des KPIs depuis vos saisies',
      'Reprise possible à tout moment',
    ],
    badge: 'Recommandé pour démarrer',
  },
  {
    id: 'reconstruction' as OperatingMode,
    icon: Wand2,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    selectedBorder: 'border-amber-500',
    selectedBg: 'bg-amber-50/80',
    title: 'Mode Reconstruction',
    subtitle: 'Vous avez peu de documents — on va reconstituer',
    desc: "Uploadez tout ce que vous avez : relevés, factures, fichiers Excel partiels. L'IA reconstruit votre situation financière depuis vos traces.",
    features: [
      'Accepte tout type de document fragmentaire',
      'Score de confiance par donnée reconstituée',
      'Hypothèses documentées et corrigeables',
    ],
    badge: 'Pour PME peu documentées',
  },
  {
    id: 'due_diligence' as OperatingMode,
    icon: FolderOpen,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    selectedBorder: 'border-emerald-500',
    selectedBg: 'bg-emerald-50/80',
    title: 'Due Diligence Complète',
    subtitle: "Vous avez des documents — besoin d'un dossier investisseur",
    desc: "Uploadez vos documents structurés. Le système génère le dossier complet + active la Data Room pour partager avec les investisseurs.",
    features: [
      'Upload de documents structurés (bilan, contrats)',
      'Pipeline complet vers Investment Memo + Pitch Deck',
      'Data Room partageable avec les fonds',
    ],
    badge: 'Pour PME avancées',
  },
];

export default function ModeSelectionModal({ open, onSelect }: ModeSelectionModalProps) {
  const [selected, setSelected] = useState<OperatingMode>('assisted');

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-lg font-display font-bold">
            Comment souhaitez-vous démarrer ?
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Choisissez le mode adapté à votre situation. Vous pourrez le changer ultérieurement.
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {MODES.map(mode => {
            const Icon = mode.icon;
            const isSelected = selected === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelected(mode.id)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                  isSelected
                    ? `${mode.selectedBorder} ${mode.selectedBg} shadow-sm`
                    : `border-border hover:border-muted-foreground/30 hover:bg-muted/30`
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-9 w-9 rounded-lg ${mode.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${mode.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{mode.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${mode.bg} ${mode.color}`}>
                        {mode.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{mode.subtitle}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">{mode.desc}</p>
                    {isSelected && (
                      <ul className="mt-2 space-y-1">
                        {mode.features.map(f => (
                          <li key={f} className="flex items-center gap-2 text-xs text-foreground/80">
                            <CheckCircle2 className={`h-3 w-3 flex-shrink-0 ${mode.color}`} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {isSelected && (
                    <div className={`flex-shrink-0 h-5 w-5 rounded-full ${mode.bg} border-2 ${mode.selectedBorder} flex items-center justify-center`}>
                      <div className={`h-2 w-2 rounded-full ${mode.color.replace('text-', 'bg-')}`} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end mt-2">
          <Button onClick={() => onSelect(selected)} className="gap-2">
            Démarrer en mode {MODES.find(m => m.id === selected)?.title}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
