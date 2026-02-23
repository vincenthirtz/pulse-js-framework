/**
 * Server Components Core Tests
 *
 * Comprehensive tests for PSC Wire Format types, serialization,
 * reconstruction, lazy loading, and hydration.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  // Types
  PSCNodeType,
  PSC_VERSION,
  isPSCElement,
  isPSCText,
  isPSCClientBoundary,
  isPSCFragment,
  isPSCComment,
  validatePSCPayload,
  validatePSCNode,
  // Serialization
  serializeNode,
  serializeToPSC,
  isClientBoundary,
  markClientBoundary,
  // Reconstruction
  reconstructNode,
  reconstructPSCTree,
  loadClientComponent,
  clearComponentCache,
  getComponentCacheStats,
  // Server
  renderServerComponent,
  executeAsyncComponent,
  markClientBoundaries,
  componentRegistry
} from '../runtime/server-components/index.js';

import {
  MockDOMAdapter,
  MockElement,
  MockTextNode,
  MockCommentNode,
  setAdapter,
  resetAdapter
} from '../runtime/dom-adapter.js';

// ============================================================================
// Test Setup
// ============================================================================

let adapter;

beforeEach(() => {
  adapter = new MockDOMAdapter();
  setAdapter(adapter);
  clearComponentCache();
  componentRegistry.clear();
});

afterEach(() => {
  resetAdapter();
});

// ============================================================================
// Type Definitions & Validation Tests
// ============================================================================

describe('PSC Types', () => {
  test('PSCNodeType constants', () => {
    assert.strictEqual(PSCNodeType.ELEMENT, 'element');
    assert.strictEqual(PSCNodeType.TEXT, 'text');
    assert.strictEqual(PSCNodeType.CLIENT, 'client');
    assert.strictEqual(PSCNodeType.FRAGMENT, 'fragment');
    assert.strictEqual(PSCNodeType.COMMENT, 'comment');
  });

  test('PSC_VERSION is defined', () => {
    assert.ok(PSC_VERSION);
    assert.strictEqual(typeof PSC_VERSION, 'string');
  });

  test('isPSCElement type guard', () => {
    const element = { type: 'element', tag: 'div', props: {}, children: [] };
    const text = { type: 'text', value: 'Hello' };

    assert.strictEqual(isPSCElement(element), true);
    assert.strictEqual(isPSCElement(text), false);
  });

  test('isPSCText type guard', () => {
    const text = { type: 'text', value: 'Hello' };
    const element = { type: 'element', tag: 'div', props: {}, children: [] };

    assert.strictEqual(isPSCText(text), true);
    assert.strictEqual(isPSCText(element), false);
  });

  test('isPSCClientBoundary type guard', () => {
    const client = { type: 'client', id: 'Button', props: {} };
    const element = { type: 'element', tag: 'div', props: {}, children: [] };

    assert.strictEqual(isPSCClientBoundary(client), true);
    assert.strictEqual(isPSCClientBoundary(element), false);
  });

  test('isPSCFragment type guard', () => {
    const fragment = { type: 'fragment', children: [] };
    const element = { type: 'element', tag: 'div', props: {}, children: [] };

    assert.strictEqual(isPSCFragment(fragment), true);
    assert.strictEqual(isPSCFragment(element), false);
  });

  test('isPSCComment type guard', () => {
    const comment = { type: 'comment', value: 'test' };
    const element = { type: 'element', tag: 'div', props: {}, children: [] };

    assert.strictEqual(isPSCComment(comment), true);
    assert.strictEqual(isPSCComment(element), false);
  });
});

describe('PSC Validation', () => {
  test('validatePSCPayload succeeds for valid payload', () => {
    const payload = {
      version: '1.0',
      root: {
        type: 'element',
        tag: 'div',
        props: {},
        children: []
      },
      clientManifest: {}
    };

    assert.doesNotThrow(() => validatePSCPayload(payload));
  });

  test('validatePSCPayload fails for missing version', () => {
    const payload = {
      root: { type: 'element', tag: 'div', props: {}, children: [] },
      clientManifest: {}
    };

    assert.throws(() => validatePSCPayload(payload), /version/);
  });

  test('validatePSCPayload fails for missing root', () => {
    const payload = {
      version: '1.0',
      clientManifest: {}
    };

    assert.throws(() => validatePSCPayload(payload), /root/);
  });

  test('validatePSCPayload fails for missing clientManifest', () => {
    const payload = {
      version: '1.0',
      root: { type: 'element', tag: 'div', props: {}, children: [] }
    };

    assert.throws(() => validatePSCPayload(payload), /clientManifest/);
  });

  test('validatePSCNode succeeds for valid element', () => {
    const node = {
      type: 'element',
      tag: 'div',
      props: { class: 'container' },
      children: [
        { type: 'text', value: 'Hello' }
      ]
    };

    assert.doesNotThrow(() => validatePSCNode(node));
  });

  test('validatePSCNode fails for missing type', () => {
    const node = { tag: 'div', props: {}, children: [] };
    assert.throws(() => validatePSCNode(node), /type/);
  });

  test('validatePSCNode fails for invalid element (missing tag)', () => {
    const node = { type: 'element', props: {}, children: [] };
    assert.throws(() => validatePSCNode(node), /tag/);
  });

  test('validatePSCNode fails for tree too deep', () => {
    // Create a deeply nested tree
    let node = { type: 'text', value: 'deep' };
    for (let i = 0; i < 105; i++) {
      node = { type: 'element', tag: 'div', props: {}, children: [node] };
    }

    assert.throws(() => validatePSCNode(node), /too deep/);
  });
});

// ============================================================================
// Serialization Tests
// ============================================================================

describe('Serialization - Server Elements', () => {
  test('serialize simple element', () => {
    const div = adapter.createElement('div');
    adapter.setAttribute(div, 'class', 'container');

    const psc = serializeNode(div);

    assert.strictEqual(psc.type, PSCNodeType.ELEMENT);
    assert.strictEqual(psc.tag, 'div');
    assert.strictEqual(psc.props.class, 'container');
    assert.ok(Array.isArray(psc.children));
  });

  test('serialize element with children', () => {
    const div = adapter.createElement('div');
    const p = adapter.createElement('p');
    const text = adapter.createTextNode('Hello');
    adapter.appendChild(p, text);
    adapter.appendChild(div, p);

    const psc = serializeNode(div);

    assert.strictEqual(psc.type, PSCNodeType.ELEMENT);
    assert.strictEqual(psc.children.length, 1);
    assert.strictEqual(psc.children[0].type, PSCNodeType.ELEMENT);
    assert.strictEqual(psc.children[0].tag, 'p');
    assert.strictEqual(psc.children[0].children[0].type, PSCNodeType.TEXT);
    assert.strictEqual(psc.children[0].children[0].value, 'Hello');
  });

  test('serialize text node', () => {
    const text = adapter.createTextNode('Hello, world!');
    const psc = serializeNode(text);

    assert.strictEqual(psc.type, PSCNodeType.TEXT);
    assert.strictEqual(psc.value, 'Hello, world!');
  });

  test('serialize comment node', () => {
    const comment = adapter.createComment('TODO: fix this');
    const psc = serializeNode(comment, { includeComments: true });

    assert.strictEqual(psc.type, PSCNodeType.COMMENT);
    assert.strictEqual(psc.value, 'TODO: fix this');
  });

  test('skip empty text nodes', () => {
    const text = adapter.createTextNode('   \n\t  ');
    const psc = serializeNode(text);

    assert.strictEqual(psc, null);
  });

  test('serialize element with multiple attributes', () => {
    const button = adapter.createElement('button');
    adapter.setAttribute(button, 'type', 'submit');
    adapter.setAttribute(button, 'class', 'btn btn-primary');
    adapter.setAttribute(button, 'disabled', 'true');

    const psc = serializeNode(button);

    assert.strictEqual(psc.props.type, 'submit');
    assert.strictEqual(psc.props.class, 'btn btn-primary');
    assert.strictEqual(psc.props.disabled, 'true');
  });
});

describe('Serialization - Client Component Boundaries', () => {
  test('detect client boundary', () => {
    const button = adapter.createElement('button');
    markClientBoundary(button, 'ClientButton', { text: 'Click me' });

    assert.strictEqual(isClientBoundary(button), true);
  });

  test('serialize client boundary', () => {
    const button = adapter.createElement('button');
    markClientBoundary(button, 'ClientButton', { text: 'Click me', count: 5 });

    const psc = serializeNode(button, {
      clientComponents: new Set(['ClientButton'])
    });

    assert.strictEqual(psc.type, PSCNodeType.CLIENT);
    assert.strictEqual(psc.id, 'ClientButton');
    assert.strictEqual(psc.props.text, 'Click me');
    assert.strictEqual(psc.props.count, 5);
  });

  test('serialize client boundary with fallback', () => {
    const button = adapter.createElement('button');
    const fallbackText = adapter.createTextNode('Loading...');
    adapter.appendChild(button, fallbackText);
    markClientBoundary(button, 'ClientButton', {});

    const psc = serializeNode(button);

    assert.strictEqual(psc.type, PSCNodeType.CLIENT);
    assert.ok(psc.fallback);
    assert.strictEqual(psc.fallback.type, PSCNodeType.FRAGMENT);
    assert.strictEqual(psc.fallback.children[0].value, 'Loading...');
  });

  test('reject function props', () => {
    const button = adapter.createElement('button');

    assert.throws(() => {
      markClientBoundary(button, 'ClientButton', { onClick: () => { } });
    }, /function prop/i);
  });

  test('reject class instance props', () => {
    class MyClass {
      method() { }
    }
    const instance = new MyClass();

    const button = adapter.createElement('button');

    assert.throws(() => {
      markClientBoundary(button, 'ClientButton', { instance });
    }, /class instance/i);
  });

  test('reject circular props', () => {
    const obj = { name: 'test' };
    obj.self = obj; // Circular reference

    const button = adapter.createElement('button');

    assert.throws(() => {
      markClientBoundary(button, 'ClientButton', { data: obj });
    }, /circular/i);
  });
});

describe('serializeToPSC - Full Tree', () => {
  test('serialize complete tree to PSC payload', () => {
    const root = adapter.createElement('div');
    const h1 = adapter.createElement('h1');
    const text = adapter.createTextNode('Hello');
    adapter.appendChild(h1, text);
    adapter.appendChild(root, h1);

    const payload = serializeToPSC(root, {
      clientManifest: {}
    });

    assert.strictEqual(payload.version, PSC_VERSION);
    assert.ok(payload.root);
    assert.strictEqual(payload.root.type, PSCNodeType.ELEMENT);
    assert.ok(payload.clientManifest);
  });

  test('include state in payload', () => {
    const root = adapter.createElement('div');

    const payload = serializeToPSC(root, {
      clientManifest: {},
      state: { user: { id: 1, name: 'Alice' } }
    });

    assert.ok(payload.state);
    assert.strictEqual(payload.state.user.name, 'Alice');
  });

  test('include client manifest', () => {
    const manifest = {
      Button: {
        id: 'Button',
        chunk: '/assets/Button.js',
        exports: ['default']
      }
    };

    const root = adapter.createElement('div');
    const payload = serializeToPSC(root, { clientManifest: manifest });

    assert.strictEqual(payload.clientManifest.Button.chunk, '/assets/Button.js');
  });
});

// ============================================================================
// Reconstruction Tests
// ============================================================================

describe('Reconstruction - PSC to DOM', () => {
  test('reconstruct simple element', async () => {
    const pscElement = {
      type: 'element',
      tag: 'div',
      props: { class: 'container', 'data-id': '123' },
      children: []
    };

    const domNode = await reconstructNode(pscElement);

    assert.strictEqual(domNode.tagName.toLowerCase(), 'div');
    assert.strictEqual(domNode.getAttribute('class'), 'container');
    assert.strictEqual(domNode.getAttribute('data-id'), '123');
  });

  test('reconstruct element with children', async () => {
    const pscElement = {
      type: 'element',
      tag: 'div',
      props: {},
      children: [
        {
          type: 'element',
          tag: 'h1',
          props: {},
          children: [
            { type: 'text', value: 'Hello' }
          ]
        }
      ]
    };

    const domNode = await reconstructNode(pscElement);

    assert.strictEqual(domNode.childNodes.length, 1);
    assert.strictEqual(domNode.childNodes[0].tagName.toLowerCase(), 'h1');
    assert.strictEqual(domNode.childNodes[0].childNodes[0].textContent, 'Hello');
  });

  test('reconstruct text node', async () => {
    const pscText = { type: 'text', value: 'Hello, world!' };
    const domNode = await reconstructNode(pscText);

    assert.strictEqual(domNode.nodeType, 3); // TEXT_NODE
    assert.strictEqual(domNode.textContent, 'Hello, world!');
  });

  test('reconstruct comment node', async () => {
    const pscComment = { type: 'comment', value: 'test comment' };
    const domNode = await reconstructNode(pscComment);

    assert.strictEqual(domNode.nodeType, 8); // COMMENT_NODE
    assert.strictEqual(domNode.textContent || domNode.data, 'test comment');
  });

  test('reconstruct fragment', async () => {
    const pscFragment = {
      type: 'fragment',
      children: [
        { type: 'text', value: 'First' },
        { type: 'text', value: 'Second' }
      ]
    };

    const domNodes = await reconstructNode(pscFragment);

    assert.ok(Array.isArray(domNodes));
    assert.strictEqual(domNodes.length, 2);
    assert.strictEqual(domNodes[0].textContent, 'First');
    assert.strictEqual(domNodes[1].textContent, 'Second');
  });
});

describe('Reconstruction - Client Components', () => {
  test('reconstruct client boundary with pre-loaded component', async () => {
    const ButtonComponent = (props) => {
      const button = adapter.createElement('button');
      const text = adapter.createTextNode(props.text);
      adapter.appendChild(button, text);
      return button;
    };

    const pscBoundary = {
      type: 'client',
      id: 'Button',
      props: { text: 'Click me' }
    };

    const domNode = await reconstructNode(pscBoundary, {
      clientComponents: { Button: ButtonComponent }
    });

    assert.strictEqual(domNode.tagName.toLowerCase(), 'button');
    assert.strictEqual(domNode.childNodes[0].textContent, 'Click me');
  });

  test('reconstruct client boundary with fallback on error', async () => {
    const pscBoundary = {
      type: 'client',
      id: 'NonExistentComponent',
      props: {},
      fallback: {
        type: 'element',
        tag: 'div',
        props: { class: 'fallback' },
        children: [
          { type: 'text', value: 'Fallback UI' }
        ]
      }
    };

    const domNode = await reconstructNode(pscBoundary, {
      clientManifest: {} // Empty manifest, will fail
    });

    // Should render fallback
    assert.strictEqual(domNode.tagName.toLowerCase(), 'div');
    assert.strictEqual(domNode.getAttribute('class'), 'fallback');
  });

  test('render error placeholder when no fallback', async () => {
    const pscBoundary = {
      type: 'client',
      id: 'MissingComponent',
      props: {}
    };

    const domNode = await reconstructNode(pscBoundary, {
      clientManifest: {}
    });

    // Should render error placeholder
    assert.strictEqual(domNode.tagName.toLowerCase(), 'div');
    assert.strictEqual(domNode.getAttribute('class'), 'pulse-client-error');
  });
});

describe('reconstructPSCTree - Full Payload', () => {
  test('reconstruct complete PSC payload', async () => {
    const payload = {
      version: '1.0',
      root: {
        type: 'element',
        tag: 'div',
        props: { class: 'app' },
        children: [
          {
            type: 'element',
            tag: 'h1',
            props: {},
            children: [
              { type: 'text', value: 'App Title' }
            ]
          }
        ]
      },
      clientManifest: {}
    };

    const domTree = await reconstructPSCTree(payload);

    assert.strictEqual(domTree.tagName.toLowerCase(), 'div');
    assert.strictEqual(domTree.getAttribute('class'), 'app');
    assert.strictEqual(domTree.childNodes.length, 1);
    assert.strictEqual(domTree.childNodes[0].tagName.toLowerCase(), 'h1');
  });

  test('fail for invalid payload', async () => {
    const invalidPayload = { version: '1.0' }; // Missing root

    await assert.rejects(
      async () => await reconstructPSCTree(invalidPayload),
      /Invalid PSC payload/
    );
  });
});

// ============================================================================
// Component Loading & Caching Tests
// ============================================================================

describe('Client Component Loading', () => {
  test('cache statistics initially empty', () => {
    const stats = getComponentCacheStats();
    assert.strictEqual(stats.loaded, 0);
    assert.strictEqual(stats.loading, 0);
    assert.ok(Array.isArray(stats.components));
  });

  test('clear component cache', () => {
    clearComponentCache();
    const stats = getComponentCacheStats();
    assert.strictEqual(stats.loaded, 0);
  });
});

// ============================================================================
// Server-Side Rendering Tests
// ============================================================================

describe('Server Component Rendering', () => {
  test('render sync component', async () => {
    const SimpleComponent = () => {
      const div = adapter.createElement('div');
      const text = adapter.createTextNode('Simple');
      adapter.appendChild(div, text);
      return div;
    };

    const node = await renderServerComponent(SimpleComponent);

    assert.strictEqual(node.tagName.toLowerCase(), 'div');
    assert.strictEqual(node.childNodes[0].textContent, 'Simple');
  });

  test('render async component', async () => {
    const AsyncComponent = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      const div = adapter.createElement('div');
      const text = adapter.createTextNode('Async Result');
      adapter.appendChild(div, text);
      return div;
    };

    const node = await renderServerComponent(AsyncComponent);

    assert.strictEqual(node.childNodes[0].textContent, 'Async Result');
  });

  test('async component timeout', async () => {
    const SlowComponent = async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return adapter.createElement('div');
    };

    await assert.rejects(
      async () => await renderServerComponent(SlowComponent, {}, { timeout: 50 }),
      /timed out/i
    );
  });

  test('execute async component', async () => {
    const component = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'result';
    };

    const result = await executeAsyncComponent(component, {}, 1000);
    assert.strictEqual(result, 'result');
  });

  test('execute sync component', async () => {
    const component = () => 'immediate';
    const result = await executeAsyncComponent(component, {}, 1000);
    assert.strictEqual(result, 'immediate');
  });
});

describe('Component Registry', () => {
  test('register and get server component', () => {
    const MyComponent = () => adapter.createElement('div');
    componentRegistry.registerServer('MyComponent', MyComponent);

    const retrieved = componentRegistry.get('MyComponent');
    assert.strictEqual(retrieved, MyComponent);
  });

  test('register client component', () => {
    const Button = () => adapter.createElement('button');
    componentRegistry.registerClient('Button', Button);

    assert.strictEqual(componentRegistry.isClientComponent('Button'), true);
    assert.strictEqual(componentRegistry.isClientComponent('OtherComponent'), false);
  });

  test('get client components set', () => {
    componentRegistry.registerClient('Button', () => { });
    componentRegistry.registerClient('Input', () => { });

    const clientComps = componentRegistry.getClientComponents();
    assert.ok(clientComps.has('Button'));
    assert.ok(clientComps.has('Input'));
  });

  test('clear registry', () => {
    componentRegistry.registerServer('Test', () => { });
    componentRegistry.clear();

    assert.strictEqual(componentRegistry.get('Test'), null);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('End-to-End: Serialization → Reconstruction', () => {
  test('serialize then reconstruct preserves structure', async () => {
    // Create original DOM tree
    const original = adapter.createElement('div');
    adapter.setAttribute(original, 'class', 'container');

    const h1 = adapter.createElement('h1');
    const text = adapter.createTextNode('Title');
    adapter.appendChild(h1, text);
    adapter.appendChild(original, h1);

    // Serialize to PSC
    const psc = serializeNode(original);

    // Reconstruct from PSC
    const reconstructed = await reconstructNode(psc);

    // Verify structure matches
    assert.strictEqual(reconstructed.tagName.toLowerCase(), 'div');
    assert.strictEqual(reconstructed.getAttribute('class'), 'container');
    assert.strictEqual(reconstructed.childNodes.length, 1);
    assert.strictEqual(reconstructed.childNodes[0].tagName.toLowerCase(), 'h1');
    assert.strictEqual(reconstructed.childNodes[0].childNodes[0].textContent, 'Title');
  });

  test('full workflow: server component → PSC → client reconstruction', async () => {
    // Server-side: Render component
    const ServerPage = () => {
      const div = adapter.createElement('div');
      adapter.setAttribute(div, 'class', 'page');

      const h1 = adapter.createElement('h1');
      const title = adapter.createTextNode('Welcome');
      adapter.appendChild(h1, title);
      adapter.appendChild(div, h1);

      return div;
    };

    const serverNode = await renderServerComponent(ServerPage);

    // Server-side: Serialize to PSC
    const payload = serializeToPSC(serverNode, {
      clientManifest: {},
      state: { timestamp: Date.now() }
    });

    // Client-side: Reconstruct from PSC
    const clientNode = await reconstructPSCTree(payload);

    // Verify
    assert.strictEqual(clientNode.getAttribute('class'), 'page');
    assert.strictEqual(clientNode.childNodes[0].childNodes[0].textContent, 'Welcome');
    assert.ok(payload.state.timestamp);
  });
});

console.log('Server Components Core tests loaded');
