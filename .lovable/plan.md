

# Plan : Corriger les données pays et le rafraîchissement du Plan Financier Final

## Problèmes identifiés

1. **Country hardcodé "Côte d'Ivoire"** dans `generate-plan-ovo/index.ts` ligne 103 : le JSON schema template envoie toujours `"country": "Côte d'Ivoire"` à l'IA, même si l'entreprise est au Bénin. Le system prompt mentionne aussi "focus: Côte d'Ivoire" avec des paramètres fiscaux hardcodés (TVA 18%, IS 25%).

2. **CAPEX avec mentions "Togo"** : l'IA hallucine des investissements au Togo pour une entreprise béninoise car le prompt ne contraint pas suffisamment le pays cible. Les paramètres fiscaux du pays réel ne sont pas injectés.

3. **Scénarios qui ne changent pas** : la base de données montre que les données sont bien mises à jour (`updated_at` récent), mais le viewer côté client peut afficher des données en cache si `fetchData()` n'est pas rappelé après la régénération individuelle d'un module.

4. **Business Plan** : vous confirmez ne PAS vouloir Opus pour le Business Plan — le code actuel utilise déjà Sonnet (ligne 8: `OPUS_MODEL = "claude-sonnet-4-20250514"`), donc aucun changement nécessaire.

## Modifications

### 1. Dynamiser le pays et la fiscalité dans `generate-plan-ovo/index.ts`

- Remplacer le hardcode `"country": "Côte d'Ivoire"` (ligne 103) par `"country": "${country}"` avec le pays réel de l'entreprise
- Mettre à jour le system prompt pour injecter les paramètres fiscaux du pays réel via `getFiscalParams(country)` (TVA, IS, charges sociales, SMIG) au lieu de hardcoder ceux de la CI
- Ajouter une contrainte explicite dans le user prompt : "CAPEX et investissements doivent concerner UNIQUEMENT le pays ${country}. Ne PAS mentionner d'autres pays."

### 2. Forcer le rafraîchissement après régénération individuelle

- Dans `EntrepreneurDashboard.tsx`, après la régénération d'un module individuel (`handleGenerateModule`), s'assurer que `fetchData()` est appelé ET que le state `deliverables` est bien mis à jour avant le re-render du viewer

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `supabase/functions/generate-plan-ovo/index.ts` | Dynamiser country + fiscalité dans prompts |
| `src/components/dashboard/EntrepreneurDashboard.tsx` | Vérifier le rafraîchissement post-régénération |

