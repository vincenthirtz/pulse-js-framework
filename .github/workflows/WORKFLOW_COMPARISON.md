# Comparaison des workflows de release

## Ancien workflow : `create-release.yml`

**Méthode** : Utilise une CLI `pulse release` (nécessite d'implémenter la commande)
**Déclencheur** : Uniquement manuel (`workflow_dispatch`)
**Dépendances** : Nécessite `npm ci`, CLI Pulse, gh CLI

**Avantages** :
- Plus de contrôle granulaire
- Interface riche dans GitHub UI (titre personnalisé, Discord webhook, etc.)

**Inconvénients** :
- ❌ Nécessite d'implémenter `cli/index.js release` (non existant actuellement)
- ❌ Plus lourd (installe toutes les dépendances)
- ❌ Uniquement manuel

---

## Nouveau workflow : `post-deploy.yml`

**Méthode** : Autonome, utilise npm et git directement
**Déclencheur** : Automatique après push sur main + Manuel via `workflow_dispatch`
**Dépendances** : Uniquement Node.js standard

**Avantages** :
- ✅ Autonome (pas besoin de CLI release)
- ✅ Automatique après déploiement Netlify
- ✅ Détection automatique du type de release (depuis commit message)
- ✅ Plus léger et rapide

**Inconvénients** :
- Moins d'options de customisation

---

## Recommandation

**Option 1: Garder uniquement `post-deploy.yml`** (recommandé)
- Supprimer `create-release.yml`
- Utiliser le workflow automatique pour toutes les releases
- Utiliser le script `scripts/release.sh` pour les releases manuelles en local

**Option 2: Garder les deux**
- `post-deploy.yml` : Pour les releases automatiques
- `create-release.yml` : Pour les releases manuelles avec options avancées (Discord, etc.)
- **Mais** : Il faut implémenter la commande `pulse release` dans le CLI

**Option 3: Fusionner les deux**
- Améliorer `post-deploy.yml` avec les options de `create-release.yml`
- Garder un seul workflow

---

## Actions recommandées

### Si vous choisissez Option 1 (recommandé)

1. **Supprimer** `create-release.yml`
2. **Garder** `post-deploy.yml` pour l'automatique
3. **Utiliser** `scripts/release.sh` pour le manuel

### Si vous choisissez Option 2

1. **Garder les deux** workflows
2. **Implémenter** `cli/index.js release` (commande manquante)
3. Utiliser `create-release.yml` pour releases manuelles avancées
4. Utiliser `post-deploy.yml` pour releases automatiques

### Si vous choisissez Option 3

1. **Fusionner** les fonctionnalités de `create-release.yml` dans `post-deploy.yml`
2. **Supprimer** `create-release.yml`
3. Avoir un seul workflow robuste

---

## Décision

**Je recommande l'Option 1** car :

1. ✅ Plus simple à maintenir
2. ✅ Pas besoin d'implémenter `pulse release` CLI
3. ✅ Automatique après chaque merge sur main
4. ✅ Script local pour contrôle manuel
5. ✅ Moins de confusion

**Actions concrètes** :

```bash
# Supprimer l'ancien workflow
git rm .github/workflows/create-release.yml

# Commit
git add .github/workflows/post-deploy.yml .github/workflows/RELEASE.md scripts/release.sh
git commit -m "feat(ci): replace create-release workflow with automated post-deploy releases

- Add post-deploy.yml: automatic releases after Netlify deploy
- Add scripts/release.sh: manual release script for local use
- Add comprehensive RELEASE.md documentation
- Remove create-release.yml (obsolete, requires unimplemented CLI command)

BREAKING CHANGE: Release workflow now automatic after deploy on main

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```
