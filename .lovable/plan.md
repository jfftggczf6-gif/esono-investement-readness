

# Principe : Inputs identiques = Outputs identiques

Exactement. La règle est simple :

- **Sources modifiées** (nouveaux documents, infos entreprise changées) → **régénération automatique** des livrables concernés
- **Sources inchangées** → **aucun recalcul**, les livrables restent identiques

## Modifications techniques

### 1. Déterminisme IA — `supabase/functions/_shared/helpers.ts`
Ajouter `temperature: 0` dans le body JSON de `callAI()` (ligne 211). Cela garantit que pour des inputs identiques, l'IA produit exactement le même résultat.

### 2. Détection des changements — `src/lib/pipeline-runner.ts`
Modifier la logique de skip pour comparer les dates :
- Récupérer `enterprises.updated_at` (date de dernière modification des infos/documents)
- Récupérer `deliverables.updated_at` pour chaque livrable existant
- Un livrable est "à jour" si : données riches présentes **ET** `deliverable.updated_at > enterprise.updated_at`
- Sinon → régénérer ce module

### 3. Bouton unique intelligent — `src/components/dashboard/EntrepreneurDashboard.tsx`
- Ligne 1379 : changer `handleGenerate(true)` → `handleGenerate(false)`
- Le pipeline décide automatiquement quoi régénérer grâce à la logique de dates
- Adapter le label dynamiquement :
  - `"Générer les livrables"` si des modules manquent
  - `"Mettre à jour les livrables"` si les sources ont changé
  - `"Livrables à jour ✓"` (désactivé) si tout est à jour

### 4. Cohérence serveur — `supabase/functions/generate-deliverables/index.ts`
Appliquer la même logique de comparaison de dates côté backend pour que le pipeline serveur soit cohérent avec le client.

## Résultat
Un seul bouton. Le système détecte seul si les sources ont changé. Si oui, il régénère. Si non, il ne touche à rien. Et même en cas de régénération, `temperature: 0` garantit des résultats reproductibles.

