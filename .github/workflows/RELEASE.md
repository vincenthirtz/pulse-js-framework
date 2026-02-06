# 🚀 Guide de Release - Pulse Framework

Ce document explique comment créer des releases pour le Pulse Framework.

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Types de release](#types-de-release)
- [Méthode 1: Release automatique (recommandée)](#méthode-1-release-automatique-recommandée)
- [Méthode 2: Release manuelle via GitHub Actions](#méthode-2-release-manuelle-via-github-actions)
- [Méthode 3: Release manuelle en local](#méthode-3-release-manuelle-en-local)
- [Processus de release](#processus-de-release)
- [Publication sur npm](#publication-sur-npm)

---

## Vue d'ensemble

Le Pulse Framework utilise un système de release automatique qui se déclenche après chaque déploiement réussi sur Netlify (branche `main`).

**Workflow:**

```
1. Merge PR vers main
   ↓
2. CI tests passent
   ↓
3. Déploiement Netlify
   ↓
4. Post-Deploy workflow détecte le type de release
   ↓
5. Bump version + CHANGELOG + Tag + GitHub Release
```

---

## Types de release

Le framework suit le **Semantic Versioning** (semver):

| Type | Version | Quand l'utiliser | Exemple |
|------|---------|------------------|---------|
| **patch** | 1.7.33 → 1.7.34 | Correction de bugs, petites améliorations | Typo fix, bug fix |
| **minor** | 1.7.33 → 1.8.0 | Nouvelles fonctionnalités rétrocompatibles | Nouvelle API, nouveau module |
| **major** | 1.7.33 → 2.0.0 | Breaking changes | API redesign, changements majeurs |

### Détection automatique du type

Le workflow détecte automatiquement le type de release depuis le **commit message** :

- `feat!:` ou `BREAKING CHANGE:` → **major**
- `feat:` ou `feature:` → **minor**
- Autres (`fix:`, `docs:`, etc.) → **patch**

**Exemples de commit messages:**

```bash
# Patch (1.7.33 → 1.7.34)
git commit -m "fix(dom): correct memory leak in list rendering"

# Minor (1.7.33 → 1.8.0)
git commit -m "feat(graphql): add subscription support with reconnection"

# Major (1.7.33 → 2.0.0)
git commit -m "feat(api)!: redesign reactivity system

BREAKING CHANGE: pulse() now requires explicit .get() calls"
```

---

## Méthode 1: Release automatique (recommandée)

La release se déclenche **automatiquement** après un push sur `main` qui passe tous les tests et se déploie sur Netlify.

### Workflow automatique

1. **Merge votre PR vers `main`** (depuis `develop` généralement)

2. **Le workflow CI s'exécute** (`.github/workflows/ci.yml`)
   - Tests
   - Lint
   - Build

3. **Netlify déploie** (si CI OK)

4. **Post-Deploy workflow s'exécute** (`.github/workflows/post-deploy.yml`)
   - Attend la confirmation Netlify
   - Détecte le type de release depuis le commit message
   - Bump la version dans `package.json`
   - Met à jour `CHANGELOG.md`
   - Commit et push les changements
   - Crée le tag Git
   - Crée la GitHub Release

### Vérifier la release

1. Allez sur [Releases](https://github.com/vincenthirtz/pulse-js-framework/releases)
2. La nouvelle release devrait apparaître avec :
   - Version (tag)
   - Notes de release
   - CHANGELOG
   - Liste des commits

---

## Méthode 2: Release manuelle via GitHub Actions

Si vous voulez contrôler manuellement le type de release (override la détection automatique) :

### Via l'interface GitHub

1. Allez sur [Actions](https://github.com/vincenthirtz/pulse-js-framework/actions)
2. Sélectionnez le workflow **"Post-Deploy Release"**
3. Cliquez sur **"Run workflow"** (bouton en haut à droite)
4. Choisissez le type de release : `patch` | `minor` | `major`
5. Cliquez sur **"Run workflow"**

Le workflow va :
- Bump la version
- Mettre à jour le CHANGELOG
- Créer le tag
- Créer la GitHub Release

### Via GitHub CLI

```bash
# Installer gh CLI si nécessaire
brew install gh  # macOS
# ou: https://cli.github.com/

# Déclencher une release patch
gh workflow run post-deploy.yml -f release_type=patch

# Déclencher une release minor
gh workflow run post-deploy.yml -f release_type=minor

# Déclencher une release major
gh workflow run post-deploy.yml -f release_type=major
```

---

## Méthode 3: Release manuelle en local

Pour créer une release **complètement en local** :

### Prérequis

- Être sur la branche `main`
- Pas de changements non commités
- Branch à jour avec `origin/main`
- GitHub CLI (`gh`) installé (optionnel mais recommandé)

### Utiliser le script de release

```bash
# Rendre le script exécutable (une fois)
chmod +x scripts/release.sh

# Créer une release patch (1.7.33 → 1.7.34)
./scripts/release.sh patch

# Créer une release minor (1.7.33 → 1.8.0)
./scripts/release.sh minor

# Créer une release major (1.7.33 → 2.0.0)
./scripts/release.sh major
```

### Ce que fait le script

1. ✅ Vérifie que vous êtes sur `main`
2. ✅ Vérifie qu'il n'y a pas de changements non commités
3. ✅ Vérifie que `main` est à jour avec `origin`
4. ✅ Bump la version dans `package.json`
5. ✅ Génère un template de CHANGELOG
6. ✅ Ouvre l'éditeur pour éditer le CHANGELOG
7. ✅ Commit les changements (`package.json` + `CHANGELOG.md`)
8. ✅ Push vers `origin/main`
9. ✅ Crée le tag Git
10. ✅ Push le tag
11. ✅ Crée la GitHub Release (si `gh` CLI installé)

### Exemple d'utilisation

```bash
$ ./scripts/release.sh minor

ℹ️  Version actuelle: 1.7.33
⚠️  Vous allez créer une release minor
Continuer? (y/N) y

ℹ️  Bump de la version (minor)...
✅ Nouvelle version: 1.8.0

ℹ️  Mise à jour du CHANGELOG...
✅ CHANGELOG créé pour la version 1.8.0
⚠️  Veuillez éditer CHANGELOG.md pour ajouter les détails de la release

# [Éditeur s'ouvre pour éditer CHANGELOG.md]

ℹ️  CHANGELOG mis à jour
Le CHANGELOG est-il correct? (y/N) y

ℹ️  Commit des changements...
✅ Changements poussés sur main

ℹ️  Création du tag v1.8.0...
✅ Tag v1.8.0 créé et poussé

ℹ️  Génération des release notes...
✅ Release notes générées dans release_notes.md

ℹ️  Création de la release GitHub...
✅ Release GitHub créée: https://github.com/vincenthirtz/pulse-js-framework/releases/tag/v1.8.0

🎉 Release v1.8.0 créée avec succès!

Résumé:
  - Type: minor
  - Version: 1.8.0
  - Tag: v1.8.0
  - Branche: main

Prochaines étapes:
  1. ✅ CHANGELOG mis à jour
  2. ✅ Version bumpée dans package.json
  3. ✅ Commit poussé sur main
  4. ✅ Tag créé et poussé
  5. ✅ Release GitHub créée

Pour publier sur npm (optionnel):
  npm publish
```

---

## Processus de release

### Checklist avant release

- [ ] Tous les tests passent (`npm test`)
- [ ] La documentation est à jour
- [ ] Le code est mergé sur `main`
- [ ] Le déploiement Netlify a réussi
- [ ] Vous avez vérifié le CHANGELOG

### Structure du CHANGELOG

Le CHANGELOG est généré automatiquement avec ce format :

```markdown
# Changelog

## [1.8.0] - 2026-02-06

### Added
- Nouvelle fonctionnalité X
- Support pour Y

### Changed
- Amélioration de Z
- Refactoring de A

### Fixed
- Correction du bug B
- Fix de la régression C

---

## [1.7.33] - 2026-02-05
...
```

### Format des release notes GitHub

Les release notes incluent :

1. **Header** : Version et date
2. **Section CHANGELOG** : Extrait du CHANGELOG.md
3. **Liste des commits** : Depuis la dernière release
4. **Instructions d'installation** : `npm install pulse-js-framework@VERSION`
5. **Liens** : Documentation, CHANGELOG complet

---

## Publication sur npm

**Note**: La publication sur npm est actuellement **désactivée** par défaut dans le workflow automatique.

### Activer la publication automatique

1. **Ajouter un token npm** :
   ```bash
   # Générer un token sur npmjs.com
   # Settings → Access Tokens → Generate New Token (Automation)
   ```

2. **Ajouter le secret GitHub** :
   - Allez sur Settings → Secrets and variables → Actions
   - Cliquez sur **New repository secret**
   - Nom : `NPM_TOKEN`
   - Value : votre token npm

3. **Décommenter le job dans `.github/workflows/post-deploy.yml`** :
   ```yaml
   # Supprimer le # devant publish-npm et ses steps
   ```

### Publier manuellement sur npm

```bash
# Depuis la branche main, après une release
npm publish

# Vérifier la publication
npm view pulse-js-framework
```

---

## Troubleshooting

### Erreur : "Il y a des changements non commités"

```bash
# Vérifier les changements
git status

# Commiter ou stash
git stash
```

### Erreur : "Votre branche n'est pas à jour"

```bash
git pull origin main
```

### Erreur : "Le tag existe déjà"

```bash
# Supprimer le tag local et remote
git tag -d v1.8.0
git push origin :refs/tags/v1.8.0

# Recréer la release
./scripts/release.sh minor
```

### Workflow bloqué sur "Wait for Netlify Deploy"

- Vérifiez le statut Netlify : https://app.netlify.com/
- Le workflow attend 15 minutes max
- Si le déploiement échoue, le workflow s'arrête

### Release GitHub non créée

Si `gh` CLI n'est pas installé :

```bash
# Installer gh
brew install gh  # macOS
# ou: https://cli.github.com/

# Configurer gh
gh auth login
```

---

## Bonnes pratiques

1. **Toujours tester avant de merger sur `main`**
   ```bash
   npm test
   ```

2. **Utiliser des commits conventionnels** (Conventional Commits)
   ```
   feat: nouvelle fonctionnalité
   fix: correction de bug
   docs: documentation
   chore: maintenance
   refactor: refactoring
   test: ajout de tests
   ```

3. **Mettre à jour le CHANGELOG manuellement** si nécessaire
   - Soyez descriptif
   - Ajoutez des exemples si pertinent
   - Mentionnez les breaking changes

4. **Créer des releases fréquentes**
   - Patch : dès qu'un bug est corrigé
   - Minor : chaque nouvelle feature
   - Major : seulement pour breaking changes

5. **Tester la release en local avant** (optionnel)
   ```bash
   # Créer une pre-release pour test
   npm version prerelease --preid=beta
   # 1.7.33 → 1.7.34-beta.0
   ```

---

## Support

- **Issues**: https://github.com/vincenthirtz/pulse-js-framework/issues
- **Discussions**: https://github.com/vincenthirtz/pulse-js-framework/discussions
- **Email**: hirtzvincent@gmail.com

---

**Dernière mise à jour**: 2026-02-06
**Auteur**: Claude Sonnet 4.5
