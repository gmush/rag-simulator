---
name: web-components
description: "Vanilla JS Web Components conventions for this project: Shadow DOM encapsulation, destructive re-render pattern, two-panel layout, singleton state gating, progressive enablement, and CSS variable theming. Use when: adding a new pipeline stage, modifying an existing stage component, debugging Shadow DOM rendering, styling a custom element, or implementing interactive visualizations within a stage."
argument-hint: '[stage] ingestion | chunking | indexing | retrieval | refinement | synthesis'
---

# Web Components Architecture

## When to Use

- Adding a new pipeline stage (`<stage-xxx>`)
- Modifying an existing stage component (HTML layout, visualizations, action logic)
- Debugging Shadow DOM rendering or event binding
- Styling a custom element consistently with the neo-brutalist theme
- Implementing interactive CSS animations within a stage

## Component Skeleton

Every stage follows this exact skeleton. Use it as a template for new components:

```js
class StageExample extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    connectedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            ${sharedStyles}
            <style>/* component-specific styles */</style>
            <div class="stage-layout">
                <div class="info-panel">
                    <h2>Krok X: Tytuł Etapu</h2>
                    <p>Wyjaśnienie koncepcji…</p>
                    <div class="code-block">LlamaIndex snippet</div>
                    <button id="btn-xxx" ${/* disabled condition */}>Akcja</button>
                </div>
                <div class="vis-area">
                    <!-- visualization -->
                </div>
            </div>
        `;
        // Bind events and populate dynamic content
    }

    performXxx() {
        // Mutate state, animate, update button
    }
}
customElements.define('stage-example', StageExample);
```

## Key Patterns

### 1. Shadow DOM Setup

- `constructor()`: only `super()` + `this.attachShadow({ mode: 'open' })`. Never call `render()` here.
- `connectedCallback()`: delegates to `this.render()`.
- `render()`: sets `this.shadowRoot.innerHTML` entirely from scratch. **Destructive re-render** — no incremental DOM, no virtual DOM.

### 2. `sharedStyles` Injection

A global constant string (`sharedStyles`) is interpolated at the top of every `innerHTML` template. It contains base styles for `.stage-layout`, `.info-panel`, `.vis-area`, `h2`, `p`, `.code-block`, `button`, `.conveyor`, `.doc-item`, `.node-item`, and `.controls`. Any stage needing additional styles adds a second `<style>` block after `${sharedStyles}`.

### 3. Two-Panel Layout

Every stage uses `.stage-layout` (flex row, `gap: 2rem`, `height: 100%`) containing exactly:

| Panel | Class | Width | Purpose |
|-------|-------|-------|---------|
| Left | `.info-panel` | `flex: 0 0 350px` | Explanation, LlamaIndex code snippet, controls/buttons |
| Right | `.vis-area` | `flex: 1` | Interactive visualization, animated elements, dynamic containers |

### 4. State Gating (Progressive Enablement)

Buttons auto-disable based on `state` prerequisites checked in the template literal at render time:

```js
<button id="btn-split" ${state.documents.length === 0 ? 'disabled' : ''}>
    ${state.documents.length === 0 ? 'Brak dokumentów z kroku 1' : 'Wykonaj Chunking'}
</button>
```

This is a **read-time check** — the `disabled` attribute and label text are baked into the HTML string during `render()`. If the prerequisite is missing, the button shows a red-tinted reason message.

### 5. Button Success Flow

After a successful `performXxx()`:

1. Change button text to `'X wykonane [Przejdź dalej →]'`
2. Set `btn.style.background = '#10b981'` (green)
3. Reassign `btn.onclick` to programmatically click the next stepper tab:
   ```js
   btn.onclick = () => document.querySelector('.step-indicator[data-step="N"]').click();
   ```

### 6. Event Binding

Always bind events at the **end of `render()`**, after the HTML is injected:

```js
this.shadowRoot.getElementById('btn-xxx')?.addEventListener('click', () => this.performXxx());
```

Use optional chaining (`?.`) — if a button doesn't exist in the template (e.g., it was conditionally omitted), the call silently no-ops instead of throwing.

### 7. `state` Singleton Import

All stage modules import `state` and `sharedStyles` from `./state.js`:

```js
import { state, sharedStyles } from './state.js';
```

Read from `state` in `render()` to populate dynamic content; write to it in `performXxx()` to advance the pipeline.

```js
// Reading in render()
${state.documents.map(d => `<div>${d.id}</div>`).join('')}

// Writing in performXxx()
state.nodes = [...];
state.query = this.shadowRoot.getElementById('user-query').value;
```

Only `app.js` imports all stage modules (for side-effect registration). Individual stages never import each other.

### 8. Visualization with CSS Animations

Visual elements use staggered `setTimeout` (100–600ms per item) combined with CSS transitions. Pattern:

```js
state.xxx.forEach((item, idx) => {
    setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'node-item';
        el.style.transform = 'scale(0.5)';
        el.style.opacity = '0';
        el.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        container.appendChild(el);
        requestAnimationFrame(() => {
            el.style.transform = 'scale(1)';
            el.style.opacity = '1';
        });
    }, idx * 200);
});
```

Key: set initial state → `appendChild` → `requestAnimationFrame` to trigger the transition on the next frame.

## Anti-patterns

- **Calling `render()` in `constructor()`** — `connectedCallback` is the correct hook; the element may not be in the DOM yet during construction.
- **Using `document.querySelector()` from within Shadow DOM** — always use `this.shadowRoot.querySelector()` or `this.shadowRoot.getElementById()`. The shadow boundary isolates DOM queries.
- **Importing stage modules into other stages** — only `app.js` imports stages (for side-effect registration). Stages only import from `./state.js`.
- **Adding external dependencies** — no npm packages, no CDN scripts. Everything is vanilla.
- **English labels** — all UI text is in Polish (`pl`).
- **Removing `sharedStyles`** — every stage must include `${sharedStyles}` for visual consistency.
- **Incremental DOM updates** — always re-render the full `innerHTML`. Don't try to patch individual elements across renders.

## CSS Variable Theming

All colors come from `:root` custom properties in the main document stylesheet. When adding new visual elements in Shadow DOM, use hardcoded hex values matching the existing palette (Shadow DOM doesn't inherit `:root` variables):

| Token | Hex | Usage |
|-------|-----|-------|
| primary / dark | `#0f172a` | Borders, headings, code blocks background |
| accent | `#f59e0b` | Buttons, active stepper |
| accent hover | `#d97706` | Button hover |
| success | `#10b981` | Completed button state |
| node bg | `#e2e8f0` | Node/chunk backgrounds |
| node border | `#64748b` | Node/chunk borders, dashed lines |
| text main | `#1e293b` | Body text |
| text muted | `#475569` | Secondary text, descriptions |
| disabled | `#cbd5e1` | Disabled button background |

## Navigation Controller

The `<main>` element switches stages via CSS class toggling:

```js
container.querySelectorAll(':scope > *').forEach(c => c.classList.remove('active'));
targetComponent.render(); // re-render with current state
targetComponent.classList.add('active');
```

Only one stage has `.active` at a time. The header stepper tracks the current step visually.
