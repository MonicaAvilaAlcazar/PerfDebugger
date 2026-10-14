// render-tracker.js - Runs in the page's MAIN world so it can see framework
// internals (content.js runs in an isolated world and can't).
//
// Detects component re-renders for React, Vue 2/3 and Angular, and posts
// per-component deltas to content.js once per second via window.postMessage.
//
// Design goal: never interfere with the page or with framework DevTools.
// We deliberately do NOT install a fake __REACT_DEVTOOLS_GLOBAL_HOOK__ (that
// would make React DevTools bail out). Instead we observe React fiber roots
// from the DOM and detect commits by polling root.current once per frame.
//
// Tracking stays dormant until content.js sends { type: 'config', renderTracking: true }.

(function() {
  'use strict';

  if (window.__perfDebuggerRenderTracker) return;
  window.__perfDebuggerRenderTracker = true;

  const SOURCE_OUT = 'perfdebugger-main';
  const SOURCE_IN = 'perfdebugger-isolated';
  const MAX_COMPONENTS_PER_FLUSH = 50;

  let enabled = false;
  let framework = null;        // 'React' | 'Vue' | 'Angular'
  let note = null;             // e.g. "production build — enable dev mode"
  let commits = 0;             // React commits / Vue+Angular update cycles
  let pending = new Map();     // componentName -> renders since last flush
  let scanTimer = null;
  let flushTimer = null;

  function count(name) {
    const key = name || 'Anonymous';
    pending.set(key, (pending.get(key) || 0) + 1);
  }

  // Vue/Angular have no single "commit": group renders that happen in the same
  // task (one scheduler flush / change-detection pass) into one update cycle.
  let cyclePending = false;
  function markCycle() {
    if (cyclePending) return;
    cyclePending = true;
    queueMicrotask(() => { cyclePending = false; commits++; });
  }

  function setFramework(name, extraNote) {
    if (!framework) framework = name;
    if (extraNote !== undefined) note = extraNote;
  }

  // ==========================================================
  // REACT (16+, dev and production builds)
  // ==========================================================
  // Fiber tags for user components.
  const FunctionComponent = 0;
  const ClassComponent = 1;
  const HostRoot = 3;
  const ForwardRef = 11;
  const MemoComponent = 14;
  const SimpleMemoComponent = 15;
  const PerformedWork = 1;

  const reactRoots = new Set();          // FiberRoot objects
  const lastCurrent = new WeakMap();     // FiberRoot -> last seen root.current
  let rafId = null;

  function fiberKeyOf(el) {
    for (const key in el) {
      if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) return key;
    }
    return null;
  }

  function findReactRootFromElement(el) {
    const key = fiberKeyOf(el);
    if (!key) return null;
    let fiber = el[key];
    let guard = 0;
    while (fiber && fiber.return && guard++ < 10000) fiber = fiber.return;
    return fiber && fiber.tag === HostRoot ? fiber.stateNode : null;
  }

  function componentName(fiber) {
    const type = fiber.type;
    if (!type) return null;
    if (typeof type === 'function') return type.displayName || type.name || null;
    if (typeof type === 'object') {
      if (type.displayName) return type.displayName;
      const inner = type.type || type.render; // memo(...) / forwardRef(...)
      if (inner) return inner.displayName || inner.name || null;
    }
    return null;
  }

  function isUserComponent(tag) {
    return tag === FunctionComponent || tag === ClassComponent || tag === ForwardRef ||
      tag === MemoComponent || tag === SimpleMemoComponent;
  }

  // Walks the committed tree and counts components that actually re-rendered.
  // Subtrees whose child pointer is shared with the previous tree bailed out
  // and are skipped — same technique React DevTools uses, and it avoids
  // reading stale flags on fibers React didn't touch.
  function walkCommittedTree(rootFiber) {
    const stack = [rootFiber.child];
    let visited = 0;
    while (stack.length && visited++ < 50000) {
      const fiber = stack.pop();
      if (!fiber) continue;
      if (fiber.sibling) stack.push(fiber.sibling);
      const alt = fiber.alternate;
      if (alt && isUserComponent(fiber.tag)) {
        const flags = fiber.flags !== undefined ? fiber.flags : fiber.effectTag;
        if (flags & PerformedWork) count(componentName(fiber));
      }
      if (!(alt && fiber.child === alt.child)) stack.push(fiber.child);
    }
  }

  function pollReactRoots() {
    rafId = null;
    if (!enabled) return;
    for (const root of reactRoots) {
      const current = root.current;
      const prev = lastCurrent.get(root);
      if (current && current !== prev) {
        lastCurrent.set(root, current);
        if (prev) {
          commits++;
          try { walkCommittedTree(current); } catch (e) { /* internals changed */ }
        }
      }
    }
    rafId = requestAnimationFrame(pollReactRoots);
  }

  function scanReact() {
    const body = document.body;
    if (!body) return;
    // Roots almost always sit within a few levels of <body>.
    const candidates = body.querySelectorAll(':scope > *, :scope > * > *, :scope > * > * > *');
    const limit = Math.min(candidates.length, 400);
    let found = false;
    for (let i = 0; i < limit; i++) {
      const root = findReactRootFromElement(candidates[i]);
      if (root && !reactRoots.has(root)) {
        reactRoots.add(root);
        lastCurrent.set(root, root.current);
        found = true;
      }
    }
    if (reactRoots.size) {
      setFramework('React');
      if (found && rafId == null) rafId = requestAnimationFrame(pollReactRoots);
    }
  }

  // ==========================================================
  // VUE 3 — attach an `updated` hook to every component instance.
  // instance.u is re-read on each update, so hooks added later still fire.
  // VUE 2 — subscribe to the 'hook:updated' instance event.
  // Both work in production builds.
  // ==========================================================
  const attached = new WeakSet();

  function vue3Name(instance) {
    const t = instance.type || {};
    return t.name || t.__name || (t.__file ? t.__file.split('/').pop().replace(/\.vue$/, '') : null);
  }

  function attachVue3(instance) {
    if (attached.has(instance)) return;
    attached.add(instance);
    const name = vue3Name(instance);
    const hook = () => { if (enabled) { count(name); markCycle(); } };
    if (Array.isArray(instance.u)) instance.u.push(hook);
    else instance.u = [hook];
  }

  function walkVue3VNode(vnode, depth) {
    if (!vnode || depth > 500) return;
    if (vnode.component) {
      attachVue3(vnode.component);
      walkVue3VNode(vnode.component.subTree, depth + 1);
    }
    if (vnode.suspense && vnode.suspense.activeBranch) {
      walkVue3VNode(vnode.suspense.activeBranch, depth + 1);
    }
    if (Array.isArray(vnode.children)) {
      for (const child of vnode.children) {
        if (child && typeof child === 'object') walkVue3VNode(child, depth + 1);
      }
    }
  }

  function attachVue2(vm, depth) {
    if (!vm || depth > 500) return;
    if (!attached.has(vm) && typeof vm.$on === 'function') {
      attached.add(vm);
      const name = vm.$options && (vm.$options.name || vm.$options._componentTag);
      vm.$on('hook:updated', () => { if (enabled) { count(name); markCycle(); } });
    }
    (vm.$children || []).forEach(child => attachVue2(child, depth + 1));
  }

  function scanVue() {
    const els = document.querySelectorAll('body, body > *, body > * > *');
    for (const el of els) {
      // app._instance is dev-only; container._vnode exists in production too.
      const app = el.__vue_app__;
      if (app) {
        setFramework('Vue');
        const rootVNode = el._vnode || (app._instance && app._instance.vnode);
        try { walkVue3VNode(rootVNode, 0); } catch (e) { /* ignore */ }
      } else if (el.__vue__ && !el.__vue__.$parent) {
        setFramework('Vue');
        try { attachVue2(el.__vue__, 0); } catch (e) { /* ignore */ }
      }
    }
  }

  // ==========================================================
  // ANGULAR — uses the dev-mode profiler (ng.ɵsetProfiler, Angular 12+).
  // Production builds strip it, so we just report detection.
  // ==========================================================
  const TemplateUpdateStart = 2;
  let angularHooked = false;

  function scanAngular() {
    if (angularHooked) return;
    const versioned = document.querySelector('[ng-version]');
    if (!versioned) return;
    const ng = window.ng;
    const setProfiler = ng && ng['ɵsetProfiler'];
    if (typeof setProfiler !== 'function') {
      setFramework('Angular', 'Production build detected — re-render tracking needs a dev build (ng serve).');
      return;
    }
    angularHooked = true;
    setFramework('Angular', null);
    try {
      setProfiler((event, instance) => {
        if (!enabled || event !== TemplateUpdateStart || !instance) return;
        const name = instance.constructor && instance.constructor.name;
        if (name && name !== 'Object') { count(name); markCycle(); }
      });
    } catch (e) {
      angularHooked = false;
    }
  }

  // ==========================================================
  // SCAN + FLUSH LOOP
  // ==========================================================
  function scan() {
    if (!enabled || document.visibilityState !== 'visible') return;
    try { scanReact(); } catch (e) { /* ignore */ }
    try { scanVue(); } catch (e) { /* ignore */ }
    try { scanAngular(); } catch (e) { /* ignore */ }
  }

  function flush() {
    if (!framework) return;
    if (!pending.size && !commits && !note) return;
    const components = [...pending.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_COMPONENTS_PER_FLUSH)
      .map(([name, renders]) => ({ name, renders }));
    window.postMessage({
      source: SOURCE_OUT,
      type: 'renders',
      framework,
      note,
      commits,
      components
    }, window.location.origin === 'null' ? '*' : window.location.origin);
    pending = new Map();
    commits = 0;
    note = null;
  }

  function start() {
    if (enabled) return;
    enabled = true;
    scan();
    scanTimer = setInterval(scan, 2000);
    // Catch apps that mount right after parsing instead of waiting for the next tick.
    document.addEventListener('DOMContentLoaded', scan, { once: true });
    window.addEventListener('load', scan, { once: true });
    flushTimer = setInterval(flush, 1000);
    if (reactRoots.size && rafId == null) rafId = requestAnimationFrame(pollReactRoots);
  }

  function stop() {
    enabled = false;
    clearInterval(scanTimer);
    clearInterval(flushTimer);
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = null;
    pending = new Map();
    commits = 0;
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== SOURCE_IN || data.type !== 'config') return;
    if (data.renderTracking) start();
    else stop();
  });

  // Script injection order between worlds isn't guaranteed: announce that we're
  // listening so content.js can (re)send the config if it loaded first.
  window.postMessage({ source: SOURCE_OUT, type: 'ready' },
    window.location.origin === 'null' ? '*' : window.location.origin);
})();
