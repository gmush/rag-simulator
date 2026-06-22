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
        :host { display: block; width: 100%; height: 100%; }
        .stage-layout { display: flex; width: 100%; gap: 2rem; height: 100%; }
        .info-panel { flex: 0 0 350px; background: rgba(255, 255, 255, 0.95); border: 2px solid #0f172a; border-radius: 8px; padding: 1.5rem; box-shadow: 4px 4px 0 #0f172a; display: flex; flex-direction: column; overflow-y: auto;}
        .vis-area { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed #64748b; background: rgba(255,255,255,0.6); border-radius: 8px; padding: 2rem; position: relative; overflow: hidden;}
        h2 { margin-top: 0; font-family: 'Courier New', monospace; border-bottom: 2px solid #0f172a; padding-bottom: 0.5rem; font-size: 1.2rem; }
        p { line-height: 1.5; color: #475569; font-size: 0.95rem; }
        .code-block { background: #0f172a; color: #a5b4fc; padding: 1rem; border-radius: 4px; font-family: monospace; font-size: 0.85rem; white-space: pre-wrap; margin: 1rem 0; overflow-x: auto; }
        button { background: #f59e0b; color: white; border: 2px solid #0f172a; padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: bold; font-family: monospace; cursor: pointer; border-radius: 4px; box-shadow: 3px 3px 0 #0f172a; transition: all 0.1s; margin-top: 1rem; width: 100%;}
        button:active { transform: translate(3px, 3px); box-shadow: 0px 0px 0 #0f172a; }
        button:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: 1px 1px 0 #0f172a; color: #64748b; }
        .conveyor { width: 100%; height: 120px; border-top: 4px solid #0f172a; border-bottom: 4px solid #0f172a; position: relative; display: flex; align-items: center; background: repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(0,0,0,0.05) 20px, rgba(0,0,0,0.05) 40px); animation: moveConveyor 2s linear infinite; }
        @keyframes moveConveyor { from { background-position: 0 0; } to { background-position: 56px 0; } }
        .doc-item { background: white; border: 2px solid #0f172a; padding: 1rem; margin: 0 1rem; text-align: center; font-family: monospace; font-weight: bold; box-shadow: 2px 2px 0 #0f172a; z-index: 2; background-color: #fff; }
        .node-item { background: #e2e8f0; border: 2px solid #64748b; padding: 0.5rem; margin: 0.2rem; font-family: monospace; font-size: 0.8rem; box-shadow: 1px 1px 0 #0f172a; }
        .controls { width: 100%; max-width: 400px; background: white; padding: 1rem; border: 2px dashed #0f172a; margin-bottom: 2rem; border-radius: 4px; z-index: 2;}
        label { font-family: monospace; font-weight: bold; display: block; margin-bottom: 0.5rem;}
        input[type=range], input[type=text] { width: 100%; margin-bottom: 1rem; }
    </style>
`;
