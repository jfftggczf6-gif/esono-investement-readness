

## Plan : 3 corrections

### 1. Flash "Créer votre entreprise" a la connexion

**Cause racine** : `EntrepreneurDashboard` affiche le formulaire de creation d'entreprise (ligne 727) des que `enterprise === null`, ce qui est le cas pendant le `fetchData()` initial. Il n'y a pas d'etat de chargement initial.

**Correction** dans `EntrepreneurDashboard.tsx` :
- Ajouter un state `initialLoading = true` qui passe a `false` apres le premier `fetchData()`
- Tant que `initialLoading` est true, afficher le spinner au lieu du formulaire de creation

### 2. ODD Excel : erreur de telechargement (404 Bucket not found)

**Cause racine** : Le reseau montre une requete vers `/storage/v1/object/public/ovo-outputs/odd_...xlsx` qui retourne `404 Bucket not found`. Le bucket `ovo-outputs` est **prive** (is_public: false), donc les URLs publiques ne marchent pas.

Le probleme vient de `generate-odd/index.ts` qui stocke `getPublicUrl()` dans le livrable `odd_excel.file_url`. Pour un bucket prive, il faut utiliser des signed URLs.

**Correction** dans `EntrepreneurDashboard.tsx` (ligne 1189) :
- Au lieu d'appeler `handleDownloadOvoFile(file_url)` directement avec l'URL publique stockee, utiliser `supabase.storage.from('ovo-outputs').createSignedUrl(file_name, 3600)` pour generer une URL signee a la volee
- Extraire le `file_name` depuis `deliverables.find(d => d.type === 'odd_excel')?.data?.file_name`
- Meme pattern que le polling OVO (ligne 436-442)

### 3. Integrer Plan OVO Excel dans le pipeline principal

**Actuellement** : Le PIPELINE (ligne 228-237) genere les 8 modules IA (BMC, SIC, etc). Mais le Plan OVO **Excel** (remplissage du template .xlsm) et le ODD **Excel** sont des etapes separees declenchees manuellement via les boutons verts.

**Correction** dans `EntrepreneurDashboard.tsx` :
- Apres la boucle PIPELINE dans `handleGenerate()`, ajouter automatiquement :
  1. Generation du Plan OVO Excel via `handleGenerateOvoPlan()` (si le plan_ovo a ete genere)
  2. Le ODD Excel est deja genere par `generate-odd` (il upload dans ovo-outputs automatiquement)
- Cela evite les clics multiples : un seul bouton "Generer les livrables" fait tout

**Fichiers modifies** :
- `src/components/dashboard/EntrepreneurDashboard.tsx` : initialLoading, signed URL ODD, pipeline etendu

