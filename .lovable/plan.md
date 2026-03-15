

## Cause racine : `pitch_deck` n'existe pas dans les enums de la base de données

La fonction `generate-pitch-deck` s'exécute correctement (retourne 200 avec les 12 slides), mais **`saveDeliverable` échoue silencieusement** car le type `pitch_deck` n'existe pas dans l'enum `deliverable_type` de la base de données.

### Enums actuels vs requis

```text
deliverable_type enum:
  ✅ gap_analysis, investment_memo, onepager
  ❌ pitch_deck          <-- MANQUANT

module_code enum:
  ✅ gap_analysis, investment_memo
  ❌ pitch_deck           <-- MANQUANT
  ❌ onepager             <-- MANQUANT (explique aussi pourquoi le one-pager ne s'affiche pas dans le dashboard modules)
```

### Plan de correction

**1. Migration SQL : ajouter les valeurs manquantes aux deux enums**

```sql
ALTER TYPE deliverable_type ADD VALUE IF NOT EXISTS 'pitch_deck';
ALTER TYPE module_code ADD VALUE IF NOT EXISTS 'pitch_deck';
ALTER TYPE module_code ADD VALUE IF NOT EXISTS 'onepager';
```

**2. Insérer les modules manquants pour les entreprises existantes**

```sql
INSERT INTO enterprise_modules (enterprise_id, module, status, progress)
SELECT e.id, m.module::module_code, 'not_started', 0
FROM enterprises e
CROSS JOIN (VALUES ('pitch_deck'), ('onepager')) AS m(module)
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise_modules em 
  WHERE em.enterprise_id = e.id AND em.module = m.module::module_code
);
```

**3. Re-déployer `generate-pitch-deck`** pour s'assurer que la fonction est active.

### Résultat attendu
Après la migration, relancer "Modules avancés" depuis le dashboard sauvegardera correctement le pitch deck et il apparaîtra dans la page Livrables avec son score.

