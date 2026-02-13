# Milestone 1.11.0 Implementation Checklist

## Module Splitting Order

### ✅ Phase 1: compiler/parser.js → compiler/parser/ (Issue #77)

**Why first:** Isolated from runtime, compiler-only, easiest to test

- [ ] Create `compiler/parser/` directory
- [ ] Extract `core.js` - Base Parser class, NodeType, ASTNode, utilities (~300 LOC)
- [ ] Extract `imports.js` - Import/Page/Route declarations (~150 LOC)
- [ ] Extract `state.js` - Props/State block parsing (~300 LOC)
- [ ] Extract `view.js` - View block parsing (~800 LOC, largest)
- [ ] Extract `style.js` - Style block parsing (~550 LOC)
- [ ] Extract `expressions.js` - Expression parsing (~400 LOC)
- [ ] Extract `blocks.js` - Actions/Router/Store blocks (~300 LOC)
- [ ] Create `index.js` barrel export with `parse()` entry point
- [ ] Update `compiler/index.js` to import from new location
- [ ] Run tests: `npm test -- compiler/parser`
- [ ] Verify bundle size: `pulse analyze --json > parser-refactor.json`
- [ ] Git commit: `refactor(compiler): split parser.js into sub-modules (#77)`

### ✅ Phase 2: runtime/graphql.js → runtime/graphql/ (Issue #75)

**Why second:** Well-structured, clear boundaries, moderate complexity

- [ ] Create `runtime/graphql/` directory
- [ ] Extract `client.js` - GraphQLClient class, error handling (~450 LOC)
- [ ] Extract `cache.js` - Query caching utilities (~100 LOC)
- [ ] Extract `subscriptions.js` - SubscriptionManager, graphql-ws (~250 LOC)
- [ ] Extract `hooks.js` - useQuery, useMutation, useSubscription (~450 LOC)
- [ ] Create `index.js` barrel export
- [ ] Update package.json exports if needed
- [ ] Run tests: `npm test -- runtime/graphql`
- [ ] Test examples: `cd examples/chat && npm run dev` (uses subscriptions)
- [ ] Git commit: `refactor(runtime): split graphql.js into sub-modules (#75)`

### ✅ Phase 3: runtime/a11y.js → runtime/a11y/ (Issue #74)

**Why third:** Many exports, clear sections, accessibility-focused

- [ ] Create `runtime/a11y/` directory
- [ ] Extract `announcements.js` - Live regions + queue (~200 LOC)
- [ ] Extract `focus.js` - Focus management + skip links (~350 LOC)
- [ ] Extract `preferences.js` - User preference detection (~120 LOC)
- [ ] Extract `widgets.js` - ARIA widgets (modal, tabs, etc.) (~450 LOC)
- [ ] Extract `validation.js` - A11y validation/auditing (~300 LOC)
- [ ] Extract `contrast.js` - Color contrast utilities (~150 LOC)
- [ ] Extract `utils.js` - ID generation, accessible name, etc. (~250 LOC)
- [ ] Create `index.js` barrel export
- [ ] Run tests: `npm test -- runtime/a11y`
- [ ] Manual test: DevTools a11y audit, focus trap, announcements
- [ ] Git commit: `refactor(runtime): split a11y.js into sub-modules (#74)`

### ✅ Phase 4: runtime/router.js → runtime/router/ (Issue #76)

**Why last:** Most critical module, affects navigation, requires extra care

- [ ] Create `runtime/router/` directory
- [ ] Extract `lazy.js` - Lazy loading + preload (~150 LOC)
- [ ] Extract `history.js` - Browser history + scroll (~250 LOC)
- [ ] Extract `guards.js` - Navigation guards/middleware (~200 LOC)
- [ ] Extract `core.js` - RouteTrie + createRouter (~400 LOC)
- [ ] Extract `utils.js` - simpleRouter, lifecycle hooks (~150 LOC)
- [ ] Create `index.js` barrel export
- [ ] Run tests: `npm test -- runtime/router`
- [ ] Test ALL examples (router is core to SPAs)
  - [ ] `cd examples/todo && npm run dev`
  - [ ] `cd examples/chat && npm run dev`
  - [ ] `cd examples/blog && npm run dev`
  - [ ] `cd examples/e-commerce && npm run dev`
- [ ] Test lazy loading, guards, scroll restoration
- [ ] Git commit: `refactor(runtime): split router.js into sub-modules (#76)`

## Final Steps

- [ ] Update CLAUDE.md with new module structure
- [ ] Update CHANGELOG.md with refactoring notes
- [ ] Run full test suite: `npm test`
- [ ] Run bundle analysis: `pulse analyze --verbose`
- [ ] Compare bundle sizes (before vs after)
- [ ] Check for circular dependencies: `node scripts/check-circular-deps.js`
- [ ] Verify all example apps still work
- [ ] Update documentation site if needed
- [ ] Open PR to `develop` branch
- [ ] Request review
- [ ] Merge and close issues #74, #75, #76, #77

## Key Principles

1. **100% Backward Compatibility** - All existing imports MUST still work
2. **Barrel Exports** - Use `index.js` to re-export all public APIs
3. **No Bundle Size Increase** - Tree-shaking should preserve size
4. **No Circular Imports** - Sub-modules should not import each other (use shared utils)
5. **Test After Each Split** - Don't move on until tests pass
6. **Git Commits Per Module** - One commit per module split for easy rollback

## Testing Strategy

### Automated Tests
```bash
# Run all tests
npm test

# Run specific module tests
npm test -- runtime/a11y
npm test -- runtime/graphql
npm test -- runtime/router
npm test -- compiler/parser
```

### Manual Testing
```bash
# Test each example app
cd examples/todo && npm install && npm run dev
cd examples/chat && npm install && npm run dev
cd examples/blog && npm install && npm run dev
cd examples/e-commerce && npm install && npm run dev
```

### Bundle Analysis
```bash
# Before refactor
pulse analyze --json > before-refactor.json

# After refactor
pulse analyze --json > after-refactor.json

# Compare (should be neutral or slight improvement)
node -e "
const before = require('./before-refactor.json');
const after = require('./after-refactor.json');
console.log('Before:', before.totalSize);
console.log('After:', after.totalSize);
console.log('Diff:', after.totalSize - before.totalSize, 'bytes');
"
```

## Rollback Plan

If issues arise after a module split:

1. **Identify the problem** - Which module? What broke?
2. **Revert the specific commit** - `git revert <commit-hash>`
3. **Keep other refactorings** if they're working fine
4. **Fix and reapply** - Debug, fix, then re-split
5. **Document in ADR** - Note what went wrong and how it was fixed

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Circular import detected | Move shared code to `utils.js` or `core.js` |
| Test failures | Check import paths, ensure barrel exports complete |
| Bundle size increased | Verify tree-shaking config, check for side effects |
| TypeScript errors | Update `.d.ts` files if they exist |
| Import not found | Ensure `index.js` re-exports the symbol |

## Success Metrics

- ✅ **All tests pass** (100% of existing tests)
- ✅ **Zero bundle size increase** (±0% tolerance)
- ✅ **All examples functional** (4 example apps tested)
- ✅ **Documentation updated** (CLAUDE.md, CHANGELOG.md)
- ✅ **No new lint errors** (ESLint clean)
- ✅ **Clean git history** (1 commit per module)

---

**Implementation Time:** Estimated 17-23 hours
**Target Completion:** Before May 23, 2026 (milestone due date)
