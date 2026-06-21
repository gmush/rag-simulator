import { state, sharedStyles } from './state.js';

// --- STAGE 5: REFINEMENT ---
class StageRefinement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    #getPostprocessorSnippet(method) {
        const snippets = {
            similarity: `from llama_index.postprocessor import SimilarityPostprocessor

postprocessor = SimilarityPostprocessor(
    similarity_cutoff=0.75
)
refined_nodes = postprocessor.postprocess_nodes(
    retrieved_nodes
)
# Odrzuca węzły poniżej progu similarity`,
            keyword: `from llama_index.postprocessor import KeywordNodePostprocessor

postprocessor = KeywordNodePostprocessor(
    required_keywords=["LlamaIndex"],
    exclude_keywords=["deprecated"]
)
refined_nodes = postprocessor.postprocess_nodes(
    retrieved_nodes
)
# Filtruje po obecności/braku słów kluczowych`,
            reorder: `from llama_index.postprocessor import LongContextReorder

postprocessor = LongContextReorder()
refined_nodes = postprocessor.postprocess_nodes(
    retrieved_nodes
)
# Przenosi najbardziej relevantne węzły na początek i koniec
# (efekt "lost in the middle" — LLM lepiej czyta brzegi)`,
            optimizer: `from llama_index.postprocessor import SentenceEmbeddingOptimizer

postprocessor = SentenceEmbeddingOptimizer(
    embed_model=embed_model,
    percentile_cutoff=0.8
)
refined_nodes = postprocessor.postprocess_nodes(
    retrieved_nodes
)
# Wycina zdania niepodobne do query z każdego węzła`,
            rerank: `from llama_index.postprocessor import CohereRerank

postprocessor = CohereRerank(
    api_key="cohere-api-key",
    top_n=3
)
refined_nodes = postprocessor.postprocess_nodes(
    retrieved_nodes
)
# ML reranking — model ocenia relevancję od nowa`
        };
        return snippets[method] || snippets.similarity;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            ${sharedStyles}
            <style>
                select { width:100%; padding:0.5rem; font-family:monospace; border:2px solid #0f172a; border-radius:4px; margin-bottom:1rem; background:white; }
                .passed { border-left:5px solid #10b981 !important; }
                .failed { opacity:0.4; text-decoration:line-through; }
                .reordered { border-left:5px solid #3b82f6 !important; }
                .trimmed { border-left:5px solid #f59e0b !important; }
                .reranked { border-left:5px solid #ec4899 !important; }
            </style>
            <div class="stage-layout">
                <div class="info-panel">
                    <h2>Krok 5: Rafinacja (Postprocessing)</h2>
                    <p><strong>Node Postprocessors:</strong><br/>
                    Odrzucanie szumu i optymalizacja kontekstu przed wysłaniem do LLM.</p>

                    <label>Rodzaj Postprocessora:</label>
                    <select id="postprocessor-select">
                        <option value="similarity">SimilarityPostprocessor (próg score)</option>
                        <option value="keyword">KeywordNodePostprocessor (słowa kluczowe)</option>
                        <option value="reorder">LongContextReorder (kolejność)</option>
                        <option value="optimizer">SentenceEmbeddingOptimizer (trim)</option>
                        <option value="rerank">CohereRerank (ML reranking)</option>
                    </select>

                    <label id="param-label">Similarity Cutoff: <span id="val-param">0.75</span></label>
                    <input type="range" id="param-slider" min="0.3" max="0.95" step="0.05" value="0.75">
                    
                    <div class="code-block" id="code-snippet">
${this.#getPostprocessorSnippet('similarity')}
                    </div>
                    <button id="btn-refine" ${state.retrievedNodes.length === 0 ? 'disabled' : ''}>
                        ${state.retrievedNodes.length === 0 ? 'Brak danych z kroku 4' : 'Aplikuj Postprocesory'}
                    </button>
                </div>
                <div class="vis-area">
                    <div style="display:flex; width: 100%; gap: 2rem;">
                        <div style="flex:1;">
                            <h3>Wejście (Retrieved)</h3>
                            <div id="raw-nodes">
                                ${state.retrievedNodes.length === 0 ? '<span style="color:red">Brak danych</span>' : 
                                    state.retrievedNodes.map(n => `
                                        <div class="node-item" id="raw-${n.id}">
                                            ${n.id} | Score: ${n.score}
                                        </div>
                                    `).join('')
                                }
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100px;">
                            <div style="font-family: monospace; font-weight:bold; background: #0f172a; color: white; padding: 0.5rem; text-align: center;" id="filter-label">
                                FILTER<br>>=<span id="lbl-param">0.75</span>
                            </div>
                            <div style="font-size: 2rem;">→</div>
                        </div>
                        <div style="flex:1;">
                            <h3>Wyjście (Refined)</h3>
                            <div id="refined-nodes" style="min-height: 100px; border: 2px dashed #10b981; padding: 1rem;"></div>
                            <div id="refined-stats" style="font-family:monospace; font-size:0.8rem; margin-top:0.5rem; color:#475569;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const ppSel = this.shadowRoot.getElementById('postprocessor-select');
        ppSel.addEventListener('change', () => {
            const m = ppSel.value;
            this.shadowRoot.getElementById('code-snippet').textContent = this.#getPostprocessorSnippet(m);
            const paramLabels = {
                similarity: ['Similarity Cutoff:', '0.75', 'FILTER<br>>='],
                keyword: ['Min. słów kluczowych:', '1', 'KEYWORD<br>≥'],
                reorder: ['Siła przetasowania:', '0.5', 'REORDER<br>~'],
                optimizer: ['Percentyl odcięcia:', '0.8', 'TRIM<br>≥'],
                rerank: ['Top-N po reranku:', '3', 'RERANK<br>top']
            };
            const [lbl, val, filterLbl] = paramLabels[m] || paramLabels.similarity;
            this.shadowRoot.getElementById('param-label').innerHTML = `${lbl} <span id="val-param">${val}</span>`;
            this.shadowRoot.getElementById('lbl-param').textContent = val;
            this.shadowRoot.getElementById('filter-label').innerHTML = `${filterLbl}<span id="lbl-param">${val}</span>`;
        });

        this.shadowRoot.getElementById('param-slider')?.addEventListener('input', (e) => {
            this.shadowRoot.getElementById('val-param').textContent = e.target.value;
            this.shadowRoot.getElementById('lbl-param').textContent = e.target.value;
        });
        this.shadowRoot.getElementById('btn-refine')?.addEventListener('click', () => this.performRefinement());
    }

    performRefinement() {
        const method = this.shadowRoot.getElementById('postprocessor-select').value;
        const param = parseFloat(this.shadowRoot.getElementById('param-slider').value);
        const refinedContainer = this.shadowRoot.getElementById('refined-nodes');
        refinedContainer.innerHTML = '';
        state.refinedNodes = [];

        const processors = {
            similarity: () => {
                state.retrievedNodes.forEach((node, idx) => {
                    const rawEl = this.shadowRoot.getElementById(`raw-${node.id}`);
                    if(parseFloat(node.score) >= param) {
                        state.refinedNodes.push(node);
                        if (rawEl) rawEl.classList.add('passed');
                        setTimeout(() => {
                            const el = document.createElement('div');
                            el.className = 'node-item passed';
                            el.style.background = '#d1fae5'; el.style.borderColor = '#10b981';
                            el.innerHTML = `${node.id}<br><small>Passed (Score: ${node.score} ≥ ${param})</small>`;
                            refinedContainer.appendChild(el);
                        }, idx * 250);
                    } else {
                        if (rawEl) rawEl.classList.add('failed');
                    }
                });
            },
            keyword: () => {
                state.retrievedNodes.forEach((node, idx) => {
                    const rawEl = this.shadowRoot.getElementById(`raw-${node.id}`);
                    if (parseFloat(node.score) >= 0.5 || node.id.includes('node_')) {
                        state.refinedNodes.push(node);
                        if (rawEl) rawEl.classList.add('passed');
                        setTimeout(() => {
                            const el = document.createElement('div');
                            el.className = 'node-item passed';
                            el.style.background = '#dbeafe'; el.style.borderColor = '#3b82f6';
                            el.innerHTML = `${node.id}<br><small>Zawiera słowa kluczowe</small>`;
                            refinedContainer.appendChild(el);
                        }, idx * 250);
                    } else {
                        if (rawEl) rawEl.classList.add('failed');
                    }
                });
            },
            reorder: () => {
                state.refinedNodes = [...state.retrievedNodes];
                const best = state.refinedNodes.sort((a,b) => b.score - a.score).shift();
                if (best) {
                    state.refinedNodes = [best, ...state.refinedNodes.slice(0, -1)];
                }
                state.refinedNodes.forEach((node, idx) => {
                    const rawEl = this.shadowRoot.getElementById(`raw-${node.id}`);
                    if (rawEl) rawEl.classList.add('reordered');
                    setTimeout(() => {
                        const el = document.createElement('div');
                        el.className = 'node-item reordered';
                        el.style.background = '#e0f2fe'; el.style.borderColor = '#0284c7';
                        el.innerHTML = `${node.id}<br><small>Pozycja: ${idx+1} (score: ${node.score})</small>`;
                        refinedContainer.appendChild(el);
                    }, idx * 250);
                });
            },
            optimizer: () => {
                state.retrievedNodes.forEach((node, idx) => {
                    const rawEl = this.shadowRoot.getElementById(`raw-${node.id}`);
                    if (parseFloat(node.score) >= 0.55) {
                        const trimmedNode = { ...node, text: node.text.substring(0, 30) + '...[trim]' };
                        state.refinedNodes.push(trimmedNode);
                        if (rawEl) rawEl.classList.add('trimmed');
                        setTimeout(() => {
                            const el = document.createElement('div');
                            el.className = 'node-item trimmed';
                            el.style.background = '#fef3c7'; el.style.borderColor = '#d97706';
                            el.innerHTML = `${node.id}<br><small>Trimmed (nieistotne zdania usunięte)</small>`;
                            refinedContainer.appendChild(el);
                        }, idx * 250);
                    } else {
                        if (rawEl) rawEl.classList.add('failed');
                    }
                });
            },
            rerank: () => {
                const topN = Math.max(1, Math.min(Math.floor(param), state.retrievedNodes.length));
                const reranked = [...state.retrievedNodes].map(n => ({
                    ...n,
                    score: (Math.random() * 0.5 + 0.5).toFixed(2)
                })).sort((a,b) => b.score - a.score);
                state.refinedNodes = reranked.slice(0, topN);
                reranked.forEach((node, idx) => {
                    const rawEl = this.shadowRoot.getElementById(`raw-${node.id}`);
                    if (rawEl) rawEl.classList.add(idx < topN ? 'reranked' : 'failed');
                    if (idx < topN) {
                        setTimeout(() => {
                            const el = document.createElement('div');
                            el.className = 'node-item reranked';
                            el.style.background = '#fce7f3'; el.style.borderColor = '#db2777';
                            el.innerHTML = `${node.id}<br><small>ML Rerank score: ${node.score}</small>`;
                            refinedContainer.appendChild(el);
                        }, idx * 250);
                    }
                });
            }
        };

        (processors[method] || processors.similarity)();

        const methodNames = { similarity:'SimilarityPostprocessor', keyword:'KeywordFilter', reorder:'LongContextReorder', optimizer:'SentenceOptimizer', rerank:'CohereRerank' };
        this.shadowRoot.getElementById('refined-stats').textContent = 
            `${state.retrievedNodes.length} → ${state.refinedNodes.length} węzłów (${methodNames[method]})`;

        const btn = this.shadowRoot.getElementById('btn-refine');
        btn.textContent = `Dane Oczyszczone (${state.refinedNodes.length} węzłów) [Przejdź dalej →]`;
        btn.style.background = '#10b981';
        btn.onclick = () => document.querySelector('.step-indicator[data-step="6"]').click();
    }
}
customElements.define('stage-refinement', StageRefinement);
