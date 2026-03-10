

# Fix: les fichiers téléchargés n'apparaissent pas dans le gestionnaire de téléchargements

## Diagnostic

Le code actuel utilise `fetch()` pour récupérer le fichier, puis crée un lien blob programmatique (`URL.createObjectURL` + `a.click()`). Cette technique ne déclenche pas le gestionnaire de téléchargements natif du navigateur — le fichier est traité en mémoire et le navigateur ne l'enregistre pas comme un "vrai" téléchargement.

De plus, dans un contexte d'iframe (preview Lovable), les téléchargements programmatiques peuvent être bloqués par les politiques de sandbox.

## Solution

Remplacer l'approche `fetch` + blob par un **`window.open(url)`** direct vers l'edge function. Puisque la fonction `download-deliverable` renvoie déjà le header `Content-Disposition: attachment`, le navigateur déclenchera un vrai téléchargement natif.

### Modification : `src/pages/Livrables.tsx`

Remplacer la méthode `handleDownload` :

```text
AVANT:
  fetch(url) → blob → createObjectURL → a.click()

APRÈS:
  window.open(url) — le navigateur gère le téléchargement nativement
```

On construit l'URL avec le token d'auth en query param (puisque `window.open` ne permet pas de passer des headers). Cela nécessite une petite adaptation côté edge function pour accepter le token via query param en plus du header `Authorization`.

### Modification : `supabase/functions/download-deliverable/index.ts`

Ajouter la lecture du token depuis le query param `token` en fallback si le header `Authorization` est absent :

```text
const authHeader = req.headers.get("authorization");
const tokenParam = url.searchParams.get("token");
const jwt = authHeader?.replace("Bearer ", "") || tokenParam;
```

Ceci permet au `window.open(url + "&token=XXX")` de fonctionner.

### Résumé des changements

| Fichier | Action |
|---|---|
| `src/pages/Livrables.tsx` | Remplacer fetch+blob par `window.open()` avec token en query param |
| `supabase/functions/download-deliverable/index.ts` | Accepter le JWT via query param `token` en fallback |

