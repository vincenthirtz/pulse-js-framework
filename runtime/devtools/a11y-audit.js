/**
 * Pulse DevTools - Accessibility Audit Module
 * @module pulse-js-framework/runtime/devtools/a11y-audit
 *
 * Real-time accessibility validation with visual highlighting and reports.
 */

import { validateA11y, highlightA11yIssues } from '../a11y.js';
import { createLogger } from '../logger.js';
import { config as diagnosticsConfig } from './diagnostics.js';

const log = createLogger('DevTools:A11y');

// =============================================================================
// A11Y AUDIT CONFIGURATION
// =============================================================================

/**
 * A11y audit configuration
 */
export const a11yAuditConfig = {
  enabled: false,
  autoAudit: false,
  auditInterval: 5000,
  highlightIssues: true,
  logToConsole: true,
  breakOnError: false,
  watchMutations: false
};

/**
 * Current a11y audit state
 */
let a11yAuditState = {
  issues: [],
  lastAuditTime: null,
  auditCount: 0,
  highlightCleanup: null,
  mutationObserver: null,
  intervalId: null,
  mutationTimeout: null
};

// =============================================================================
// A11Y AUDIT API
// =============================================================================

/**
 * @typedef {Object} A11yAuditResult
 * @property {Array} issues - List of accessibility issues found
 * @property {number} errorCount - Number of errors
 * @property {number} warningCount - Number of warnings
 * @property {number} auditTime - Time taken for audit in ms
 * @property {string} timestamp - ISO timestamp of audit
 */

/**
 * Run an accessibility audit on the document or specific element
 * @param {Element} [root=document.body] - Root element to audit
 * @param {Object} [options] - Audit options
 * @returns {A11yAuditResult} Audit result
 */
export function runA11yAudit(root, options = {}) {
  if (typeof document === 'undefined') {
    return { issues: [], errorCount: 0, warningCount: 0, auditTime: 0, timestamp: new Date().toISOString() };
  }

  const startTime = performance.now();
  const targetRoot = root || document.body;

  // Run validation with options
  const issues = validateA11y(targetRoot, options);

  const auditTime = performance.now() - startTime;
  a11yAuditState.lastAuditTime = Date.now();
  a11yAuditState.auditCount++;
  a11yAuditState.issues = issues;

  // Count by severity
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  const result = {
    issues,
    errorCount,
    warningCount,
    auditTime,
    timestamp: new Date().toISOString()
  };

  // Log to console if enabled
  if (a11yAuditConfig.logToConsole && diagnosticsConfig.enabled) {
    logA11yAuditResult(result);
  }

  // Highlight issues if enabled
  if (a11yAuditConfig.highlightIssues && diagnosticsConfig.enabled) {
    if (a11yAuditState.highlightCleanup) {
      a11yAuditState.highlightCleanup();
    }
    a11yAuditState.highlightCleanup = highlightA11yIssues(issues);
  }

  // Break on error if configured
  if (a11yAuditConfig.breakOnError && errorCount > 0) {
    log.error('Breaking due to accessibility errors');
    // eslint-disable-next-line no-debugger
    debugger;
  }

  return result;
}

/**
 * Log audit result to console with formatting
 * @private
 */
function logA11yAuditResult(result) {
  const { issues, errorCount, warningCount, auditTime } = result;

  console.group(`%c[A11y Audit] ${errorCount} errors, ${warningCount} warnings (${auditTime.toFixed(1)}ms)`,
    errorCount > 0 ? 'color: red; font-weight: bold' : 'color: green; font-weight: bold');

  if (issues.length === 0) {
    console.log('%c✓ No accessibility issues found', 'color: green');
  } else {
    // Group by severity
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');

    if (errors.length > 0) {
      console.group('%cErrors', 'color: red; font-weight: bold');
      for (const issue of errors) {
        console.error(`${issue.rule}: ${issue.message}`, issue.element || '');
      }
      console.groupEnd();
    }

    if (warnings.length > 0) {
      console.group('%cWarnings', 'color: orange');
      for (const issue of warnings) {
        console.warn(`${issue.rule}: ${issue.message}`, issue.element || '');
      }
      console.groupEnd();
    }
  }

  console.groupEnd();
}

/**
 * Get current accessibility issues from last audit
 * @returns {Array} List of a11y issues
 */
export function getA11yIssues() {
  return [...a11yAuditState.issues];
}

/**
 * Get a11y audit statistics
 * @returns {Object} Audit statistics
 */
export function getA11yStats() {
  const issues = a11yAuditState.issues;
  const byRule = {};

  for (const issue of issues) {
    byRule[issue.rule] = (byRule[issue.rule] || 0) + 1;
  }

  return {
    totalIssues: issues.length,
    errorCount: issues.filter(i => i.severity === 'error').length,
    warningCount: issues.filter(i => i.severity === 'warning').length,
    issuesByRule: byRule,
    auditCount: a11yAuditState.auditCount,
    lastAuditTime: a11yAuditState.lastAuditTime,
    isWatching: a11yAuditState.mutationObserver !== null,
    isAutoAuditing: a11yAuditState.intervalId !== null
  };
}

/**
 * Enable accessibility audit mode
 * @param {Object} [options] - Configuration options
 */
export function enableA11yAudit(options = {}) {
  Object.assign(a11yAuditConfig, options, { enabled: true });

  // Run initial audit
  runA11yAudit();

  // Setup auto-audit if enabled
  if (a11yAuditConfig.autoAudit && typeof window !== 'undefined') {
    a11yAuditState.intervalId = setInterval(() => {
      runA11yAudit();
    }, a11yAuditConfig.auditInterval);
  }

  // Setup mutation observer if enabled
  if (a11yAuditConfig.watchMutations && typeof MutationObserver !== 'undefined') {
    a11yAuditState.mutationObserver = new MutationObserver(() => {
      // Debounce audit on mutations
      clearTimeout(a11yAuditState.mutationTimeout);
      a11yAuditState.mutationTimeout = setTimeout(() => {
        runA11yAudit();
      }, 250);
    });

    a11yAuditState.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'aria-label', 'aria-hidden', 'aria-describedby', 'alt', 'tabindex']
    });
  }

  if (diagnosticsConfig.enabled) {
    log.info('A11y Audit enabled', a11yAuditConfig);
  }
}

/**
 * Disable accessibility audit mode
 */
export function disableA11yAudit() {
  a11yAuditConfig.enabled = false;

  // Clear auto-audit interval
  if (a11yAuditState.intervalId) {
    clearInterval(a11yAuditState.intervalId);
    a11yAuditState.intervalId = null;
  }

  // Disconnect mutation observer
  if (a11yAuditState.mutationObserver) {
    a11yAuditState.mutationObserver.disconnect();
    a11yAuditState.mutationObserver = null;
  }

  // Clear highlights
  if (a11yAuditState.highlightCleanup) {
    a11yAuditState.highlightCleanup();
    a11yAuditState.highlightCleanup = null;
  }

  if (diagnosticsConfig.enabled) {
    log.info('A11y Audit disabled');
  }
}

/**
 * Toggle issue highlighting
 * @param {boolean} [show] - Show or hide highlights (toggles if not specified)
 */
export function toggleA11yHighlights(show) {
  const shouldShow = show !== undefined ? show : !a11yAuditState.highlightCleanup;

  if (shouldShow) {
    if (a11yAuditState.highlightCleanup) {
      a11yAuditState.highlightCleanup();
    }
    a11yAuditState.highlightCleanup = highlightA11yIssues(a11yAuditState.issues);
  } else {
    if (a11yAuditState.highlightCleanup) {
      a11yAuditState.highlightCleanup();
      a11yAuditState.highlightCleanup = null;
    }
  }
}

// =============================================================================
// EXPORT REPORTS
// =============================================================================

/**
 * Get a CSS selector for an element
 * @private
 */
function getElementSelector(element) {
  if (!element) return 'unknown';

  const parts = [];
  let el = element;

  while (el && el !== document.body) {
    let selector = el.tagName?.toLowerCase() || '';

    if (el.id) {
      selector += `#${el.id}`;
      parts.unshift(selector);
      break;
    }

    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (classes) selector += `.${classes}`;
    }

    parts.unshift(selector);
    el = el.parentElement;
  }

  return parts.join(' > ');
}

/**
 * Export report as CSV
 * @private
 */
function exportA11yReportAsCsv(report) {
  const headers = ['severity', 'rule', 'message', 'element', 'selector'];
  const rows = report.issues.map(i =>
    [i.severity, i.rule, `"${i.message.replace(/"/g, '""')}"`, i.element, `"${i.selector}"`].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export report as HTML
 * @private
 */
function exportA11yReportAsHtml(report) {
  const errorCount = report.stats.errorCount;
  const warningCount = report.stats.warningCount;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Accessibility Audit Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .stat { padding: 15px 25px; border-radius: 8px; }
    .errors { background: #fee; color: #c00; }
    .warnings { background: #ffd; color: #a50; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
    .error { color: #c00; }
    .warning { color: #a50; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Accessibility Audit Report</h1>
  <p>Generated: ${report.timestamp}</p>
  <p>URL: <code>${report.url}</code></p>

  <div class="summary">
    <div class="stat errors"><strong>${errorCount}</strong> Errors</div>
    <div class="stat warnings"><strong>${warningCount}</strong> Warnings</div>
  </div>

  ${report.issues.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Severity</th>
        <th>Rule</th>
        <th>Message</th>
        <th>Element</th>
      </tr>
    </thead>
    <tbody>
      ${report.issues.map(i => `
      <tr>
        <td class="${i.severity}">${i.severity}</td>
        <td><code>${i.rule}</code></td>
        <td>${i.message}</td>
        <td><code>${i.selector}</code></td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ` : '<p style="color: green;">✓ No accessibility issues found!</p>'}
</body>
</html>`;
}

/**
 * Export a11y audit report
 * @param {string} [format='json'] - Export format ('json', 'csv', 'html')
 * @returns {string} Formatted report
 */
export function exportA11yReport(format = 'json') {
  const stats = getA11yStats();
  const issues = getA11yIssues();

  const report = {
    timestamp: new Date().toISOString(),
    url: typeof location !== 'undefined' ? location.href : 'unknown',
    stats,
    issues: issues.map(i => ({
      rule: i.rule,
      severity: i.severity,
      message: i.message,
      element: i.element?.tagName?.toLowerCase() || 'unknown',
      selector: i.element ? getElementSelector(i.element) : 'unknown'
    }))
  };

  switch (format) {
    case 'csv':
      return exportA11yReportAsCsv(report);
    case 'html':
      return exportA11yReportAsHtml(report);
    default:
      return JSON.stringify(report, null, 2);
  }
}

/**
 * Reset a11y audit state
 */
export function resetA11yAudit() {
  disableA11yAudit();
  a11yAuditState = {
    issues: [],
    lastAuditTime: null,
    auditCount: 0,
    highlightCleanup: null,
    mutationObserver: null,
    intervalId: null,
    mutationTimeout: null
  };
}

export default {
  a11yAuditConfig,
  runA11yAudit,
  getA11yIssues,
  getA11yStats,
  enableA11yAudit,
  disableA11yAudit,
  toggleA11yHighlights,
  exportA11yReport,
  resetA11yAudit
};
