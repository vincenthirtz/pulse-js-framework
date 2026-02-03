/**
 * Pulse Documentation - Styles
 */

export const styles = `
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --bg: #0f172a;
  --bg-light: #1e293b;
  --card: #1e293b;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --border: #334155;
  --code-bg: #0d1117;
  --success: #10b981;
  --radius: 12px;
}

/* Light theme */
[data-theme="light"] {
  --primary: #4f46e5;
  --primary-dark: #4338ca;
  --bg: #f8fafc;
  --bg-light: #ffffff;
  --card: #ffffff;
  --text: #1e293b;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --code-bg: #f1f5f9;
}

/* Theme transition */
html {
  transition: background-color 0.3s ease, color 0.3s ease;
}

html, body, .app, .header, .nav-link, .btn, .code-block, .feature, .example-card {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  background: var(--bg-light);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  gap: 24px;
}

.logo {
  font-size: 1.5em;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo span {
  background: linear-gradient(135deg, var(--primary), #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Logo pulse animation on hover */
@keyframes logoPulse {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 0 transparent);
  }
  50% {
    transform: scale(1.05);
    filter: drop-shadow(0 0 12px rgba(99, 102, 241, 0.6));
  }
}

.logo:hover {
  animation: logoPulse 0.8s ease-in-out infinite;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.version-badge {
  font-size: 0.75em;
  padding: 4px 10px;
  background: rgba(99, 102, 241, 0.15);
  color: var(--primary);
  border-radius: 20px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.version-badge:hover {
  background: rgba(99, 102, 241, 0.25);
  transform: translateY(-1px);
}

.stars-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75em;
  padding: 4px 10px;
  background: rgba(250, 204, 21, 0.15);
  color: #fbbf24;
  border-radius: 20px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.stars-badge:hover {
  background: rgba(250, 204, 21, 0.25);
  transform: translateY(-1px);
}

.star-icon {
  font-size: 1.1em;
}

.star-count {
  font-weight: 600;
}

.nav {
  display: flex;
  gap: 4px;
  align-items: center;
}

.nav-link {
  padding: 10px 18px;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
  font-size: 0.95em;
  font-weight: 500;
  white-space: nowrap;
}

.nav-link:hover {
  color: var(--text);
  background: var(--bg);
}

.nav-link.active {
  color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

/* Dropdown Menu */
.nav-dropdown {
  position: relative;
}

.nav-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-family: inherit;
}

.dropdown-arrow {
  font-size: 0.7em;
  transition: transform 0.2s ease;
  opacity: 0.6;
}

.nav-dropdown:hover .dropdown-arrow,
.nav-dropdown.open .dropdown-arrow {
  transform: rotate(-180deg);
}

.nav-dropdown-trigger.has-active {
  color: var(--primary);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 220px;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  z-index: 200;
}

.dropdown-menu::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  border: 8px solid transparent;
  border-bottom-color: var(--border);
}

.dropdown-menu::after {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-bottom-color: var(--bg-light);
}

.nav-dropdown:hover .dropdown-menu,
.nav-dropdown.open .dropdown-menu {
  opacity: 1;
  visibility: visible;
}

.dropdown-item {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--text);
  transition: all 0.15s ease;
}

.dropdown-item:hover {
  background: var(--bg);
}

.dropdown-item.active {
  background: rgba(99, 102, 241, 0.15);
}

.dropdown-item.active .dropdown-item-label {
  color: var(--primary);
}

.dropdown-item-label {
  font-weight: 500;
  font-size: 0.95em;
}

.dropdown-item-desc {
  font-size: 0.8em;
  color: var(--text-muted);
  margin-top: 2px;
}

.menu-btn {
  display: none;
  background: none;
  border: none;
  color: var(--text);
  font-size: 1.5em;
  cursor: pointer;
}

/* Header Actions (language + theme) */
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}

.theme-btn {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 1.2em;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.theme-btn:hover {
  background: var(--border);
  transform: scale(1.05);
}

/* Language Selector */
.lang-selector {
  position: relative;
}

.lang-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lang-btn svg {
  width: 24px;
  height: 16px;
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.lang-btn:hover {
  background: var(--border);
  transform: scale(1.05);
}

.lang-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  z-index: 200;
}

.lang-selector.open .lang-menu {
  opacity: 1;
  visibility: visible;
}

.lang-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.95em;
  transition: all 0.15s ease;
  text-align: left;
}

.lang-option:hover {
  background: var(--bg);
}

.lang-option.active {
  background: rgba(99, 102, 241, 0.15);
  color: var(--primary);
}

.lang-option span {
  flex: 1;
}

.lang-option svg {
  width: 24px;
  height: 16px;
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
  flex-shrink: 0;
}

.mobile-nav {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-light);
  border-bottom: 1px solid var(--border);
  padding: 16px;
  flex-direction: column;
}

.mobile-nav.open {
  display: flex;
}

/* Large screens */
@media (min-width: 1024px) {
  .header { padding: 16px 48px; }
  .nav { gap: 8px; }
  .nav-link { padding: 10px 18px; }
}

/* Medium screens */
@media (max-width: 1023px) and (min-width: 769px) {
  .header { padding: 14px 24px; }
  .nav-link {
    padding: 8px 14px;
    font-size: 0.9em;
  }
  .dropdown-menu {
    min-width: 200px;
  }
}

/* Mobile - hamburger menu */
@media (max-width: 768px) {
  .header { padding: 14px 16px; }
  .nav { display: none; }
  .menu-btn { display: block; }
  .header-actions { gap: 4px; }
  .theme-btn { padding: 6px 10px; font-size: 1em; }
  .lang-btn { padding: 6px 10px; font-size: 1em; }
  .lang-menu { min-width: 140px; right: 0; }
  .version-badge, .stars-badge {
    padding: 3px 8px;
    font-size: 0.7em;
  }
}

/* Main */
.main {
  flex: 1;
  padding: 48px 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Page */
.page {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Hero */
.hero {
  text-align: center;
  padding: 80px 20px;
}

.hero h1 {
  font-size: 3.5em;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fff, var(--primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

[data-theme="light"] .hero h1 {
  background: linear-gradient(135deg, var(--primary), #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tagline {
  font-size: 1.3em;
  color: var(--text-muted);
  margin-bottom: 32px;
}

.hero-features {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 40px;
}

.feature {
  padding: 8px 16px;
  background: var(--bg-light);
  border-radius: 100px;
  font-size: 0.9em;
}

.feature-highlight {
  background: linear-gradient(135deg, var(--primary), #a855f7);
  color: white;
  font-weight: 600;
  animation: featurePulse 2s ease-in-out infinite;
}

@keyframes featurePulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
  }
  50% {
    box-shadow: 0 0 20px 4px rgba(99, 102, 241, 0.3);
  }
}

.hero-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

/* Buttons */
.btn {
  padding: 12px 24px;
  font-size: 1em;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

.btn-secondary {
  background: var(--bg-light);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--bg);
}

.btn-disabled {
  background: var(--bg-light);
  color: var(--text-muted);
  cursor: not-allowed;
}

/* Sections */
.section {
  margin-top: 80px;
}

.section h2 {
  font-size: 2em;
  margin-bottom: 24px;
  text-align: center;
}

/* Code blocks */
.code-block {
  background: var(--code-bg);
  border-radius: var(--radius);
  overflow: hidden;
  margin: 16px 0;
}

.code-header {
  padding: 8px 16px;
  background: var(--bg-light);
  font-size: 0.85em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

.code-block pre {
  padding: 16px;
  overflow-x: auto;
  font-family: 'Fira Code', monospace;
  font-size: 0.9em;
  line-height: 1.5;
}

.code-block code {
  display: block;
  color: #e2e8f0;
  white-space: pre;
}

/* Syntax highlighting - Dark theme */
.hljs-keyword { color: #ff79c6; }
.hljs-string { color: #f1fa8c; }
.hljs-number { color: #bd93f9; }
.hljs-comment { color: #6272a4; font-style: italic; }
.hljs-function { color: #50fa7b; }
.hljs-class { color: #8be9fd; }
.hljs-property { color: #66d9ef; }
.hljs-operator { color: #ff79c6; }
.hljs-punctuation { color: #f8f8f2; }
.hljs-tag { color: #ff79c6; }
.hljs-attr { color: #50fa7b; }
.hljs-selector { color: #8be9fd; }
.hljs-directive { color: #ffb86c; }
.hljs-variable { color: #f8f8f2; }

/* Syntax highlighting - Light theme */
[data-theme="light"] .hljs-keyword { color: #d73a49; }
[data-theme="light"] .hljs-string { color: #22863a; }
[data-theme="light"] .hljs-number { color: #6f42c1; }
[data-theme="light"] .hljs-comment { color: #6a737d; }
[data-theme="light"] .hljs-function { color: #005cc5; }
[data-theme="light"] .hljs-class { color: #e36209; }
[data-theme="light"] .hljs-property { color: #005cc5; }
[data-theme="light"] .hljs-operator { color: #d73a49; }
[data-theme="light"] .hljs-punctuation { color: #24292e; }
[data-theme="light"] .hljs-tag { color: #22863a; }
[data-theme="light"] .hljs-attr { color: #6f42c1; }
[data-theme="light"] .hljs-selector { color: #6f42c1; }
[data-theme="light"] .hljs-directive { color: #e36209; }
[data-theme="light"] .hljs-variable { color: #24292e; }

[data-theme="light"] .code-block code {
  color: #24292e;
}

.code-example {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

/* Comparison table (legacy) */
.comparison-table {
  overflow-x: auto;
}

.comparison-table table {
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0;
}

.comparison-table th,
.comparison-table td {
  padding: 12px 16px;
  text-align: left;
  border: 1px solid var(--border);
}

.comparison-table th {
  background: var(--bg-light);
}

.comparison-table td strong {
  color: var(--primary);
}

/* Modern Comparison Cards */
.comparison-section h2 {
  text-align: center;
  margin-bottom: 40px;
}

.comparison-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 1100px;
  margin: 0 auto;
}

.comparison-card {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 28px;
  transition: all 0.3s ease;
}

.comparison-card:hover {
  border-color: var(--primary);
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(99, 102, 241, 0.12);
}

.comparison-icon {
  font-size: 2.5em;
  margin-bottom: 16px;
}

.comparison-card h3 {
  font-size: 1.1em;
  margin-bottom: 20px;
  color: var(--text);
}

/* Others frameworks list */
.comparison-others {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.other-fw {
  font-size: 0.8em;
  padding: 4px 10px;
  background: var(--bg);
  border-radius: 20px;
  color: var(--text-muted);
}

.comparison-pulse {
  margin-top: auto;
}

.pulse-badge {
  display: inline-block;
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--primary), #a855f7);
  color: white;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9em;
}

/* Size bars */
.size-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.size-bar {
  display: grid;
  grid-template-columns: 60px 1fr 50px;
  align-items: center;
  gap: 12px;
}

.bar-label {
  font-size: 0.8em;
  color: var(--text-muted);
}

.bar-track {
  height: 8px;
  background: var(--bg);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--border);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.pulse-fill {
  background: linear-gradient(90deg, var(--primary), #a855f7);
}

.bar-value {
  font-size: 0.8em;
  color: var(--text-muted);
  text-align: right;
}

.size-bar.highlight .bar-label,
.size-bar.highlight .bar-value {
  color: var(--primary);
  font-weight: 600;
}

/* Build comparison */
.build-comparison {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.build-others {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.build-required {
  font-size: 0.8em;
  padding: 4px 10px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 20px;
}

.build-optional {
  display: inline-block;
  padding: 8px 16px;
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9em;
}

/* Speed indicator */
.speed-indicator {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.speed-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85em;
  padding: 6px 0;
}

.speed-dots {
  letter-spacing: 2px;
}

.speed-item.slow { color: var(--text-muted); }
.speed-item.slow .speed-dots { color: #ef4444; }
.speed-item.medium .speed-dots { color: #f59e0b; }
.speed-item.fast .speed-dots { color: #10b981; }
.speed-item.instant {
  color: var(--primary);
  font-weight: 600;
}
.speed-item.instant .speed-dots { color: var(--primary); }

/* Learning curve */
.learning-curve {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.curve-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85em;
  padding: 6px 0;
}

.curve-item.steep { color: var(--text-muted); }
.curve-item.moderate { color: var(--text-muted); }
.curve-item.easy { color: var(--text-muted); }
.curve-item.minimal {
  color: var(--primary);
  font-weight: 600;
}

/* A11y comparison */
.a11y-comparison {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.a11y-others {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.a11y-third {
  font-size: 0.8em;
  color: var(--text-muted);
}

.a11y-builtin {
  display: inline-block;
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--primary), #a855f7);
  color: white;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9em;
}

@media (max-width: 900px) {
  .comparison-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .comparison-cards {
    grid-template-columns: 1fr;
  }
}

/* Docs page */
.docs-page h1 {
  font-size: 2.5em;
  margin-bottom: 32px;
}

.doc-section {
  margin-bottom: 48px;
}

.doc-section h2 {
  font-size: 1.5em;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.doc-section h3 {
  font-size: 1.2em;
  margin: 24px 0 12px;
}

.doc-section p {
  color: var(--text-muted);
  margin-bottom: 16px;
}

.doc-section ul {
  margin-left: 24px;
  margin-bottom: 16px;
}

.doc-section li {
  margin-bottom: 8px;
}

.doc-section code {
  background: var(--code-bg);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
}

.api-item {
  background: var(--bg-light);
  padding: 24px;
  border-radius: var(--radius);
  margin-bottom: 16px;
}

.api-item h3 {
  margin-top: 0;
}

.feature-list {
  list-style: none;
  margin-left: 0;
}

.feature-list li {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.feature-list code {
  color: var(--primary);
}

.next-section {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  text-align: center;
}

/* Changelog page */
.changelog-section {
  margin-bottom: 48px;
}

.changelog-section h2 {
  color: var(--primary);
  font-size: 1.8em;
}

.release-date {
  font-size: 0.9em;
  color: var(--text-dim);
  margin-bottom: 24px;
  font-style: italic;
}

.changelog-group {
  background: var(--bg-light);
  padding: 24px;
  border-radius: var(--radius);
  margin-bottom: 24px;
}

.changelog-item {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.changelog-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.changelog-item h4 {
  margin: 0 0 8px 0;
  font-size: 1.1em;
}

.changelog-item h4 code {
  background: rgba(100, 108, 255, 0.1);
  color: var(--primary);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.95em;
}

.changelog-item p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.6;
}

.changelog-group > p {
  margin-bottom: 16px;
}

.changelog-group .feature-list {
  margin-bottom: 16px;
}

.changelog-group .code-block {
  margin-top: 12px;
}

/* Examples page */
.examples-page .intro {
  font-size: 1.2em;
  color: var(--text-muted);
  margin-bottom: 32px;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

.example-card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 24px;
  border: 1px solid var(--border);
  transition: transform 0.2s, border-color 0.2s;
}

.example-card:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
}

.example-card.coming-soon {
  opacity: 0.6;
}

.example-card.coming-soon:hover {
  transform: none;
  border-color: var(--border);
}

.example-card.featured {
  border: 2px solid var(--primary);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05));
}

.example-card.featured .example-icon {
  background: linear-gradient(135deg, var(--primary), #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.example-icon {
  font-size: 3em;
  margin-bottom: 16px;
}

.example-card h3 {
  font-size: 1.3em;
  margin-bottom: 8px;
}

.example-card > p {
  color: var(--text-muted);
  margin-bottom: 16px;
}

.example-features {
  list-style: none;
  margin-bottom: 24px;
}

.example-features li {
  padding: 4px 0;
  font-size: 0.9em;
  color: var(--text-muted);
}

/* Footer */
.footer {
  background: var(--bg-light);
  padding: 32px 24px;
  text-align: center;
  border-top: 1px solid var(--border);
}

.footer-content p {
  margin-bottom: 8px;
}

.footer-links {
  color: var(--text-muted);
}

.footer-links a {
  color: var(--primary);
  text-decoration: none;
}

.footer-links a:hover {
  text-decoration: underline;
}

.footer-social {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  gap: 16px;
}

.social-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.social-link.discord {
  background: #5865F2;
  color: white;
}

.social-link.discord:hover {
  background: #4752c4;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(88, 101, 242, 0.4);
}

.social-link svg {
  flex-shrink: 0;
}

/* Playground */
.playground-page {
  max-width: 100%;
  padding: 20px;
}

.playground-page h1 {
  margin-bottom: 8px;
}

.playground-page .intro {
  margin-bottom: 24px;
  color: var(--text-muted);
}

.playground-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  height: calc(100vh - 300px);
  min-height: 500px;
}

.playground-editor,
.playground-preview {
  display: flex;
  flex-direction: column;
  background: var(--bg-light);
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
}

.editor-header,
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--code-bg);
  border-bottom: 1px solid var(--border);
}

.editor-title,
.preview-title {
  font-weight: 600;
  font-size: 0.9em;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.run-btn,
.reset-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 500;
  transition: all 0.2s;
}

.run-btn {
  background: var(--primary);
  color: white;
}

.run-btn:hover {
  background: var(--primary-dark);
}

.reset-btn {
  background: var(--border);
  color: var(--text);
}

.reset-btn:hover {
  background: #475569;
}

#codeEditor {
  flex: 1;
  width: 100%;
  padding: 16px;
  background: var(--code-bg);
  color: var(--text);
  border: none;
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  outline: none;
  tab-size: 2;
}

#codeEditor::placeholder {
  color: var(--text-muted);
}

.preview-status {
  font-size: 0.8em;
  padding: 4px 10px;
  border-radius: 4px;
  background: var(--border);
}

.preview-status.running {
  background: #3b82f6;
  color: white;
}

.preview-status.success {
  background: var(--success);
  color: white;
}

.preview-status.error {
  background: #ef4444;
  color: white;
}

#previewFrame {
  flex: 1;
  width: 100%;
  border: none;
  background: var(--bg-light);
}

.playground-templates {
  margin-top: 24px;
}

.playground-templates h3 {
  margin-bottom: 12px;
  font-size: 1em;
  color: var(--text-muted);
}

.template-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.template-btn {
  padding: 10px 20px;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s;
}

.template-btn:hover {
  background: var(--border);
  border-color: var(--primary);
}

@media (max-width: 1024px) {
  .playground-container {
    grid-template-columns: 1fr;
    height: auto;
  }

  .playground-editor,
  .playground-preview {
    height: 400px;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .hero h1 { font-size: 2.5em; }
  .hero-features { gap: 12px; }
  .feature { font-size: 0.8em; padding: 6px 12px; }
  .main { padding: 24px 16px; }
}

/* Mobile page feature grid */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 24px 0;
}

.feature-item {
  background: var(--bg-light);
  padding: 20px;
  border-radius: var(--radius);
  text-align: center;
}

.feature-item .feature-icon {
  font-size: 2em;
  margin-bottom: 12px;
}

.feature-item h4 {
  margin-bottom: 8px;
}

.feature-item p {
  font-size: 0.9em;
  color: var(--text-muted);
  margin: 0;
}

/* API Search */
.api-search {
  position: relative;
  margin-bottom: 32px;
}

.api-search input {
  width: 100%;
  padding: 14px 48px 14px 16px;
  font-size: 1em;
  background: var(--bg-light);
  border: 2px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  outline: none;
  transition: all 0.2s ease;
}

.api-search input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.api-search input::placeholder {
  color: var(--text-muted);
}

.api-search-clear {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.4em;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
  user-select: none;
}

.api-search-clear:hover {
  color: var(--text);
}

.api-search-results {
  position: absolute;
  right: 50px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85em;
  color: var(--text-muted);
}

.api-item.search-highlight {
  border-left: 3px solid var(--primary);
  animation: highlightPulse 0.3s ease;
}

@keyframes highlightPulse {
  0% { background: rgba(99, 102, 241, 0.1); }
  100% { background: var(--bg-light); }
}

.doc-section[style*="display: none"] + .doc-section {
  margin-top: 0;
}

/* Keyboard hint */
.api-search-kbd {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px 10px;
  font-size: 0.85em;
  font-family: inherit;
  background: var(--border);
  color: var(--text-muted);
  border-radius: 6px;
  border: 1px solid var(--text-muted);
  opacity: 0.7;
  pointer-events: none;
  transition: opacity 0.2s;
}

.api-search:focus-within .api-search-kbd {
  opacity: 0;
}

/* No results message */
.api-no-results {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted);
}

.api-no-results-icon {
  font-size: 3em;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* API Filters */
.api-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 0.9em;
  color: var(--text-muted);
  margin-right: 8px;
}

.filter-btn {
  padding: 6px 14px;
  font-size: 0.85em;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  border-color: var(--primary);
  color: var(--text);
}

.filter-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

/* FAQ Section */
.faq-section {
  margin-top: 48px;
}

.faq-item {
  background: var(--bg-light);
  padding: 20px 24px;
  border-radius: var(--radius);
  margin-bottom: 16px;
  border-left: 3px solid var(--primary);
}

.faq-item h3 {
  font-size: 1.1em;
  margin: 0 0 12px 0;
  color: var(--text);
}

.faq-item p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.6;
}

.faq-item a {
  color: var(--primary);
  text-decoration: none;
}

.faq-item a:hover {
  text-decoration: underline;
}

.faq-item .code-block {
  margin-top: 12px;
  margin-bottom: 0;
}

/* Debugging Page */
.error-item {
  background: var(--bg-light);
  padding: 24px;
  border-radius: var(--radius);
  margin-bottom: 20px;
  border-left: 3px solid #ef4444;
}

.error-item h3 {
  font-size: 1.1em;
  margin: 0 0 12px 0;
  color: #ef4444;
  font-family: 'Fira Code', monospace;
}

.error-item p {
  margin: 0 0 12px 0;
  color: var(--text-muted);
}

.error-item .code-block {
  margin-top: 12px;
  margin-bottom: 0;
}

/* Doc Table */
.doc-table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.doc-table th,
.doc-table td {
  padding: 12px 16px;
  text-align: left;
  border: 1px solid var(--border);
}

.doc-table th {
  background: var(--bg-light);
  font-weight: 600;
}

.doc-table td code {
  background: var(--code-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

/* Intro text */
.intro {
  font-size: 1.15em;
  color: var(--text-muted);
  margin-bottom: 32px;
}

/* ============================================
   HOMEPAGE NEW SECTIONS
   ============================================ */

/* Hero Brand (Logo + Title side by side) */
.hero-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}

.hero-logo-icon {
  font-size: 4em;
  animation: heroPulse 2s ease-in-out infinite;
  display: inline-block;
}

@keyframes heroPulse {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 0 transparent);
  }
  50% {
    transform: scale(1.15);
    filter: drop-shadow(0 0 25px rgba(99, 102, 241, 0.8));
  }
}

.hero-title {
  font-size: 3.5em;
  margin: 0;
  background: linear-gradient(135deg, #fff, var(--primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

[data-theme="light"] .hero-title {
  background: linear-gradient(135deg, var(--primary), #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Typing Effect */
.tagline {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2px;
  min-height: 2em;
}

.typing-text {
  display: inline;
}

.typing-cursor {
  display: inline-block;
  animation: blink 0.8s infinite;
  color: var(--primary);
  font-weight: bold;
}

.typing-cursor.typing-done {
  animation: none;
  opacity: 0;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Stats Section */
.stats-section {
  margin-top: 40px !important;
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.stat-card {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px 16px;
  text-align: center;
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: var(--primary);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15);
}

.stat-value {
  font-size: 2.5em;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.9em;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .stat-value {
    font-size: 2em;
  }
}

/* Quick Start Section */
.quick-start-section {
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

.section-desc {
  text-align: center;
  color: var(--text-muted);
  margin-bottom: 24px;
  font-size: 1.1em;
}

.quick-start-code {
  position: relative;
}

.quick-start-code .code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--border);
  border: none;
  border-radius: 6px;
  color: var(--text);
  cursor: pointer;
  font-size: 0.85em;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: var(--primary);
  color: white;
}

.copy-btn.copied {
  background: var(--success);
  color: white;
}

.copy-icon {
  font-size: 1.1em;
}

/* Why Pulse Section */
.why-pulse-section h2 {
  text-align: center;
  margin-bottom: 40px;
}

.why-pulse-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.why-card {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 32px 24px;
  text-align: center;
  transition: all 0.3s ease;
}

.why-card:hover {
  border-color: var(--primary);
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(99, 102, 241, 0.1);
}

.why-icon {
  font-size: 3em;
  margin-bottom: 16px;
}

.why-card h3 {
  font-size: 1.2em;
  margin-bottom: 12px;
  color: var(--text);
}

.why-card p {
  font-size: 0.95em;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 900px) {
  .why-pulse-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .why-pulse-grid {
    grid-template-columns: 1fr;
  }

  .hero-brand {
    flex-direction: column;
    gap: 8px;
  }

  .hero-logo-icon {
    font-size: 3.5em;
  }

  .hero-title {
    font-size: 2.2em;
  }
}

/* ============================================
   MIGRATION FROM REACT PAGE
   ============================================ */

.migration-page .intro {
  font-size: 1.2em;
  max-width: 800px;
}

/* Quick Comparison Grid */
.comparison-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin: 24px 0;
}

.comparison-box {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  transition: all 0.3s ease;
}

.comparison-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.comparison-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.framework-icon {
  font-size: 2em;
}

.comparison-header h3 {
  margin: 0;
  font-size: 1.3em;
}

.react-box {
  border-left: 3px solid #61dafb;
}

.pulse-box {
  border-left: 3px solid var(--primary);
}

.comparison-box ul {
  margin: 0;
  padding-left: 20px;
  color: var(--text-muted);
}

.comparison-box li {
  margin: 8px 0;
}

/* Code Comparison Side by Side */
.code-comparison {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin: 20px 0;
}

.code-comparison .code-block {
  margin: 0;
}

.code-comparison .code-header {
  font-weight: 600;
}

/* Migration Tips */
.migration-tip {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
  border: 1px solid var(--primary);
  border-radius: var(--radius);
  padding: 16px 20px;
  margin: 20px 0;
}

.migration-tip strong {
  color: var(--primary);
}

/* Cheat Sheet Table */
.cheat-sheet {
  overflow-x: auto;
  margin: 20px 0;
}

.cheat-sheet table {
  width: 100%;
  border-collapse: collapse;
}

.cheat-sheet th,
.cheat-sheet td {
  padding: 12px 16px;
  text-align: left;
  border: 1px solid var(--border);
}

.cheat-sheet th {
  background: var(--bg-light);
  font-weight: 600;
}

.cheat-sheet td code {
  background: var(--code-bg);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.85em;
}

.cheat-sheet tr:hover {
  background: var(--bg-light);
}

/* Migration Steps */
.migration-steps {
  margin: 24px 0;
}

.step {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.step:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.step-number {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--primary), #a855f7);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4em;
  font-weight: 700;
}

.step-content h3 {
  margin: 0 0 8px 0;
  font-size: 1.2em;
}

.step-content p {
  margin: 0;
  color: var(--text-muted);
}

.step-content .code-block {
  margin-top: 12px;
}

/* Gotchas */
.gotcha-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 20px 0;
}

.gotcha {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  border-left: 3px solid #ef4444;
}

.gotcha h3 {
  margin: 0 0 8px 0;
  font-size: 1.1em;
  color: #ef4444;
}

.gotcha p {
  margin: 0 0 12px 0;
  color: var(--text-muted);
}

.gotcha .code-block {
  margin: 12px 0 0 0;
}

/* Help Section */
.help-section {
  text-align: center;
  padding: 40px;
  background: var(--bg-light);
  border-radius: var(--radius);
  margin-top: 40px;
}

.help-links {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 24px;
}

.help-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  text-decoration: none;
  transition: all 0.2s ease;
}

.help-link:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.help-icon {
  font-size: 1.4em;
}

/* Next Section Buttons */
.next-section {
  display: flex;
  gap: 16px;
  margin-top: 40px;
  padding-top: 40px;
  border-top: 1px solid var(--border);
}

/* Responsive */
@media (max-width: 768px) {
  .comparison-grid,
  .code-comparison {
    grid-template-columns: 1fr;
  }

  .step {
    flex-direction: column;
    gap: 12px;
  }

  .step-number {
    width: 40px;
    height: 40px;
    font-size: 1.2em;
  }

  .help-links {
    flex-direction: column;
    align-items: center;
  }

  .next-section {
    flex-direction: column;
  }
}
`;

export function injectStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}
