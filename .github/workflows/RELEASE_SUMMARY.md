# 🚀 Système de Release Automatique - Résumé

## ✅ Ce qui a été fait

### 1. Nouveau workflow automatique : `post-deploy.yml`

**Déclenché automatiquement** après chaque push sur `main` (après déploiement Netlify réussi)

**Fonctionnalités** :
- ✅ Attend la confirmation du déploiement Netlify (timeout 15 min)
- ✅ Détecte automatiquement le type de release depuis le commit message :
  - `feat!:` ou `BREAKING CHANGE:` → **major** (1.7.33 → 2.0.0)
  - `feat:` → **minor** (1.7.33 → 1.8.0)
  - Autres (`fix:`, `docs:`, etc.) → **patch** (1.7.33 → 1.7.34)
- ✅ Bump automatique de la version dans `package.json`
- ✅ Génération du CHANGELOG.md
- ✅ Commit et push des changements
- ✅ Création du tag Git
- ✅ Création de la GitHub Release avec notes complètes
- ✅ **Trigger manuel** via GitHub Actions UI (override le type auto-détecté)

**Avantages** :
- Totalement autonome (pas de dépendance CLI)
- Rapide (pas de `npm ci`)
- Automatique ET manuel

---

### 2. Script de release local : `scripts/release.sh`

**Pour les releases manuelles en local** (contrôle total)

**Usage** :
```bash
./scripts/release.sh patch   # 1.7.33 → 1.7.34
./scripts/release.sh minor   # 1.7.33 → 1.8.0
./scripts/release.sh major   # 1.7.33 → 2.0.0
```

**Ce qu'il fait** :
1. Vérifie que vous êtes sur `main` et à jour
2. Bump la version
3. Génère un template CHANGELOG
4. Ouvre l'éditeur pour éditer le CHANGELOG
5. Commit et push
6. Crée le tag Git
7. Crée la GitHub Release (si `gh` CLI installé)

**Avantages** :
- Contrôle total du CHANGELOG
- Validation manuelle avant push
- Idéal pour releases importantes

---

### 3. Documentation complète : `RELEASE.md`

Guide complet avec :
- 3 méthodes de release (auto, GitHub UI, local)
- Guide Conventional Commits
- Guide Semantic Versioning
- Troubleshooting
- Bonnes pratiques

---

## 🗑️ Ce qui a été supprimé

### ❌ `create-release.yml` (obsolète)

**Raisons** :
- Dépend de `node cli/index.js release` (commande inexistante)
- Uniquement manuel (pas d'automatisation)
- Plus lourd (`npm ci`)
- Redondant avec `post-deploy.yml`

---

## 📋 Comment utiliser le nouveau système

### Méthode 1 : Automatique (recommandée pour 90% des cas)

1. **Créez votre PR** avec des commits conventionnels :
   ```bash
   git commit -m "fix(dom): correct memory leak in list rendering"
   # ou
   git commit -m "feat(graphql): add subscription support"
   ```

2. **Mergez vers `main`** (depuis `develop`)

3. **Le workflow s'exécute automatiquement** :
   - Attend le déploiement Netlify
   - Détecte le type (`fix:` = patch, `feat:` = minor, `feat!:` = major)
   - Crée la release automatiquement

4. **C'est tout !** 🎉

---

### Méthode 2 : Manuel via GitHub Actions

**Quand** : Vous voulez override le type auto-détecté

1. Allez sur [Actions](https://github.com/vincenthirtz/pulse-js-framework/actions)
2. Cliquez sur **"Post-Deploy Release"**
3. Cliquez sur **"Run workflow"**
4. Choisissez le type : `patch` | `minor` | `major`
5. Cliquez sur **"Run workflow"**

---

### Méthode 3 : Manuel en local

**Quand** : Vous voulez un contrôle total sur le CHANGELOG

```bash
# Assurez-vous d'être sur main et à jour
git checkout main
git pull origin main

# Lancez le script
./scripts/release.sh minor

# Le script vous guide à travers tout le processus
```

---

## 🎯 Conventional Commits (rappel)

Pour que la détection automatique fonctionne :

| Commit Prefix | Type de Release | Exemple |
|---------------|-----------------|---------|
| `fix:` | patch | `fix(dom): correct null reference` |
| `docs:` | patch | `docs(readme): update installation steps` |
| `chore:` | patch | `chore(deps): update dependencies` |
| `feat:` | minor | `feat(router): add lazy loading support` |
| `feat!:` | major | `feat(api)!: redesign reactivity system` |
| `BREAKING CHANGE:` | major | Dans le body du commit |

**Exemple de commit breaking change** :
```bash
git commit -m "feat(api)!: redesign reactivity system

BREAKING CHANGE: pulse() now requires explicit .get() calls.
Migration guide: https://..."
```

---

## 🔗 Liens utiles

- **Documentation complète** : [RELEASE.md](.github/workflows/RELEASE.md)
- **Comparaison workflows** : [WORKFLOW_COMPARISON.md](.github/workflows/WORKFLOW_COMPARISON.md)
- **Script de release** : [scripts/release.sh](../scripts/release.sh)
- **Workflow automatique** : [post-deploy.yml](.github/workflows/post-deploy.yml)

---

## 🚦 Prochaines étapes

### Optionnel : Activer la publication npm

Si vous voulez publier automatiquement sur npm après chaque release :

1. **Générer un token npm** :
   - Allez sur [npmjs.com](https://www.npmjs.com/) → Settings → Access Tokens
   - Créez un token **Automation**

2. **Ajouter le secret GitHub** :
   - Settings → Secrets and variables → Actions
   - New repository secret : `NPM_TOKEN` = votre token

3. **Décommenter le job dans `post-deploy.yml`** :
   - Lignes 175-205 : supprimer les `#` devant `publish-npm:`

---

## ✅ Checklist finale

- [x] Workflow automatique créé (`post-deploy.yml`)
- [x] Script local créé (`scripts/release.sh`)
- [x] Documentation complète (`RELEASE.md`)
- [x] Ancien workflow supprimé (`create-release.yml`)
- [x] Commits pushés sur `develop`
- [ ] Tester le workflow après merge sur `main`
- [ ] (Optionnel) Configurer publication npm

---

## 🎉 Félicitations !

Vous avez maintenant un système de release **professionnel et automatisé** :

- 🤖 **Automatique** : Release après chaque deploy
- 🎯 **Intelligent** : Détection du type depuis commits
- 🛠️ **Flexible** : Manuel via GitHub UI ou local
- 📚 **Documenté** : Guide complet pour l'équipe
- 🚀 **Rapide** : Workflow optimisé sans dépendances lourdes

---

**Auteur** : Claude Sonnet 4.5
**Date** : 2026-02-06
**Version** : 1.0
