# AGENTS.md — RAG Pipeline Interactive Architecture

## Project Identity

Zero-dependency HTML application that simulates a LlamaIndex RAG pipeline with interactive visualizations. Open `index.html` in a browser — no build step, no package manager, no server required.

## File Structure

```
rag-game/
├── index.html                  # Entry point — loads CSS + ES module entry
├── css/styles.css              # All global styles (CSS variables, layout, components)
└── js/
    ├── state.js                # PipelineState singleton + sharedStyles string
    ├── app.js                  # Main controller (navigation, DOMContentLoaded)
    ├── stage-ingestion.js      # Stage 1 — Data Loading
    ├── stage-chunking.js       # Stage 2 — Chunking
    ├── stage-indexing.js       # Stage 3 — Indexing / Embeddings
    ├── stage-retrieval.js      # Stage 4 — Query & Retrieval
    ├── stage-refinement.js     # Stage 5 — Postprocessing
    └── stage-synthesis.js      # Stage 6 — Response Synthesis
```

## Architecture

### Web Components + Shadow DOM

Six custom elements, one per pipeline stage. All extend `HTMLElement`, use `this.attachShadow({ mode: 'open' })`, and inject a shared `sharedStyles` string:

| Tag | Class | File | Stage |
|-----|-------|------|-------|
| `<stage-ingestion>` | `StageIngestion` | `js/stage-ingestion.js` | 1 — Data Loading |
| `<stage-chunking>` | `StageChunking` | `js/stage-chunking.js` | 2 — Chunking |
| `<stage-indexing>` | `StageIndexing` | `js/stage-indexing.js` | 3 — Indexing |
| `<stage-retrieval>` | `StageRetrieval` | `js/stage-retrieval.js` | 4 — Retrieval |
| `<stage-refinement>` | `StageRefinement` | `js/stage-refinement.js` | 5 — Postprocessing |
| `<stage-synthesis>` | `StageSynthesis` | `js/stage-synthesis.js` | 6 — Response Synthesis |

### Singleton State (`PipelineState`)

Defined in `js/state.js`, exported as `state`. All stage modules import it:

```js
import { state, sharedStyles } from './state.js';
```

Data flow between stages:

```js
state.documents        // Stage 1 → writes, Stage 2 → reads
state.nodes            // Stage 2 → writes, Stage 3 → reads
state.vectorIndex      // Stage 3 → writes, Stage 4 → reads
state.query            // Stage 4 → writes, Stage 6 → reads
state.retrievedNodes   // Stage 4 → writes, Stage 5 → reads
state.refinedNodes     // Stage 5 → writes, Stage 6 → reads
state.response         // Stage 6 → writes
```

### ES Modules

`index.html` loads a single `<script type="module" src="js/app.js">`. `app.js` imports all stage modules, which triggers `customElements.define()` and imports `state` from `state.js`.

### Render-on-Activate Pattern

Navigating to a stage calls `component.render()`, which sets `shadowRoot.innerHTML` from scratch. This is a **destructive re-render** — no incremental DOM, no virtual DOM. Always call `render()` after any state change that the active component should reflect.

### Progressive Enablement

Action buttons in each stage auto-disable if prerequisite state is missing (e.g., Chunking button is `disabled` when `state.documents.length === 0`). After successful completion, the button turns green and auto-navigates to the next stage via `stepper.children[stageIndex].click()`.

## Conventions

- **Two-panel layout**: Every component uses `.info-panel` (left, explanation + code snippet) + `.vis-area` (right, interactive visualization)
- **CSS variables**: All colors in `:root` as custom properties (`--primary`, `--accent`, `--bg-color`, etc.)
- **Method naming**: `connectedCallback()` → `render()`, action methods are `performXxx()`
- **Button IDs**: `btn-load`, `btn-split`, `btn-index`, `btn-retrieve`, `btn-refine`, `btn-synthesize`
- **Language**: All UI text and labels are in **Polish**
- **Aesthetic**: Neo-brutalist — heavy borders, offset box-shadows, monospace fonts, grid-pattern background
- **Module imports**: Each stage imports `{ state, sharedStyles }` from `'./state.js'`

## What NOT to Do

- **Do not add `package.json`**, `node_modules`, bundlers, or any build tooling — the project is intentionally zero-dependency
- **Do not add real embeddings or API calls** — this is an educational simulation with mock data
- **Do not change the language** — UI stays in Polish unless explicitly requested
- **Do not remove Shadow DOM** — style encapsulation is a core architectural choice
- Do not import stage modules into other stages — only `app.js` does top-level imports
- Do not use bare globals for `state` — always `import { state } from './state.js'`

## Domain Knowledge

For RAG concepts (chunking strategies, embedding models, vector stores, retrieval methods): see [`.github/skills/rag-pipeline/SKILL.md`](.github/skills/rag-pipeline/SKILL.md).

For Web Components conventions (Shadow DOM, render pattern, two-panel layout, state gating): see [`.github/skills/web-components/SKILL.md`](.github/skills/web-components/SKILL.md).
