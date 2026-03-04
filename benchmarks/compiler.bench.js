/**
 * Compiler Benchmarks - Pulse Framework
 *
 * Measures: tokenization, parsing, code generation, end-to-end compilation
 *
 * @module benchmarks/compiler
 */

import { tokenize } from '../compiler/lexer.js';
import { parse } from '../compiler/parser/index.js';
import { transform } from '../compiler/transformer/index.js';
import { compile } from '../compiler/index.js';
import { bench, suite } from './utils.js';

// Simple component (~20 lines)
const SIMPLE_SOURCE = `
@page Hello

state {
  name: "World"
}

view {
  .greeting {
    h1 "Hello, {name}!"
    button @click(name = "Pulse") {
      "Click me"
    }
  }
}

style {
  .greeting { padding: 20px; text-align: center; }
  h1 { color: #333; }
}
`;

// Complex component (~80 lines) with all block types
const COMPLEX_SOURCE = `
@page Dashboard

import Header from './Header.pulse'
import Sidebar from './Sidebar.pulse'

state {
  count: 0
  items: []
  filter: "all"
  loading: false
  theme: "light"
  searchQuery: ""
}

view {
  .dashboard#main {
    Header(theme={theme})
    .content {
      Sidebar(filter={filter})
      main.main-area {
        h1 "Dashboard"
        .stats {
          .stat-card {
            span.label "Total Items"
            span.value "{items.length}"
          }
          .stat-card {
            span.label "Counter"
            span.value "{count}"
          }
        }
        .controls {
          button.btn-primary @click(count++) { "Increment" }
          button.btn-secondary @click(count--) { "Decrement" }
          button.btn-danger @click(count = 0) { "Reset" }
          input[type=text][placeholder=Search] @input(searchQuery = event.target.value)
        }
        .filter-bar {
          button @click(filter = "all") { "All" }
          button @click(filter = "active") { "Active" }
          button @click(filter = "done") { "Done" }
        }
        ul.item-list {
          @for(item in items) {
            li.item {
              span "{item.name}"
              button @click(removeItem(item.id)) { "Remove" }
            }
          }
        }
        @if(loading) {
          .spinner "Loading..."
        }
        slot "actions"
      }
    }
  }
}

actions {
  addItem(name) {
    items = [...items, { id: Date.now(), name, done: false }]
  }
  removeItem(id) {
    items = items.filter(i => i.id !== id)
  }
  toggleTheme() {
    theme = theme === "light" ? "dark" : "light"
  }
}

style {
  .dashboard { display: flex; flex-direction: column; min-height: 100vh; }
  .content { display: flex; flex: 1; }
  .main-area { flex: 1; padding: 20px; }
  .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px; }
  .stat-card { background: #f5f5f5; padding: 16px; border-radius: 8px; }
  .controls { display: flex; gap: 8px; margin-bottom: 16px; }
  .btn-primary { background: #646cff; color: white; border: none; padding: 8px 16px; border-radius: 4px; }
  .btn-secondary { background: #888; color: white; border: none; padding: 8px 16px; border-radius: 4px; }
  .btn-danger { background: #ff4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; }
  .item-list { list-style: none; padding: 0; }
  .item { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee; }
  .spinner { text-align: center; padding: 40px; color: #888; }
}
`;

export async function runCompilerBenchmarks() {
  // Pre-parse ASTs for transform-only benchmarks
  const simpleAST = parse(SIMPLE_SOURCE);
  const complexAST = parse(COMPLEX_SOURCE);

  return await suite('Compiler', [
    // Tokenization
    bench('tokenize() simple component', () => {
      tokenize(SIMPLE_SOURCE);
    }),

    bench('tokenize() complex component', () => {
      tokenize(COMPLEX_SOURCE);
    }),

    // Parsing
    bench('parse() simple component', () => {
      parse(SIMPLE_SOURCE);
    }),

    bench('parse() complex component', () => {
      parse(COMPLEX_SOURCE);
    }),

    // Code generation
    bench('transform() simple AST', () => {
      transform(simpleAST);
    }),

    bench('transform() complex AST', () => {
      transform(complexAST);
    }),

    // Full pipeline
    bench('compile() end-to-end simple', () => {
      compile(SIMPLE_SOURCE);
    }),

    bench('compile() end-to-end complex', () => {
      compile(COMPLEX_SOURCE);
    }, { iterations: 50 })
  ]);
}
