/**
 * Pulse CLI - Docs Command
 * Generate API documentation from JSDoc comments
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname, basename, extname } from 'path';
import { log } from './logger.js';
import { parseArgs, formatBytes } from './utils/file-utils.js';
import { createTimer, formatDuration } from './utils/cli-ui.js';

/**
 * JSDoc tag types
 */
const JSDOC_TAGS = [
  'param', 'parameter', 'arg', 'argument',
  'returns', 'return',
  'type', 'typedef',
  'property', 'prop',
  'example',
  'throws', 'exception',
  'deprecated',
  'see', 'link',
  'since', 'version',
  'author',
  'module', 'namespace',
  'exports', 'export',
  'class', 'constructor',
  'function', 'func', 'method',
  'private', 'protected', 'public',
  'static',
  'async',
  'callback',
  'template',
  'default', 'defaultvalue'
];

/**
 * Parse JSDoc comment block
 * @param {string} comment - Raw JSDoc comment
 * @returns {Object} Parsed JSDoc data
 */
function parseJSDocComment(comment) {
  // Remove comment markers
  const lines = comment
    .replace(/^\/\*\*\s*/, '')
    .replace(/\s*\*\/$/, '')
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, ''));

  const result = {
    description: '',
    tags: []
  };

  let currentTag = null;
  let descriptionLines = [];

  for (const line of lines) {
    const tagMatch = line.match(/^@(\w+)\s*(.*)?$/);

    if (tagMatch) {
      // Save previous tag
      if (currentTag) {
        result.tags.push(currentTag);
      }

      // Start new tag
      const [, tagName, tagContent] = tagMatch;
      currentTag = {
        tag: tagName,
        content: tagContent || ''
      };

      // Parse specific tag formats
      if (['param', 'parameter', 'arg', 'argument'].includes(tagName)) {
        const paramMatch = tagContent?.match(/^\{([^}]+)\}\s*(\[?[\w.]+\]?)\s*-?\s*(.*)$/);
        if (paramMatch) {
          const [, type, name, desc] = paramMatch;
          const optional = name.startsWith('[') && name.endsWith(']');
          currentTag.type = type;
          currentTag.name = name.replace(/^\[|\]$/g, '').split('=')[0];
          currentTag.description = desc;
          currentTag.optional = optional;
          if (name.includes('=')) {
            currentTag.default = name.split('=')[1].replace(/\]$/, '');
          }
        }
      } else if (['returns', 'return'].includes(tagName)) {
        const returnMatch = tagContent?.match(/^\{([^}]+)\}\s*(.*)$/);
        if (returnMatch) {
          const [, type, desc] = returnMatch;
          currentTag.type = type;
          currentTag.description = desc;
        }
      } else if (['type', 'typedef'].includes(tagName)) {
        const typeMatch = tagContent?.match(/^\{([^}]+)\}\s*(.*)$/);
        if (typeMatch) {
          currentTag.type = typeMatch[1];
          currentTag.name = typeMatch[2];
        }
      } else if (['property', 'prop'].includes(tagName)) {
        const propMatch = tagContent?.match(/^\{([^}]+)\}\s*([\w.]+)\s*-?\s*(.*)$/);
        if (propMatch) {
          const [, type, name, desc] = propMatch;
          currentTag.type = type;
          currentTag.name = name;
          currentTag.description = desc;
        }
      }
    } else if (currentTag) {
      // Continue current tag
      currentTag.content += '\n' + line;
      if (currentTag.description !== undefined) {
        currentTag.description += '\n' + line;
      }
    } else {
      // Description line
      descriptionLines.push(line);
    }
  }

  // Save last tag
  if (currentTag) {
    result.tags.push(currentTag);
  }

  // Clean up description
  result.description = descriptionLines.join('\n').trim();

  return result;
}

/**
 * Extract JSDoc comments from source code
 * @param {string} source - Source code
 * @returns {Array} Array of JSDoc entries
 */
function extractJSDocEntries(source) {
  const entries = [];
  const jsdocRegex = /\/\*\*[\s\S]*?\*\/\s*(?:export\s+)?(?:(async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=|class\s+(\w+)|(\w+)\s*[:(])/g;

  let match;
  while ((match = jsdocRegex.exec(source)) !== null) {
    const fullMatch = match[0];
    const commentEnd = fullMatch.indexOf('*/') + 2;
    const comment = fullMatch.slice(0, commentEnd);
    const afterComment = fullMatch.slice(commentEnd).trim();

    // Determine the name and type of the documented item
    let name = match[2] || match[3] || match[4] || match[5];
    let kind = 'unknown';

    if (match[2]) {
      kind = match[1] ? 'async function' : 'function';
    } else if (match[4]) {
      kind = 'class';
    } else if (match[3]) {
      // Check what's assigned
      if (afterComment.includes('function') || afterComment.includes('=>')) {
        kind = 'function';
      } else if (afterComment.includes('class')) {
        kind = 'class';
      } else {
        kind = 'const';
      }
    }

    const parsed = parseJSDocComment(comment);

    entries.push({
      name,
      kind,
      ...parsed,
      line: source.slice(0, match.index).split('\n').length
    });
  }

  return entries;
}

/**
 * Process a JavaScript/TypeScript file
 * @param {string} filePath - Path to file
 * @returns {Object} Processed file data
 */
function processFile(filePath) {
  const source = readFileSync(filePath, 'utf-8');
  const entries = extractJSDocEntries(source);

  // Find module-level JSDoc
  const moduleDocMatch = source.match(/^\/\*\*[\s\S]*?\*\/\s*\n(?!\s*(export|function|class|const|let|var))/);
  let moduleDoc = null;

  if (moduleDocMatch) {
    moduleDoc = parseJSDocComment(moduleDocMatch[0]);
  }

  return {
    path: filePath,
    name: basename(filePath, extname(filePath)),
    moduleDoc,
    entries
  };
}

/**
 * Find JavaScript files in directory
 * @param {string} dir - Directory to search
 * @param {Object} options - Search options
 * @returns {string[]} Array of file paths
 */
function findJsFiles(dir, options = {}) {
  const { extensions = ['.js', '.mjs', '.ts'], exclude = ['node_modules', '.git', 'dist', 'coverage'] } = options;
  const files = [];

  function walk(currentDir) {
    try {
      const entries = readdirSync(currentDir);
      for (const entry of entries) {
        if (exclude.includes(entry) || entry.startsWith('.')) continue;

        const fullPath = join(currentDir, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (extensions.some(ext => entry.endsWith(ext))) {
            files.push(fullPath);
          }
        } catch (e) {
          // Skip inaccessible files
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }
  }

  walk(dir);
  return files;
}

/**
 * Generate Markdown documentation
 * @param {Object} fileData - Processed file data
 * @param {Object} options - Generation options
 * @returns {string} Markdown content
 */
function generateMarkdown(fileData, options = {}) {
  const { includeSource = false } = options;
  let md = '';

  // Module header
  md += `# ${fileData.name}\n\n`;

  if (fileData.moduleDoc) {
    md += `${fileData.moduleDoc.description}\n\n`;
  }

  md += `**File:** \`${relative(process.cwd(), fileData.path)}\`\n\n`;

  // Table of contents
  if (fileData.entries.length > 0) {
    md += `## Table of Contents\n\n`;
    for (const entry of fileData.entries) {
      const anchor = entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      md += `- [${entry.name}](#${anchor})\n`;
    }
    md += '\n---\n\n';
  }

  // Document each entry
  for (const entry of fileData.entries) {
    md += `## ${entry.name}\n\n`;

    // Kind badge
    const kindBadge = `\`${entry.kind}\``;
    md += `${kindBadge}\n\n`;

    // Description
    if (entry.description) {
      md += `${entry.description}\n\n`;
    }

    // Parameters
    const params = entry.tags.filter(t => ['param', 'parameter', 'arg', 'argument'].includes(t.tag));
    if (params.length > 0) {
      md += `### Parameters\n\n`;
      md += `| Name | Type | Description |\n`;
      md += `|------|------|-------------|\n`;
      for (const param of params) {
        const optional = param.optional ? ' (optional)' : '';
        const defaultVal = param.default ? ` = \`${param.default}\`` : '';
        md += `| \`${param.name}\`${optional}${defaultVal} | \`${param.type || 'any'}\` | ${(param.description || '').replace(/\n/g, ' ')} |\n`;
      }
      md += '\n';
    }

    // Returns
    const returns = entry.tags.find(t => ['returns', 'return'].includes(t.tag));
    if (returns) {
      md += `### Returns\n\n`;
      md += `\`${returns.type || 'void'}\``;
      if (returns.description) {
        md += ` - ${returns.description.replace(/\n/g, ' ')}`;
      }
      md += '\n\n';
    }

    // Throws
    const throws = entry.tags.filter(t => ['throws', 'exception'].includes(t.tag));
    if (throws.length > 0) {
      md += `### Throws\n\n`;
      for (const t of throws) {
        md += `- ${t.content}\n`;
      }
      md += '\n';
    }

    // Examples
    const examples = entry.tags.filter(t => t.tag === 'example');
    if (examples.length > 0) {
      md += `### Example${examples.length > 1 ? 's' : ''}\n\n`;
      for (const example of examples) {
        md += `\`\`\`javascript\n${example.content.trim()}\n\`\`\`\n\n`;
      }
    }

    // Deprecated
    const deprecated = entry.tags.find(t => t.tag === 'deprecated');
    if (deprecated) {
      md += `> **Deprecated:** ${deprecated.content || 'This is deprecated.'}\n\n`;
    }

    // See also
    const seeAlso = entry.tags.filter(t => ['see', 'link'].includes(t.tag));
    if (seeAlso.length > 0) {
      md += `### See Also\n\n`;
      for (const see of seeAlso) {
        md += `- ${see.content}\n`;
      }
      md += '\n';
    }

    md += '---\n\n';
  }

  return md;
}

/**
 * Generate JSON documentation
 * @param {Object[]} filesData - Array of processed file data
 * @returns {Object} JSON documentation
 */
function generateJson(filesData) {
  return {
    generated: new Date().toISOString(),
    version: '1.0.0',
    modules: filesData.map(f => ({
      name: f.name,
      path: relative(process.cwd(), f.path),
      description: f.moduleDoc?.description || null,
      exports: f.entries.map(e => ({
        name: e.name,
        kind: e.kind,
        description: e.description,
        line: e.line,
        params: e.tags
          .filter(t => ['param', 'parameter'].includes(t.tag))
          .map(p => ({
            name: p.name,
            type: p.type,
            description: p.description,
            optional: p.optional || false,
            default: p.default || null
          })),
        returns: (() => {
          const ret = e.tags.find(t => ['returns', 'return'].includes(t.tag));
          return ret ? { type: ret.type, description: ret.description } : null;
        })(),
        examples: e.tags
          .filter(t => t.tag === 'example')
          .map(t => t.content.trim()),
        deprecated: e.tags.find(t => t.tag === 'deprecated')?.content || null,
        since: e.tags.find(t => t.tag === 'since')?.content || null
      }))
    }))
  };
}

/**
 * Generate HTML documentation
 * @param {Object[]} filesData - Array of processed file data
 * @param {Object} options - Generation options
 * @returns {string} HTML content
 */
function generateHtml(filesData, options = {}) {
  const { title = 'API Documentation' } = options;

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #1a1a1a;
      --code-bg: #f5f5f5;
      --border: #e0e0e0;
      --accent: #646cff;
      --link: #646cff;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1a1a1a;
        --text: #ffffff;
        --code-bg: #2d2d2d;
        --border: #404040;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; color: var(--accent); }
    h2 { font-size: 1.8rem; margin: 2rem 0 1rem; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; }
    h3 { font-size: 1.3rem; margin: 1.5rem 0 0.5rem; }
    h4 { font-size: 1.1rem; margin: 1rem 0 0.5rem; color: var(--accent); }
    p { margin: 0.5rem 0; }
    code { background: var(--code-bg); padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; }
    pre { background: var(--code-bg); padding: 1rem; border-radius: 8px; overflow-x: auto; margin: 1rem 0; }
    pre code { padding: 0; background: none; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border); }
    th { background: var(--code-bg); font-weight: 600; }
    .badge { display: inline-block; padding: 0.2em 0.6em; border-radius: 4px; background: var(--accent); color: white; font-size: 0.8em; margin-left: 0.5rem; }
    .deprecated { background: #dc3545; }
    .nav { position: fixed; left: 0; top: 0; width: 250px; height: 100vh; background: var(--code-bg); padding: 1rem; overflow-y: auto; border-right: 1px solid var(--border); }
    .nav h3 { margin-bottom: 0.5rem; }
    .nav ul { list-style: none; }
    .nav li { margin: 0.25rem 0; }
    .nav a { color: var(--link); text-decoration: none; }
    .nav a:hover { text-decoration: underline; }
    .main { margin-left: 270px; }
    @media (max-width: 768px) { .nav { display: none; } .main { margin-left: 0; } }
    .entry { margin-bottom: 3rem; }
  </style>
</head>
<body>
  <nav class="nav">
    <h3>Modules</h3>
    <ul>
`;

  // Navigation
  for (const file of filesData) {
    html += `      <li><strong>${file.name}</strong>\n        <ul>\n`;
    for (const entry of file.entries) {
      const anchor = `${file.name}-${entry.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      html += `          <li><a href="#${anchor}">${entry.name}</a></li>\n`;
    }
    html += `        </ul>\n      </li>\n`;
  }

  html += `    </ul>
  </nav>
  <main class="main">
    <div class="container">
      <h1>${title}</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
`;

  // Content
  for (const file of filesData) {
    html += `      <section>
        <h2 id="${file.name.toLowerCase()}">${file.name}</h2>
        <p><code>${relative(process.cwd(), file.path)}</code></p>
`;

    if (file.moduleDoc?.description) {
      html += `        <p>${escapeHtml(file.moduleDoc.description)}</p>\n`;
    }

    for (const entry of file.entries) {
      const anchor = `${file.name}-${entry.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const deprecated = entry.tags.find(t => t.tag === 'deprecated');

      html += `        <div class="entry" id="${anchor}">
          <h3>${entry.name}<span class="badge">${entry.kind}</span>${deprecated ? '<span class="badge deprecated">deprecated</span>' : ''}</h3>
`;

      if (entry.description) {
        html += `          <p>${escapeHtml(entry.description)}</p>\n`;
      }

      // Parameters
      const params = entry.tags.filter(t => ['param', 'parameter'].includes(t.tag));
      if (params.length > 0) {
        html += `          <h4>Parameters</h4>
          <table>
            <tr><th>Name</th><th>Type</th><th>Description</th></tr>
`;
        for (const p of params) {
          const opt = p.optional ? ' (optional)' : '';
          const def = p.default ? ` = <code>${escapeHtml(p.default)}</code>` : '';
          html += `            <tr><td><code>${p.name}</code>${opt}${def}</td><td><code>${escapeHtml(p.type || 'any')}</code></td><td>${escapeHtml(p.description || '')}</td></tr>\n`;
        }
        html += `          </table>\n`;
      }

      // Returns
      const returns = entry.tags.find(t => ['returns', 'return'].includes(t.tag));
      if (returns) {
        html += `          <h4>Returns</h4>
          <p><code>${escapeHtml(returns.type || 'void')}</code>${returns.description ? ` - ${escapeHtml(returns.description)}` : ''}</p>\n`;
      }

      // Examples
      const examples = entry.tags.filter(t => t.tag === 'example');
      if (examples.length > 0) {
        html += `          <h4>Example${examples.length > 1 ? 's' : ''}</h4>\n`;
        for (const ex of examples) {
          html += `          <pre><code>${escapeHtml(ex.content.trim())}</code></pre>\n`;
        }
      }

      html += `        </div>\n`;
    }

    html += `      </section>\n`;
  }

  html += `    </div>
  </main>
</body>
</html>`;

  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Main docs command handler
 */
export async function runDocs(args) {
  const { options, patterns } = parseArgs(args);

  const generate = options.generate || options.g || false;
  const format = options.format || options.f || 'markdown';
  const output = options.output || options.o || 'docs/api';
  const title = options.title || 'API Documentation';
  const verbose = options.verbose || options.v || false;

  // If not generating, show help
  if (!generate) {
    showDocsHelp();
    return;
  }

  const timer = createTimer();

  // Find source files
  const inputPaths = patterns.length > 0 ? patterns : ['src', 'runtime'];
  const allFiles = [];

  for (const inputPath of inputPaths) {
    const fullPath = join(process.cwd(), inputPath);
    if (!existsSync(fullPath)) {
      log.warn(`Path not found: ${inputPath}`);
      continue;
    }

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      allFiles.push(...findJsFiles(fullPath));
    } else if (stat.isFile()) {
      allFiles.push(fullPath);
    }
  }

  if (allFiles.length === 0) {
    log.error('No JavaScript files found to document.');
    return;
  }

  log.info(`Processing ${allFiles.length} file(s)...\n`);

  // Process files
  const filesData = [];
  let totalEntries = 0;

  for (const file of allFiles) {
    const data = processFile(file);
    if (data.entries.length > 0) {
      filesData.push(data);
      totalEntries += data.entries.length;

      if (verbose) {
        log.info(`  ${relative(process.cwd(), file)}: ${data.entries.length} entries`);
      }
    }
  }

  if (filesData.length === 0) {
    log.warn('No documented exports found.');
    return;
  }

  // Create output directory
  const outputPath = join(process.cwd(), output);
  if (!existsSync(outputPath)) {
    mkdirSync(outputPath, { recursive: true });
  }

  // Generate documentation
  if (format === 'json') {
    const json = generateJson(filesData);
    const jsonPath = join(outputPath, 'api.json');
    writeFileSync(jsonPath, JSON.stringify(json, null, 2));
    log.success(`Generated: ${relative(process.cwd(), jsonPath)}`);
  } else if (format === 'html') {
    const html = generateHtml(filesData, { title });
    const htmlPath = join(outputPath, 'index.html');
    writeFileSync(htmlPath, html);
    log.success(`Generated: ${relative(process.cwd(), htmlPath)}`);
  } else {
    // Default: Markdown (one file per module)
    for (const fileData of filesData) {
      const md = generateMarkdown(fileData, options);
      const mdPath = join(outputPath, `${fileData.name}.md`);
      writeFileSync(mdPath, md);
      log.success(`Generated: ${relative(process.cwd(), mdPath)}`);
    }

    // Generate index
    let indexMd = `# API Documentation\n\n`;
    indexMd += `Generated: ${new Date().toLocaleString()}\n\n`;
    indexMd += `## Modules\n\n`;

    for (const fileData of filesData) {
      indexMd += `- [${fileData.name}](./${fileData.name}.md)`;
      if (fileData.moduleDoc?.description) {
        const shortDesc = fileData.moduleDoc.description.split('\n')[0].slice(0, 80);
        indexMd += ` - ${shortDesc}`;
      }
      indexMd += '\n';
    }

    writeFileSync(join(outputPath, 'README.md'), indexMd);
  }

  const elapsed = formatDuration(timer.elapsed());
  log.info(`\nDocumented ${totalEntries} exports from ${filesData.length} module(s) in ${elapsed}`);
}

/**
 * Show docs help
 */
function showDocsHelp() {
  log.info(`
Pulse Docs - Generate API documentation from JSDoc

Usage: pulse docs --generate [paths...] [options]

Options:
  --generate, -g     Generate documentation (required)
  --format, -f       Output format: markdown, json, html (default: markdown)
  --output, -o       Output directory (default: docs/api)
  --title            Documentation title (for HTML)
  --verbose, -v      Show detailed output

Examples:
  pulse docs --generate                  # Document src/ and runtime/
  pulse docs --generate src/             # Document specific directory
  pulse docs --generate --format html    # Generate HTML docs
  pulse docs --generate --format json    # Generate JSON docs
  pulse docs -g -f html -o docs/         # HTML docs to docs/

Output:
  markdown   -> One .md file per module + README.md index
  html       -> Single index.html with navigation
  json       -> Single api.json with structured data

JSDoc Tags Supported:
  @param {type} name - description
  @returns {type} description
  @example
  @throws {Error}
  @deprecated
  @see reference
  @since version
  `);
}
