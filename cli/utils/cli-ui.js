/**
 * Pulse CLI UI Utilities
 * Progress bars, spinners, timing, and visual formatting
 * @module pulse-cli/utils/cli-ui
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

// Check if terminal supports colors
const supportsColor = process.stdout.isTTY && process.env.TERM !== 'dumb';

/**
 * Apply color to text if supported
 */
function c(color, text) {
  if (!supportsColor) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

// ============================================================================
// Progress Bar
// ============================================================================

/**
 * Create a progress bar for tracking long operations
 * @param {Object} options - Progress bar options
 * @param {number} [options.total=100] - Total steps
 * @param {number} [options.width=30] - Bar width in characters
 * @param {string} [options.label='Progress'] - Label to display
 * @param {boolean} [options.showPercent=true] - Show percentage
 * @param {boolean} [options.showCount=true] - Show current/total count
 * @returns {Object} Progress bar controller
 *
 * @example
 * const bar = createProgressBar({ total: files.length, label: 'Compiling' });
 * for (const file of files) {
 *   await compile(file);
 *   bar.tick();
 * }
 * bar.done();
 */
export function createProgressBar(options = {}) {
  const {
    total = 100,
    width = 30,
    label = 'Progress',
    showPercent = true,
    showCount = true
  } = options;

  let current = 0;
  let startTime = Date.now();
  let lastRender = 0;

  function render() {
    if (!process.stdout.isTTY) return;

    const now = Date.now();
    // Throttle renders to 60fps
    if (now - lastRender < 16) return;
    lastRender = now;

    const percent = Math.min(100, Math.floor((current / total) * 100));
    const filled = Math.floor((current / total) * width);
    const empty = width - filled;

    const bar = c('green', '█'.repeat(filled)) + c('gray', '░'.repeat(empty));
    const percentStr = showPercent ? c('cyan', ` ${percent}%`) : '';
    const countStr = showCount ? c('dim', ` (${current}/${total})`) : '';

    // Clear line and write progress
    process.stdout.write(`\r${c('bold', label)} ${bar}${percentStr}${countStr}  `);
  }

  function tick(amount = 1) {
    current = Math.min(total, current + amount);
    render();
  }

  function update(value) {
    current = Math.min(total, Math.max(0, value));
    render();
  }

  function done(message) {
    current = total;
    render();

    const elapsed = Date.now() - startTime;
    const timeStr = formatDuration(elapsed);

    if (process.stdout.isTTY) {
      process.stdout.write('\n');
    }

    if (message) {
      console.log(c('green', '✓') + ' ' + message + ' ' + c('dim', `(${timeStr})`));
    }

    return elapsed;
  }

  function fail(message) {
    if (process.stdout.isTTY) {
      process.stdout.write('\n');
    }
    console.log(c('red', '✗') + ' ' + message);
  }

  // Initial render
  render();

  return { tick, update, done, fail, render };
}

// ============================================================================
// Spinner
// ============================================================================

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Create a spinner for indeterminate progress
 * @param {string} message - Message to display
 * @returns {Object} Spinner controller
 *
 * @example
 * const spinner = createSpinner('Loading...');
 * await fetchData();
 * spinner.success('Loaded!');
 */
export function createSpinner(message) {
  let frameIndex = 0;
  let interval = null;
  let currentMessage = message;

  function render() {
    if (!process.stdout.isTTY) return;
    const frame = c('cyan', spinnerFrames[frameIndex]);
    process.stdout.write(`\r${frame} ${currentMessage}  `);
    frameIndex = (frameIndex + 1) % spinnerFrames.length;
  }

  function start() {
    if (!process.stdout.isTTY) {
      console.log(currentMessage);
      return;
    }
    interval = setInterval(render, 80);
    render();
  }

  function text(newMessage) {
    currentMessage = newMessage;
  }

  function stop() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    if (process.stdout.isTTY) {
      process.stdout.write('\r' + ' '.repeat(currentMessage.length + 10) + '\r');
    }
  }

  function success(msg) {
    stop();
    console.log(c('green', '✓') + ' ' + (msg || currentMessage));
  }

  function fail(msg) {
    stop();
    console.log(c('red', '✗') + ' ' + (msg || currentMessage));
  }

  function warn(msg) {
    stop();
    console.log(c('yellow', '⚠') + ' ' + (msg || currentMessage));
  }

  start();

  return { text, stop, success, fail, warn };
}

// ============================================================================
// Timing
// ============================================================================

/**
 * Create a timer for measuring operation duration
 * @param {string} [label] - Optional label for logging
 * @returns {Object} Timer controller
 *
 * @example
 * const timer = createTimer('Build');
 * await buildProject();
 * timer.end(); // Logs: "Build completed in 1.23s"
 */
export function createTimer(label) {
  const startTime = process.hrtime.bigint();

  function elapsed() {
    const endTime = process.hrtime.bigint();
    const ms = Number(endTime - startTime) / 1_000_000;
    return ms;
  }

  function end(customMessage) {
    const ms = elapsed();
    const formatted = formatDuration(ms);

    if (customMessage) {
      console.log(customMessage + ' ' + c('dim', `(${formatted})`));
    } else if (label) {
      console.log(c('green', '✓') + ` ${label} completed in ${c('cyan', formatted)}`);
    }

    return ms;
  }

  function format() {
    return formatDuration(elapsed());
  }

  return { elapsed, end, format };
}

/**
 * Format duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
export function formatDuration(ms) {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

// ============================================================================
// Table / Box Output
// ============================================================================

/**
 * Create a simple ASCII table
 * @param {string[]} headers - Column headers
 * @param {Array<Array>} rows - Table rows
 * @param {Object} [options] - Table options
 * @returns {string} Formatted table string
 */
export function createTable(headers, rows, options = {}) {
  const { align = [] } = options;

  // Calculate column widths
  const widths = headers.map((h, i) => {
    const colValues = [h, ...rows.map(r => String(r[i] || ''))];
    return Math.max(...colValues.map(v => stripAnsi(v).length));
  });

  // Format row
  function formatRow(cells, isHeader = false) {
    const formatted = cells.map((cell, i) => {
      const str = String(cell || '');
      const padding = widths[i] - stripAnsi(str).length;
      const alignment = align[i] || 'left';

      if (alignment === 'right') {
        return ' '.repeat(padding) + str;
      } else if (alignment === 'center') {
        const left = Math.floor(padding / 2);
        const right = padding - left;
        return ' '.repeat(left) + str + ' '.repeat(right);
      }
      return str + ' '.repeat(padding);
    });

    return '│ ' + formatted.join(' │ ') + ' │';
  }

  // Build table
  const separator = '─';
  const topBorder = '┌─' + widths.map(w => separator.repeat(w)).join('─┬─') + '─┐';
  const headerSep = '├─' + widths.map(w => separator.repeat(w)).join('─┼─') + '─┤';
  const bottomBorder = '└─' + widths.map(w => separator.repeat(w)).join('─┴─') + '─┘';

  const lines = [
    topBorder,
    formatRow(headers.map(h => c('bold', h)), true),
    headerSep,
    ...rows.map(row => formatRow(row)),
    bottomBorder
  ];

  return lines.join('\n');
}

/**
 * Create a box around text
 * @param {string} content - Content to box
 * @param {Object} [options] - Box options
 * @returns {string} Boxed text
 */
export function createBox(content, options = {}) {
  const { title, padding = 1, borderColor = 'cyan' } = options;
  const lines = content.split('\n');
  const maxWidth = Math.max(...lines.map(l => stripAnsi(l).length));
  const innerWidth = maxWidth + padding * 2;

  const horizontal = '─'.repeat(innerWidth);
  const topBorder = title
    ? `┌─ ${c('bold', title)} ${'─'.repeat(Math.max(0, innerWidth - title.length - 3))}┐`
    : `┌${horizontal}┐`;

  const paddedLines = lines.map(line => {
    const lineWidth = stripAnsi(line).length;
    const rightPadding = maxWidth - lineWidth + padding;
    return `│${' '.repeat(padding)}${line}${' '.repeat(rightPadding)}│`;
  });

  const result = [
    c(borderColor, topBorder),
    ...paddedLines.map(l => c(borderColor, '│') + l.slice(1, -1) + c(borderColor, '│')),
    c(borderColor, `└${horizontal}┘`)
  ];

  return result.join('\n');
}

// ============================================================================
// Graph Visualization (for analyzer)
// ============================================================================

/**
 * Create a horizontal bar chart
 * @param {Array<{label: string, value: number, color?: string}>} data - Chart data
 * @param {Object} [options] - Chart options
 * @returns {string} ASCII bar chart
 */
export function createBarChart(data, options = {}) {
  const { maxWidth = 40, showValues = true, unit = '' } = options;

  const maxValue = Math.max(...data.map(d => d.value));
  const maxLabelWidth = Math.max(...data.map(d => d.label.length));

  const lines = data.map(({ label, value, color = 'green' }) => {
    const barWidth = Math.round((value / maxValue) * maxWidth);
    const bar = c(color, '█'.repeat(barWidth)) + c('gray', '░'.repeat(maxWidth - barWidth));
    const paddedLabel = label.padEnd(maxLabelWidth);
    const valueStr = showValues ? ' ' + c('dim', `${value}${unit}`) : '';

    return `${paddedLabel} ${bar}${valueStr}`;
  });

  return lines.join('\n');
}

/**
 * Create a simple tree visualization
 * @param {Object} node - Tree node with { name, children? }
 * @param {string} [prefix=''] - Prefix for current level
 * @param {boolean} [isLast=true] - Is this the last child
 * @returns {string} ASCII tree
 */
export function createTree(node, prefix = '', isLast = true) {
  const connector = isLast ? '└── ' : '├── ';
  const extension = isLast ? '    ' : '│   ';

  let result = prefix + connector + node.name + '\n';

  if (node.children && node.children.length > 0) {
    node.children.forEach((child, index) => {
      const childIsLast = index === node.children.length - 1;
      result += createTree(child, prefix + extension, childIsLast);
    });
  }

  return result;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Strip ANSI codes from string
 */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Print a section header
 * @param {string} title - Section title
 */
export function printSection(title) {
  console.log();
  console.log(c('bold', c('cyan', '▸ ' + title)));
  console.log(c('dim', '─'.repeat(Math.min(60, title.length + 2))));
}

/**
 * Print a summary box
 * @param {Object} stats - Statistics object
 * @param {string} [title] - Box title
 */
export function printSummary(stats, title = 'Summary') {
  const entries = Object.entries(stats);
  const maxKeyWidth = Math.max(...entries.map(([k]) => k.length));

  console.log();
  console.log(c('bold', title));
  entries.forEach(([key, value]) => {
    const paddedKey = key.padEnd(maxKeyWidth);
    console.log(`  ${c('dim', paddedKey)}  ${value}`);
  });
}

export default {
  createProgressBar,
  createSpinner,
  createTimer,
  formatDuration,
  createTable,
  createBox,
  createBarChart,
  createTree,
  printSection,
  printSummary,
  colors: supportsColor ? colors : {}
};
