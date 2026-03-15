import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft, CheckCircle2, HelpCircle, Calculator } from 'lucide-react';
import { toast } from 'sonner';

interface InputsWizardProps {
  enterpriseId: string;
  initialData?: Record<string, any>;
  onComplete: (data: Record<string, any>) => void;
  onCancel?: () => void;
}

type FieldValue = number | null | 'unknown';

interface WizardField {
  key: string;
  label: string;
  tooltip: string;
  unit?: string;
  computed?: boolean;
}

interface WizardStep {
  id: string;
  title: string;
  subtitle: string;
  fields: WizardField[];
}

const STEPS: WizardStep[] = [
  {
    id: 'compte_resultat',
    title: 'Compte de Résultat',
    subtitle: "Vos revenus et charges sur l'année",
    fields: [
      { key: 'chiffre_affaires',         label: "Chiffre d'affaires (CA)",       tooltip: "Total des ventes de produits ou services sur l'année. Avant toute déduction." },
      { key: 'achats_matieres',           label: 'Achats et matières premières',  tooltip: "Coût des marchandises, matières premières achetées pour produire vos biens ou services." },
      { key: 'charges_personnel',         label: 'Charges de personnel',          tooltip: "Salaires, charges sociales, cotisations — tout ce qui concerne vos employés." },
      { key: 'charges_externes',          label: 'Charges externes',              tooltip: "Loyer, électricité, transport, sous-traitance, frais divers de fonctionnement." },
      { key: 'dotations_amortissements',  label: 'Amortissements',               tooltip: "Dépréciation de vos équipements. Si vous ne savez pas, laissez à 0 ou cochez 'Je ne sais pas'." },
      { key: 'charges_financieres',       label: 'Charges financières',           tooltip: "Intérêts payés sur vos emprunts et crédits bancaires." },
    ],
  },
  {
    id: 'bilan_actif',
    title: 'Bilan — Actif',
    subtitle: 'Ce que possède votre entreprise',
    fields: [
      { key: 'immobilisations', label: 'Immobilisations (équipements, bâtiments)', tooltip: "Valeur de vos machines, véhicules, locaux, équipements informatiques — biens durables de l'entreprise." },
      { key: 'stocks',          label: 'Stocks',                                   tooltip: "Valeur de vos marchandises, matières premières et produits finis en stock à la date de clôture." },
      { key: 'creances_clients',label: 'Créances clients',                         tooltip: "Sommes que vos clients vous doivent mais n'ont pas encore payé (factures en attente)." },
      { key: 'tresorerie',      label: 'Trésorerie (cash + banque)',               tooltip: "Argent disponible en caisse + soldes de comptes bancaires à la date de clôture." },
    ],
  },
  {
    id: 'bilan_passif',
    title: 'Bilan — Passif',
    subtitle: 'Ce que doit votre entreprise',
    fields: [
      { key: 'capitaux_propres', label: "Capital et réserves (capitaux propres)", tooltip: "Capital social + bénéfices accumulés non distribués. C'est 'l'argent des associés' dans l'entreprise." },
      { key: 'dettes_lt',        label: 'Dettes à long terme (> 1 an)',           tooltip: "Emprunts bancaires remboursables sur plus d'un an (crédit d'équipement, etc.)." },
      { key: 'dettes_ct',        label: 'Dettes à court terme (< 1 an)',          tooltip: "Dettes bancaires court terme, découverts, lignes de crédit à rembourser dans l'année." },
      { key: 'fournisseurs',     label: 'Dettes fournisseurs',                    tooltip: "Factures de fournisseurs que vous avez reçues mais pas encore payées." },
    ],
  },
  {
    id: 'effectifs',
    title: 'Effectifs',
    subtitle: 'Votre équipe',
    fields: [
      { key: 'total',   label: "Nombre total d'employés",          tooltip: "Tous les employés permanents (CDI, CDD). Ne pas compter les prestataires externes." },
      { key: 'cadres',  label: "Dont cadres / managers",           tooltip: "Employés avec des responsabilités managériales ou techniques supérieures." },
      { key: 'employes',label: "Dont employés et ouvriers",        tooltip: "Employés d'exécution, opérateurs, techniciens." },
    ],
  },
  {
    id: 'recap',
    title: 'Récapitulatif',
    subtitle: 'Vérifiez vos données avant validation',
    fields: [], // rendered separately
  },
];

function formatAmount(val: number): string {
  return new Intl.NumberFormat('fr-FR').format(val);
}

function parseInput(raw: string): number | null {
  const cleaned = raw.replace(/[\s,]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

interface FieldInputProps {
  field: WizardField;
  value: FieldValue;
  onChange: (key: string, value: FieldValue) => void;
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  const [rawInput, setRawInput] = useState(
    value !== null && value !== 'unknown' ? String(value) : ''
  );
  const [showTooltip, setShowTooltip] = useState(false);
  const isUnknown = value === 'unknown';

  const handleBlur = () => {
    if (isUnknown) return;
    const parsed = parseInput(rawInput);
    onChange(field.key, parsed);
  };

  const toggleUnknown = () => {
    if (isUnknown) {
      onChange(field.key, null);
      setRawInput('');
    } else {
      onChange(field.key, 'unknown');
      setRawInput('');
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-foreground">{field.label}</label>
        <button
          type="button"
          onClick={() => setShowTooltip(s => !s)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </div>
      {showTooltip && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 border border-border">
          {field.tooltip}
        </p>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            disabled={isUnknown}
            value={isUnknown ? '' : rawInput}
            onChange={e => setRawInput(e.target.value)}
            onBlur={handleBlur}
            placeholder={isUnknown ? 'Je ne sais pas' : '0'}
            className={`w-full rounded-md border px-3 py-2 text-sm pr-16 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
              isUnknown
                ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                : 'bg-background border-border'
            }`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
            FCFA
          </span>
        </div>
        <button
          type="button"
          onClick={toggleUnknown}
          className={`flex-shrink-0 text-xs px-2.5 py-2 rounded-md border transition-all ${
            isUnknown
              ? 'bg-amber-50 border-amber-300 text-amber-700 font-medium'
              : 'border-border text-muted-foreground hover:border-amber-300 hover:text-amber-700'
          }`}
        >
          ?
        </button>
      </div>
      {!isUnknown && value !== null && value > 0 && (
        <p className="text-[10px] text-muted-foreground">
          = {formatAmount(value as number)} FCFA
        </p>
      )}
    </div>
  );
}

export default function InputsWizard({ enterpriseId: _enterpriseId, initialData, onComplete, onCancel }: InputsWizardProps) {
  const [step, setStep] = useState(0);

  // Flat state: key → value (number | null | 'unknown')
  const [values, setValues] = useState<Record<string, FieldValue>>(() => {
    const init: Record<string, FieldValue> = {};
    for (const s of STEPS) {
      for (const f of s.fields) {
        init[f.key] = initialData?.[f.key] ?? null;
      }
    }
    return init;
  });

  const handleChange = useCallback((key: string, value: FieldValue) => {
    setValues(v => ({ ...v, [key]: value }));
  }, []);

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const progressPct = Math.round(((step) / (STEPS.length - 1)) * 100);

  // Computed values
  const cr = values;
  const margebrute = (cr.chiffre_affaires as number || 0) - (cr.achats_matieres as number || 0);
  const resultatExploitation = margebrute
    - (cr.charges_personnel as number || 0)
    - (cr.charges_externes as number || 0)
    - (cr.dotations_amortissements as number || 0);
  const resultatNet = resultatExploitation - (cr.charges_financieres as number || 0);
  const totalActif = (cr.immobilisations as number || 0) + (cr.stocks as number || 0)
    + (cr.creances_clients as number || 0) + (cr.tresorerie as number || 0);
  const totalPassif = (cr.capitaux_propres as number || 0) + (cr.dettes_lt as number || 0)
    + (cr.dettes_ct as number || 0) + (cr.fournisseurs as number || 0);
  const margeBrutePct = cr.chiffre_affaires ? Math.round(margebrute / (cr.chiffre_affaires as number) * 100) : 0;
  const margeNettePct = cr.chiffre_affaires ? Math.round(resultatNet / (cr.chiffre_affaires as number) * 100) : 0;

  const handleComplete = () => {
    // Build inputs_data compatible structure
    const donnees_manquantes: string[] = [];
    Object.entries(values).forEach(([k, v]) => {
      if (v === 'unknown' || v === null) donnees_manquantes.push(k);
    });

    const data = {
      source: 'wizard',
      periode: `Exercice ${new Date().getFullYear() - 1}`,
      devise: 'FCFA',
      fiabilite: donnees_manquantes.length === 0 ? 'Élevée' : donnees_manquantes.length < 4 ? 'Moyenne' : 'Faible',
      compte_resultat: {
        chiffre_affaires:        (values.chiffre_affaires as number) || 0,
        achats_matieres:         (values.achats_matieres as number) || 0,
        charges_personnel:       (values.charges_personnel as number) || 0,
        charges_externes:        (values.charges_externes as number) || 0,
        dotations_amortissements:(values.dotations_amortissements as number) || 0,
        resultat_exploitation:   resultatExploitation,
        charges_financieres:     (values.charges_financieres as number) || 0,
        resultat_net:            resultatNet,
      },
      bilan: {
        actif: {
          immobilisations:  (values.immobilisations as number) || 0,
          stocks:           (values.stocks as number) || 0,
          creances_clients: (values.creances_clients as number) || 0,
          tresorerie:       (values.tresorerie as number) || 0,
          total_actif:      totalActif,
        },
        passif: {
          capitaux_propres: (values.capitaux_propres as number) || 0,
          dettes_lt:        (values.dettes_lt as number) || 0,
          dettes_ct:        (values.dettes_ct as number) || 0,
          fournisseurs:     (values.fournisseurs as number) || 0,
          total_passif:     totalPassif,
        },
      },
      effectifs: {
        total:    (values.total as number) || 0,
        cadres:   (values.cadres as number) || 0,
        employes: (values.employes as number) || 0,
      },
      kpis: {
        marge_brute_pct:       `${margeBrutePct}%`,
        marge_nette_pct:       `${margeNettePct}%`,
        ratio_endettement_pct: totalActif > 0
          ? `${Math.round(((values.dettes_lt as number || 0) + (values.dettes_ct as number || 0)) / totalActif * 100)}%`
          : '0%',
      },
      donnees_manquantes,
      hypotheses: donnees_manquantes.length > 0
        ? ['Données manquantes remplacées par 0 pour le calcul des ratios']
        : [],
      score: Math.round(100 - (donnees_manquantes.length / Object.keys(values).length) * 100),
    };

    toast.success('Données financières enregistrées');
    onComplete(data);
  };

  const RecapSection = () => (
    <div className="space-y-4">
      {/* P&L */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Compte de Résultat</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-1.5 text-sm">
            {[
              { l: "Chiffre d'affaires", v: values.chiffre_affaires },
              { l: 'Achats matières', v: values.achats_matieres, sub: true },
              { l: 'Marge brute', v: margebrute, computed: true },
              { l: 'Charges personnel', v: values.charges_personnel, sub: true },
              { l: 'Charges externes', v: values.charges_externes, sub: true },
              { l: 'Amortissements', v: values.dotations_amortissements, sub: true },
              { l: 'Résultat exploitation', v: resultatExploitation, computed: true },
              { l: 'Charges financières', v: values.charges_financieres, sub: true },
              { l: 'Résultat net', v: resultatNet, computed: true, bold: true },
            ].map(row => (
              <div key={row.l} className={`flex justify-between ${row.sub ? 'pl-3 text-muted-foreground' : ''} ${row.bold ? 'font-semibold border-t pt-1' : ''}`}>
                <span className={row.computed ? 'text-blue-700' : ''}>{row.l}</span>
                <span className={`font-mono ${row.v === 'unknown' ? 'text-amber-600 text-xs' : ''}`}>
                  {row.v === 'unknown' ? '?' : row.v !== null ? formatAmount(row.v as number) : '—'}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-3 pt-3 border-t">
            <div className="text-center flex-1">
              <div className="text-lg font-bold text-blue-700">{margeBrutePct}%</div>
              <div className="text-[10px] text-muted-foreground">Marge brute</div>
            </div>
            <div className="text-center flex-1">
              <div className={`text-lg font-bold ${margeNettePct >= 0 ? 'text-green-700' : 'text-red-700'}`}>{margeNettePct}%</div>
              <div className="text-[10px] text-muted-foreground">Marge nette</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bilan */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-semibold">Actif</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-1 text-xs">
            {[
              { l: 'Immobilisations', k: 'immobilisations' },
              { l: 'Stocks', k: 'stocks' },
              { l: 'Créances', k: 'creances_clients' },
              { l: 'Trésorerie', k: 'tresorerie' },
            ].map(r => (
              <div key={r.k} className="flex justify-between">
                <span className="text-muted-foreground">{r.l}</span>
                <span className="font-mono">{values[r.k] === 'unknown' ? '?' : values[r.k] !== null ? formatAmount(values[r.k] as number) : '—'}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Total</span><span className="font-mono">{formatAmount(totalActif)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-semibold">Passif</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-1 text-xs">
            {[
              { l: 'Capitaux propres', k: 'capitaux_propres' },
              { l: 'Dettes LT', k: 'dettes_lt' },
              { l: 'Dettes CT', k: 'dettes_ct' },
              { l: 'Fournisseurs', k: 'fournisseurs' },
            ].map(r => (
              <div key={r.k} className="flex justify-between">
                <span className="text-muted-foreground">{r.l}</span>
                <span className="font-mono">{values[r.k] === 'unknown' ? '?' : values[r.k] !== null ? formatAmount(values[r.k] as number) : '—'}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Total</span><span className="font-mono">{formatAmount(totalPassif)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unknown fields warning */}
      {Object.values(values).some(v => v === 'unknown') && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          Les champs marqués <strong>?</strong> seront indiqués comme données manquantes. L'IA les estimera avec des hypothèses sectorielles.
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Étape {step + 1} / {STEPS.length}</span>
          <span>{progressPct}% complété</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i < step ? 'bg-primary' : i === step ? 'bg-primary/60' : 'bg-muted'
              } ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
            />
          ))}
        </div>
      </div>

      {/* Step header */}
      <div>
        <h3 className="font-display font-bold text-base">{currentStep.title}</h3>
        <p className="text-xs text-muted-foreground">{currentStep.subtitle}</p>
      </div>

      {/* Step content */}
      {isLastStep ? (
        <RecapSection />
      ) : (
        <div className="space-y-4">
          {currentStep.id === 'effectifs' ? (
            // Effectifs: integer inputs
            currentStep.fields.map(field => (
              <div key={field.key} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-sm font-medium">{field.label}</label>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <input
                  type="number"
                  min={0}
                  value={values[field.key] === null || values[field.key] === 'unknown' ? '' : String(values[field.key])}
                  onChange={e => handleChange(field.key, e.target.value === '' ? null : parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))
          ) : (
            currentStep.fields.map(field => (
              <FieldInput
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={handleChange}
              />
            ))
          )}

          {/* Live KPI preview for compte_resultat */}
          {currentStep.id === 'compte_resultat' && (values.chiffre_affaires as number) > 0 && (
            <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Calculator className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-medium text-blue-800">Calculs en temps réel</p>
                <p className="text-blue-700">Marge brute : {formatAmount(margebrute)} FCFA ({margeBrutePct}%)</p>
                <p className="text-blue-700">Résultat net estimé : {formatAmount(resultatNet)} FCFA ({margeNettePct}%)</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
          )}
          {onCancel && step === 0 && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Annuler
            </Button>
          )}
        </div>
        {isLastStep ? (
          <Button size="sm" onClick={handleComplete} className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Valider et continuer
          </Button>
        ) : (
          <Button size="sm" onClick={() => setStep(s => s + 1)} className="gap-2">
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
