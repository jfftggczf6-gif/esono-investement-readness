

## Fix: Erreur "Non authentifié" sur la génération OVO

### Diagnostic

Deux problèmes :

1. **Client** (`EntrepreneurDashboard.tsx` ligne 450) : `supabase.auth.getSession()` peut retourner `null` si le token est expiré ou le cache est vide. Il faut utiliser `supabase.auth.getUser()` pour forcer un refresh du token, puis récupérer la session.

2. **Edge function** (`generate-ovo-plan/index.ts` ligne 131) : `anonClient.auth.getUser()` est appelé sans passer le token JWT explicitement. Sur Lovable Cloud, il faut passer le token : `getUser(token)`.

### Corrections

#### 1. `src/components/dashboard/EntrepreneurDashboard.tsx` (ligne ~450)
- Remplacer `getSession()` par une approche plus robuste :
  ```typescript
  const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
  if (!session || sessionErr) {
    // Try refreshing
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (!refreshData.session) throw new Error("Non authentifié — veuillez vous reconnecter");
    session = refreshData.session;
  }
  ```

#### 2. `supabase/functions/generate-ovo-plan/index.ts` (ligne ~131)
- Passer le token explicitement à `getUser()` :
  ```typescript
  const token = authHeader.replace("Bearer ", "");
  const { data: { user: authUser }, error: authErr } = await anonClient.auth.getUser(token);
  ```

### Fichiers modifiés
- `src/components/dashboard/EntrepreneurDashboard.tsx` — session refresh robuste
- `supabase/functions/generate-ovo-plan/index.ts` — passer le token à getUser()

