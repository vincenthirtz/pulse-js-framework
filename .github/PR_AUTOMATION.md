# 🤖 Automatisation des Pull Requests

Ce document explique comment fonctionne l'automatisation des descriptions de PR dans Pulse Framework.

## 🎯 Objectif

Générer automatiquement des descriptions de PR **riches et détaillées** incluant :

- 📊 Statistiques complètes des commits
- 🏷️ Catégorisation des commits (feat, fix, docs, etc.)
- 📈 Métriques des fichiers changés
- ⚠️ Détection des breaking changes
- 🎯 Suggestion du type de release
- 🏷️ Attribution automatique de labels

---

## 📝 Workflows d'automatisation

### 1. `enhance-pr-description.yml`

**Déclenché** : Automatiquement quand une PR est ouverte ou rouverte (toutes branches)

**Ce qu'il fait** :

1. **Analyse les commits** :
   - Compte les commits par type (feat, fix, docs, etc.)
   - Détecte les breaking changes (`!` dans le type)
   - Calcule les statistiques (fichiers, lignes)

2. **Génère un commentaire riche** :
   ```markdown
   ## 📊 PR Analysis

   ### 📈 Statistics
   | Metric | Count |
   |--------|-------|
   | Total Commits | 15 |
   | Files Changed | 42 |
   | Lines Added | +1234 |
   | Lines Deleted | -567 |

   ### 🏷️ Commit Types
   | Type | Count |
   |------|-------|
   | ✨ Features | 5 |
   | 🐛 Fixes | 3 |
   | 📚 Docs | 2 |
   ...

   ### 🎯 Suggested Release Type
   Based on commit analysis: **minor**
   ```

3. **Ajoute des labels automatiques** :
   - `release:major` / `release:minor` / `release:patch`
   - `breaking-change` si breaking changes détectés
   - `enhancement` si des features
   - `bug` si des fixes
   - `documentation` si des docs

**Exemple de résultat** :

![PR with enhanced description](https://via.placeholder.com/800x400?text=PR+with+enhanced+description)

---

### 2. `promote-to-main.yml` (amélioré)

**Déclenché** : Manuellement via workflow_dispatch

**Ce qu'il fait** :

1. **Crée une PR develop → main** avec description enrichie :
   - Statistiques détaillées
   - Commit breakdown par type
   - Breaking change warnings
   - Suggested release type
   - Checklist pre-merge

**Exemple de PR générée** :

```markdown
## 🚀 Promote develop to main

> ⚠️ **WARNING**: This PR contains 2 breaking change(s)!

### 📊 Statistics

| Metric | Count |
|--------|-------|
| Total Commits | 23 |
| Files Changed | 67 |
| Lines Added | +2345 |
| Lines Deleted | -890 |

### 🏷️ Commit Types

| Type | Count |
|------|-------|
| ✨ Features | 8 |
| 🐛 Fixes | 5 |
| 💥 Breaking | 2 |
...

### 🎯 Suggested Release

Based on commit analysis: **major**

<details>
<summary>📝 View all commits (23)</summary>

- feat(api)!: redesign reactivity system (abc1234)
- feat(router): add lazy loading support (def5678)
- fix(dom): correct memory leak (ghi9012)
...

</details>

### ✅ Pre-merge Checklist

- [ ] All CI checks passing
- [ ] Staging deployment tested
- [ ] Breaking changes documented
- [ ] Version bumped appropriately
```

---

## 🔧 Configuration

### Labels requis

Créez ces labels dans votre repo GitHub :

```bash
# Release types
release:major     - Color: #d73a4a (red)
release:minor     - Color: #0075ca (blue)
release:patch     - Color: #008672 (green)

# Types
breaking-change   - Color: #d73a4a (red)
enhancement       - Color: #a2eeef (light blue)
bug               - Color: #d73a4a (red)
documentation     - Color: #0075ca (blue)
```

Ou utilisez le workflow `.github/workflows/setup-labels.yml` pour les créer automatiquement.

### Permissions requises

Les workflows nécessitent ces permissions :

```yaml
permissions:
  contents: read
  pull-requests: write
```

---

## 📊 Détection automatique du type de release

Le système analyse les commits et suggère le type de release selon ces règles :

| Commits | Type suggéré | Exemple |
|---------|--------------|---------|
| Contient `!` ou `BREAKING CHANGE:` | **major** | `feat(api)!: redesign API` |
| Contient `feat:` | **minor** | `feat(router): add feature` |
| Autres (`fix:`, `docs:`, etc.) | **patch** | `fix(dom): bug fix` |

**Exemples de détection** :

```bash
# Commits de la PR
- feat(graphql): add subscription support
- fix(dom): correct memory leak
- docs(readme): update installation

# Résultat → Suggested Release: minor
```

```bash
# Commits de la PR
- feat(api)!: redesign reactivity system
- fix(tests): update breaking tests

# Résultat → Suggested Release: major + ⚠️ WARNING
```

---

## 🎨 Customisation

### Modifier les catégories de commits

Éditez `.github/workflows/enhance-pr-description.yml` ligne 45+ :

```yaml
# Ajouter une nouvelle catégorie
STYLE_COUNT=$(echo "$COMMITS" | grep -c "^- style" || echo 0)

# Ajouter dans les outputs
echo "STYLE_COUNT=$STYLE_COUNT" >> $GITHUB_OUTPUT

# Ajouter dans le tableau
| 🎨 Style | $STYLE_COUNT | Code style improvements |
```

### Modifier le format du commentaire

Éditez le template à la ligne 90+ :

```yaml
COMMENT=$(cat <<EOF
## 🎨 Mon titre personnalisé

### Ma section custom

...
EOF
)
```

### Désactiver l'auto-labeling

Commentez la step "Add labels based on analysis" (ligne 215+)

---

## 🧪 Testing

### Tester le workflow enhance-pr-description

1. Créez une branche de test :
   ```bash
   git checkout -b test/pr-automation
   ```

2. Faites quelques commits avec types variés :
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: correct bug"
   git commit -m "docs: update readme"
   ```

3. Push et créez une PR :
   ```bash
   git push origin test/pr-automation
   ```

4. Le workflow se déclenchera automatiquement
5. Vérifiez le commentaire ajouté à la PR

### Tester promote-to-main

1. Allez sur [Actions](https://github.com/vincenthirtz/pulse-js-framework/actions)
2. Sélectionnez "Promote to Main"
3. Cliquez "Run workflow"
4. Vérifiez la PR créée

---

## 📈 Métriques collectées

Le système collecte automatiquement :

### Commits
- `COMMIT_COUNT` : Nombre total de commits
- `FEAT_COUNT` : Nombre de features
- `FIX_COUNT` : Nombre de fixes
- `DOCS_COUNT` : Nombre de docs
- `CHORE_COUNT` : Nombre de chores
- `REFACTOR_COUNT` : Nombre de refactorings
- `TEST_COUNT` : Nombre de tests
- `BREAKING_COUNT` : Nombre de breaking changes

### Fichiers
- `FILES_CHANGED` : Nombre de fichiers modifiés
- `ADDITIONS` : Lignes ajoutées
- `DELETIONS` : Lignes supprimées
- `SRC_FILES` : Fichiers source modifiés
- `TEST_FILES` : Fichiers de test modifiés
- `DOCS_FILES` : Fichiers de documentation modifiés
- `CONFIG_FILES` : Fichiers de config modifiés

### Inférence
- `SUGGESTED_RELEASE` : Type de release suggéré (major/minor/patch)

---

## 🚦 Troubleshooting

### Le commentaire n'apparaît pas

**Cause** : Permissions insuffisantes

**Solution** :
```yaml
permissions:
  pull-requests: write  # Requis pour commenter
```

### Les labels ne sont pas ajoutés

**Cause 1** : Labels n'existent pas dans le repo

**Solution** : Créez les labels (voir section Configuration)

**Cause 2** : Permissions insuffisantes

**Solution** :
```yaml
permissions:
  pull-requests: write  # Requis pour les labels
```

### Statistiques incorrectes

**Cause** : Problème de parsing des commits

**Solution** : Vérifiez que vos commits suivent le format Conventional Commits :
```
type(scope): description

feat: nouvelle feature
fix: correction de bug
docs: documentation
```

### Workflow ne se déclenche pas

**Vérifiez** :
1. Le workflow est bien dans `.github/workflows/`
2. Le fichier est bien en YAML valide
3. Les triggers sont corrects (`on: pull_request:`)
4. Les permissions sont configurées

---

## 🔗 Liens connexes

- **Release Automation** : [RELEASE.md](.github/workflows/RELEASE.md)
- **Release Summary** : [RELEASE_SUMMARY.md](.github/workflows/RELEASE_SUMMARY.md)
- **Workflow Comparison** : [WORKFLOW_COMPARISON.md](.github/workflows/WORKFLOW_COMPARISON.md)
- **Conventional Commits** : https://www.conventionalcommits.org/

---

## ✅ Checklist de configuration

- [x] Workflows créés (`enhance-pr-description.yml`, `promote-to-main.yml`)
- [ ] Labels créés dans le repo GitHub
- [ ] Permissions vérifiées
- [ ] Test sur une PR de test
- [ ] Documentation lue et comprise

---

**Auteur** : Claude Sonnet 4.5
**Date** : 2026-02-06
**Version** : 1.0
