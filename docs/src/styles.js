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
  padding: 16px 24px;
  background: var(--bg-light);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
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

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
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

.nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  padding: 8px 16px;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
}

.nav-link:hover {
  color: var(--text);
  background: var(--bg);
}

.nav-link.active {
  color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

.menu-btn {
  display: none;
  background: none;
  border: none;
  color: var(--text);
  font-size: 1.5em;
  cursor: pointer;
}

.theme-btn {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 1.2em;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 8px;
}

.theme-btn:hover {
  background: var(--border);
  transform: scale(1.05);
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

@media (max-width: 768px) {
  .nav { display: none; }
  .menu-btn { display: block; }
  .theme-btn { padding: 6px 10px; font-size: 1em; }
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

/* Comparison table */
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
`;

export function injectStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}
