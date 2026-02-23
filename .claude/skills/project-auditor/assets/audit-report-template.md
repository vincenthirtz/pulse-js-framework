# Pulse Framework Audit Report

**Date:** {{DATE}}
**Auditor:** project-auditor skill
**Scope:** {{SCOPE}}

---

## Executive Summary

**Overall Health: {{OVERALL_SCORE}}/100 ({{OVERALL_RATING}})**

| Severity | Count |
|----------|-------|
| Critical | {{CRITICAL_COUNT}} |
| High | {{HIGH_COUNT}} |
| Medium | {{MEDIUM_COUNT}} |
| Low | {{LOW_COUNT}} |

## Domain Scores

| Domain | Score | Rating | Critical | High | Medium | Low |
|--------|-------|--------|----------|------|--------|-----|
| Security | {{SEC_SCORE}} | {{SEC_RATING}} | {{SEC_CRIT}} | {{SEC_HIGH}} | {{SEC_MED}} | {{SEC_LOW}} |
| Architecture | {{ARCH_SCORE}} | {{ARCH_RATING}} | {{ARCH_CRIT}} | {{ARCH_HIGH}} | {{ARCH_MED}} | {{ARCH_LOW}} |
| Code Quality | {{QUAL_SCORE}} | {{QUAL_RATING}} | {{QUAL_CRIT}} | {{QUAL_HIGH}} | {{QUAL_MED}} | {{QUAL_LOW}} |
| Testing | {{TEST_SCORE}} | {{TEST_RATING}} | {{TEST_CRIT}} | {{TEST_HIGH}} | {{TEST_MED}} | {{TEST_LOW}} |
| Performance | {{PERF_SCORE}} | {{PERF_RATING}} | {{PERF_CRIT}} | {{PERF_HIGH}} | {{PERF_MED}} | {{PERF_LOW}} |
| Accessibility | {{A11Y_SCORE}} | {{A11Y_RATING}} | {{A11Y_CRIT}} | {{A11Y_HIGH}} | {{A11Y_MED}} | {{A11Y_LOW}} |
| Documentation | {{DOCS_SCORE}} | {{DOCS_RATING}} | {{DOCS_CRIT}} | {{DOCS_HIGH}} | {{DOCS_MED}} | {{DOCS_LOW}} |

---

## Critical Findings

{{CRITICAL_FINDINGS}}

## High-Priority Findings

{{HIGH_FINDINGS}}

## Medium-Priority Findings

{{MEDIUM_FINDINGS}}

## Low-Priority Findings

{{LOW_FINDINGS}}

---

## Improvement Roadmap

### Immediate (this week)
{{IMMEDIATE_ACTIONS}}

### Short-term (this month)
{{SHORTTERM_ACTIONS}}

### Long-term (this quarter)
{{LONGTERM_ACTIONS}}

---

## Appendix

- **Files audited:** {{FILE_COUNT}}
- **Lines scanned:** {{LINE_COUNT}}
- **Audit duration:** {{DURATION}}
- **Audit domains:** {{DOMAINS_AUDITED}}

---

### Finding Template

```
### [SEVERITY_ICON] SEVERITY: Title

- **File:** path/to/file.js:line
- **Domain:** Domain name
- **Description:** What was found and why it matters
- **Impact:** What could go wrong if not fixed
- **Fix:** Specific steps to resolve

Before:
\`\`\`javascript
// problematic code
\`\`\`

After:
\`\`\`javascript
// fixed code
\`\`\`
```

### Severity Definitions

| Level | Icon | Meaning | SLA |
|-------|------|---------|-----|
| **Critical** | `[!]` | Security vulnerability, data loss, or system crash risk | Fix within 24h |
| **High** | `[H]` | Bug, memory leak, or significant degradation | Fix before next release |
| **Medium** | `[M]` | Code smell, suboptimal pattern, maintainability concern | Fix within sprint |
| **Low** | `[L]` | Style issue, minor optimization, suggestion | Fix when convenient |
| **Info** | `[i]` | Observation, recommendation, future consideration | No action required |
