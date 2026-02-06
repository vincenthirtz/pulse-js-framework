#!/bin/bash
# Script de release manuelle pour Pulse Framework
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'affichage
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Vérifier les arguments
RELEASE_TYPE=${1:-patch}

if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major)$ ]]; then
  log_error "Type de release invalide: $RELEASE_TYPE"
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

# Vérifier qu'on est sur main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  log_error "Vous devez être sur la branche 'main' pour créer une release"
  log_info "Branche actuelle: $CURRENT_BRANCH"
  exit 1
fi

# Vérifier qu'il n'y a pas de changements non commités
if [[ -n $(git status -s) ]]; then
  log_error "Il y a des changements non commités"
  git status -s
  exit 1
fi

# Vérifier qu'on est à jour avec origin
git fetch origin main
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})

if [ $LOCAL != $REMOTE ]; then
  log_error "Votre branche n'est pas à jour avec origin/main"
  log_info "Exécutez: git pull origin main"
  exit 1
fi

# Obtenir la version actuelle
CURRENT_VERSION=$(node -p "require('./package.json').version")
log_info "Version actuelle: $CURRENT_VERSION"

# Confirmer la release
log_warning "Vous allez créer une release $RELEASE_TYPE"
read -p "Continuer? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  log_info "Release annulée"
  exit 0
fi

# Bump version
log_info "Bump de la version ($RELEASE_TYPE)..."
npm version $RELEASE_TYPE --no-git-tag-version

NEW_VERSION=$(node -p "require('./package.json').version")
log_success "Nouvelle version: $NEW_VERSION"

# Mettre à jour le CHANGELOG
log_info "Mise à jour du CHANGELOG..."
DATE=$(date +%Y-%m-%d)

cat > CHANGELOG.tmp << EOF
# Changelog

## [$NEW_VERSION] - $DATE

### Added
-

### Changed
-

### Fixed
-

---

EOF

if [ -f CHANGELOG.md ]; then
  tail -n +2 CHANGELOG.md >> CHANGELOG.tmp
fi

mv CHANGELOG.tmp CHANGELOG.md

log_success "CHANGELOG créé pour la version $NEW_VERSION"
log_warning "Veuillez éditer CHANGELOG.md pour ajouter les détails de la release"

# Ouvrir l'éditeur pour le CHANGELOG
${EDITOR:-nano} CHANGELOG.md

# Confirmer le CHANGELOG
log_info "CHANGELOG mis à jour"
read -p "Le CHANGELOG est-il correct? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  log_error "Veuillez mettre à jour le CHANGELOG et relancer le script"
  git checkout -- package.json CHANGELOG.md
  exit 1
fi

# Commit et push
log_info "Commit des changements..."
git add package.json CHANGELOG.md
git commit -m "chore(release): bump version to $NEW_VERSION

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin main

log_success "Changements poussés sur main"

# Créer et pousser le tag
log_info "Création du tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
git push origin "v$NEW_VERSION"

log_success "Tag v$NEW_VERSION créé et poussé"

# Générer les release notes
log_info "Génération des release notes..."
PREV_TAG=$(git describe --abbrev=0 --tags HEAD~1 2>/dev/null || echo "")

if [ -z "$PREV_TAG" ]; then
  COMMITS=$(git log --pretty=format:"- %s (%h)" -20)
else
  COMMITS=$(git log --pretty=format:"- %s (%h)" $PREV_TAG..HEAD)
fi

CHANGELOG_SECTION=$(awk '/^## \['$NEW_VERSION'\]/,/^## \[|^---/{print}' CHANGELOG.md | head -n -1)

cat > release_notes.md << EOF
## 🚀 Release v$NEW_VERSION

$CHANGELOG_SECTION

### 📝 Commits

$COMMITS

### 📦 Installation

\`\`\`bash
npm install pulse-js-framework@$NEW_VERSION
\`\`\`

### 🔗 Links

- [Documentation](https://pulse-js.fr)
- [Changelog](https://github.com/vincenthirtz/pulse-js-framework/blob/main/CHANGELOG.md)
EOF

log_success "Release notes générées dans release_notes.md"

# Créer la release GitHub
log_info "Création de la release GitHub..."
if command -v gh &> /dev/null; then
  gh release create "v$NEW_VERSION" \
    --title "Release v$NEW_VERSION" \
    --notes-file release_notes.md

  log_success "Release GitHub créée: https://github.com/vincenthirtz/pulse-js-framework/releases/tag/v$NEW_VERSION"
else
  log_warning "GitHub CLI (gh) n'est pas installé"
  log_info "Créez manuellement la release sur GitHub: https://github.com/vincenthirtz/pulse-js-framework/releases/new"
  log_info "Tag: v$NEW_VERSION"
  log_info "Release notes disponibles dans: release_notes.md"
fi

# Cleanup
rm -f release_notes.md

# Résumé
echo ""
log_success "🎉 Release v$NEW_VERSION créée avec succès!"
echo ""
echo "Résumé:"
echo "  - Type: $RELEASE_TYPE"
echo "  - Version: $NEW_VERSION"
echo "  - Tag: v$NEW_VERSION"
echo "  - Branche: main"
echo ""
echo "Prochaines étapes:"
echo "  1. ✅ CHANGELOG mis à jour"
echo "  2. ✅ Version bumpée dans package.json"
echo "  3. ✅ Commit poussé sur main"
echo "  4. ✅ Tag créé et poussé"
echo "  5. ✅ Release GitHub créée"
echo ""
echo "Pour publier sur npm (optionnel):"
echo "  npm publish"
