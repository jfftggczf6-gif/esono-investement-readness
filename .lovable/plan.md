

## Plan : Fiabiliser le remplissage du fichier Excel ODD

### Contexte
Les données ODD existent (visibles dans le preview). Le problème est que le moteur d'injection XML (`odd-excel-template.ts`) échoue silencieusement à écrire dans le template Excel.

### Étape 1 — Analyser le template ODD réel
Avant de coder, il faut connaître la structure exacte du fichier `ODD_template.xlsx` :
- Quelles feuilles existent, quelles colonnes contiennent les IDs de cibles (colonne B), les marqueurs (colonne D = "x"), et les colonnes à remplir (E, F, G, H)
- Jusqu'à quelle ligne vont les cibles (actuellement limité à 80, probablement insuffisant)

**Action** : Parser le template via l'edge function ou manuellement pour extraire la liste exacte des `target_id` et leurs lignes.

### Étape 2 — Corriger `setCellInXml` (bug principal)
**Fichier** : `supabase/functions/_shared/odd-excel-template.ts`

La fonction ne gère pas les cellules auto-fermantes `<c r="F10" s="5"/>`. Quand elle tente d'insérer une valeur, elle ne trouve pas la cellule existante et crée un doublon — Excel ignore alors la valeur.

**Fix** : Ajouter un regex pour les cellules auto-fermantes (`<c[^>]*r="XX"[^/]*/>`), les remplacer par la version avec valeur.

### Étape 3 — Étendre la plage de scan des lignes
**Fichier** : `supabase/functions/_shared/odd-excel-template.ts`

Changer `endRow` de 80 à 200 (ou scan dynamique) dans `findTargetRows` pour couvrir toutes les cibles du template.

### Étape 4 — Améliorer la normalisation des IDs
**Fichier** : `supabase/functions/_shared/odd-excel-template.ts`

Renforcer `normalizeTargetId` pour gérer : virgules (`7,2`), suffixes alphabétiques (`2.a`, `9.b`), espaces (`7,2 a`).

### Étape 5 — Aligner les cibles IA avec le template
**Fichier** : `supabase/functions/generate-odd/index.ts`

Mettre à jour la liste des 40 cibles dans le prompt IA pour correspondre exactement aux IDs présents dans le template Excel (après l'analyse de l'étape 1).

### Étape 6 — Ajouter des logs de diagnostic
Ajouter des stats de remplissage (`matched: X/Y cibles`) dans les logs backend pour pouvoir diagnostiquer rapidement les échecs futurs.

### Étape 7 — Forcer la régénération Excel au téléchargement
**Fichier** : `supabase/functions/download-deliverable/index.ts`

Pour les fichiers ODD existants (générés avant ce fix), régénérer l'Excel à la volée depuis les données `odd_analysis` en base plutôt que servir l'ancien fichier vide.

### Fichiers modifiés
- `supabase/functions/_shared/odd-excel-template.ts` (étapes 2, 3, 4, 6)
- `supabase/functions/generate-odd/index.ts` (étape 5)
- `supabase/functions/download-deliverable/index.ts` (étape 7)

### Aucune migration DB nécessaire

