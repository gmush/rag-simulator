/**
 * State Manager (Singleton) — przechowuje stan przepływu danych pomiędzy etapami.
 * Reprezentuje cykl życia danych w LlamaIndex.
 */
class PipelineState {
    constructor() {
        this.documents = [];
        this.nodes = [];
        this.vectorIndex = [];
        this.query = "";
        this.retrievedNodes = [];
        this.refinedNodes = [];
        this.response = "";
        this.lang = 'pl'; // 'pl' or 'en'
    }
}

export const state = new PipelineState();

/**
 * Globalny system stylów dla Shadow DOM.
 * Wstrzykiwany jako pierwszy element innerHTML każdego komponentu.
 */
export const sharedStyles = `
    <style>
        :root {
            /* Retriever method colors */
            --retriever-vector-bg: #f9f9f9;
            --retriever-vector-border: #999999;
            --retriever-bm25-bg: #f2f2f2;
            --retriever-bm25-border: #888888;
            --retriever-hybrid-bg: #ebebeb;
            --retriever-hybrid-border: #777777;
            --retriever-recursive-bg: #e4e4e4;
            --retriever-recursive-border: #666666;
            --retriever-router-bg: #dddddd;
            --retriever-router-border: #555555;

            /* Refinement state colors */
            --refine-passed-bg: #f9f9f9;
            --refine-passed-border: #999999;
            --refine-keyword-bg: #f2f2f2;
            --refine-keyword-border: #888888;
            --refine-reorder-bg: #ebebeb;
            --refine-reorder-border: #777777;
            --refine-trimmed-bg: #e4e4e4;
            --refine-trimmed-border: #666666;
            --refine-rerank-bg: #dddddd;
            --refine-rerank-border: #555555;

            /* Chunking hierarchy colors */
            --chunk-hier-l1: #333333;
            --chunk-hier-l2: #777777;
            --chunk-hier-l3: #bbbbbb;

            /* Index cell colors */
            --index-vector-bg: #222222;
            --index-vector-border: #111111;
            --index-summary-bg: #444444;
            --index-summary-border: #333333;
            --index-keyword-bg: #666666;
            --index-keyword-border: #555555;
            --index-tree-bg: #888888;
            --index-tree-border: #777777;
            --index-knowledge-bg: #aaaaaa;
            --index-knowledge-border: #999999;
            --index-cell-empty-border: #dddddd;
            --index-cell-empty-text: #bbbbbb;

            /* Synthesis mode colors */
            --synth-compact: #333333;
            --synth-tree: #555555;
            --synth-refine: #777777;
            --synth-simple: #999999;
            --synth-accumulate: #bbbbbb;
            --synth-output-bg: #111111;
            --synth-output-text: #dddddd;
            --synth-engine-bg: #eeeeee;

            /* Common UI */
            --success: #444444;
            --color-red: #888888;
            --color-blue: #555555;
            --color-muted: #777777;
            --color-slate-300: #dddddd;
            --btn-bg: #333333;
            --btn-disabled-bg: #dddddd;
            --code-text: #cccccc;
        }
        :host { display: block; width: 100%; height: 100%; }
        .stage-layout { display: flex; width: 100%; gap: 2rem; height: 100%; }
        .info-panel { flex: 0 0 350px; background: #ffffff; border: 1px solid #cccccc; border-radius: 4px; padding: 1.5rem; display: flex; flex-direction: column; overflow-y: auto; font-family: 'Inter', sans-serif;}
        .vis-area { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid #dddddd; background: rgba(255,255,255,0.6); border-radius: 4px; padding: 2rem; position: relative; overflow: hidden; font-family: 'Inter', sans-serif;}
        h2 { margin-top: 0; font-family: 'Inter', sans-serif; border-bottom: 1px solid #cccccc; padding-bottom: 0.5rem; font-size: 1.2rem; }
        p { line-height: 1.5; color: var(--text-muted); font-size: 0.95rem; }
        .code-block { background: var(--primary); color: var(--code-text); padding: 1rem; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; white-space: pre-wrap; margin: 1rem 0; overflow-x: auto; }
        button { background: var(--btn-bg); color: white; border: 1px solid #333333; padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: bold; font-family: 'Inter', sans-serif; cursor: pointer; border-radius: 4px; transition: all 0.1s; margin-top: 1rem; width: 100%;}
        button:active { transform: translateY(1px); }
        button:disabled { background: var(--btn-disabled-bg); cursor: not-allowed; color: var(--node-border); }
        .conveyor { width: 100%; height: 120px; border-top: 1px solid #cccccc; border-bottom: 1px solid #cccccc; position: relative; display: flex; align-items: center; background: repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(0,0,0,0.05) 20px, rgba(0,0,0,0.05) 40px); animation: moveConveyor 2s linear infinite; }
        @keyframes moveConveyor { from { background-position: 0 0; } to { background-position: 56px 0; } }
        .doc-item { border: 1px solid #cccccc; padding: 1rem; margin: 0 1rem; text-align: center; font-family: 'Inter', sans-serif; font-weight: bold; z-index: 2; background: white; }
        .node-item { background: var(--node-bg); border: 1px solid var(--node-border); padding: 0.5rem; margin: 0.2rem; font-family: 'Inter', sans-serif; font-size: 0.8rem; }
        .controls { width: 100%; max-width: 400px; background: white; padding: 1rem; border: 1px solid #cccccc; margin-bottom: 2rem; border-radius: 4px; z-index: 2;}
        label { font-family: 'Inter', sans-serif; font-weight: bold; display: block; margin-bottom: 0.5rem;}
        input[type=range], input[type=text] { width: 100%; margin-bottom: 1rem; }
    </style>
`;
