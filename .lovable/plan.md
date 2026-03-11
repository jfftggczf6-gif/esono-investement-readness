

# Problème : L'Excel OVO (.xlsm) n'est pas mis à jour par la régénération

## Diagnostic

Il y a **deux systèmes séparés** pour le Plan Financier :

1. **Pipeline de régénération** (`generate-plan-ovo` + `reconcile-plan-ovo`) → met à jour le **JSON** dans la base de données (ce que vous voyez dans le dashboard)
2. **`generate-ovo-plan`** → génère le **fichier Excel .xlsm** (template rempli avec injection cellule par cellule) — appelé séparément depuis le dashboard Coach

Quand vous cliquez "Régénérer", seul le JSON est mis à jour. L'Excel .xlsm reste l'ancienne version stockée en storage. Les corrections qu'on a ajoutées (reconcile, matching CA élargi) n'impactent que le JSON.

## Solution

Ajouter `generate-ovo-plan` comme étape du pipeline, **après** `reconcile-plan-ovo`, pour que l'Excel soit automatiquement regénéré à chaque régénération complète.

### Modifications

1. **`src/lib/dashboard-config.ts`** — Ajouter l'étape dans le PIPELINE :
   ```
   { name: 'Excel OVO', fn: 'generate-ovo-plan', type: 'plan_ovo_excel' }
   ```
   Position : après `reconcile-plan-ovo`, avant `Business Plan`.

2. **`src/lib/pipeline-runner.ts`** — Le `generate-ovo-plan` nécessite des données spéciales (company name, products, services, etc.) pas juste un `enterprise_id`. Il faut soit :
   - **Option A** : Modifier `generate-ovo-plan` pour qu'il puisse fonctionner avec juste `enterprise_id` (en chargeant les données nécessaires depuis la DB lui-même)
   - **Option B** : Modifier le pipeline runner pour envoyer les données supplémentaires pour cette étape spécifique

   → **Option A est préférable** car plus propre et cohérent avec les autres fonctions du pipeline.

3. **`supabase/functions/generate-ovo-plan/index.ts`** — Ajouter un mode "reload from DB" : si seul `enterprise_id` est fourni (sans `company`, `products`, etc.), charger automatiquement les données depuis les deliverables existants (plan_ovo JSON, BMC, inputs, framework) et les utiliser pour remplir le template Excel.

4. **`supabase/functions/generate-deliverables/index.ts`** — Ajouter la même étape dans le pipeline serveur.

### Résultat attendu

Après régénération, l'Excel .xlsm sera automatiquement regénéré avec les données fraîches et alignées du JSON réconcilié.

