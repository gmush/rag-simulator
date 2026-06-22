import { state, sharedStyles } from './state.js';
import { t } from './i18n.js';

// --- STAGE 4: QUERY & RETRIEVAL ---
class StageRetrieval extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    #getRetrieverSnippet(method) {
        const snippets = {
            vector: `from llama_index.retrievers import VectorIndexRetriever

retriever = VectorIndexRetriever(
    index=index,
    similarity_top_k=3
)
nodes = retriever.retrieve("Jak działa RAG?")
# Cosine similarity — nearest neighbor search w przestrzeni wektorowej`,
            bm25: `from llama_index.retrievers import BM25Retriever

retriever = BM25Retriever.from_defaults(
    nodes=nodes,
    similarity_top_k=3
)
nodes = retriever.retrieve("Jak działa RAG?")
# BM25 — klasyczne wyszukiwanie keyword-based (TF-IDF+)`,
            hybrid: `from llama_index.retrievers import VectorIndexRetriever, BM25Retriever

vector_retriever = VectorIndexRetriever(index, similarity_top_k=3)
bm25_retriever = BM25Retriever.from_defaults(nodes, similarity_top_k=3)

# Fuzja wyników (RRF — Reciprocal Rank Fusion)
results = vector_retriever.retrieve(q) + bm25_retriever.retrieve(q)
# Hybrydowe: vector + keyword → najlepsze z obu światów`,
            recursive: `from llama_index.retrievers import RecursiveRetriever

retriever = RecursiveRetriever(
    root_retriever=vector_retriever,
    node_dict=node_mapping
)
nodes = retriever.retrieve("Jak działa RAG?")
# Przeszukuje hierarchicznie: node → parent → siblings`,
            router: `from llama_index.retrievers import RouterRetriever
from llama_index.selectors import LLMSingleSelector

retriever = RouterRetriever(
    selector=LLMSingleSelector.from_defaults(),
    retriever_tools=[
        vector_retriever.as_tool(description="semantic"),
        bm25_retriever.as_tool(description="keyword")
    ]
)
nodes = retriever.retrieve("Jak działa RAG?")
# LLM wybiera najlepszy retriever dla zapytania`,
            auto_merging: `from llama_index.retrievers import AutoMergingRetriever

retriever = AutoMergingRetriever(
    vector_retriever,
    storage_context,
    verbose=True
)
nodes = retriever.retrieve("Jak działa RAG?")
# Automatycznie scala child nodes w parent nodes
# gdy większość children jest relevantna`,
            query_fusion: `from llama_index.retrievers import QueryFusionRetriever

retriever = QueryFusionRetriever(
    [vector_retriever, bm25_retriever],
    similarity_top_k=3,
    num_queries=3,
    mode="reciprocal_rerank"
)
nodes = retriever.retrieve("Jak działa RAG?")
# Generuje wiele wariantów zapytania i łączy wyniki
# Poprawia recall przez query expansion`
        };
        return snippets[method] || snippets.vector;
    }

    connectedCallback() {
        this.render();
    }
    
    render() {
        const lang = state.lang;
        this.shadowRoot.innerHTML = `
            ${sharedStyles}
            <style>
                select { width:100%; padding:0.5rem; font-family:'Inter', sans-serif; border:2px solid var(--primary); border-radius:4px; margin-bottom:1rem; background:white; }
                .retriever-badge { display:inline-block; padding:0.25rem 0.75rem; border:1px solid #555; font-family:'Inter', sans-serif; font-size:0.7rem; margin:0.25rem; border-radius:4px; background:#333; color:#fff; }
                .retriever-badge.used { background:#555; border-color:#777; }
            </style>
            <div class="stage-layout">
                <div class="info-panel">
                    <h2>${t('stage4Title', lang)}</h2>
                    <p><strong>Mechanizmy Wyszukiwania (Retrievers):</strong><br/>
                    ${t('stage4Desc', lang)}</p>

                    <label>${t('stage4Label', lang)}</label>
                    <select id="retriever-select">
                        <option value="vector">VectorIndexRetriever (KNN cosine)</option>
                        <option value="bm25">BM25Retriever (keyword TF-IDF)</option>
                        <option value="hybrid">Hybrydowy (vector + BM25 + RRF)</option>
                        <option value="recursive">RecursiveRetriever (hierarchiczny)</option>
                        <option value="router">RouterRetriever (LLM wybiera metodę)</option>
                        <optgroup label="Advanced Retrievers">
                            <option value="auto_merging">AutoMergingRetriever (scala child→parent)</option>
                            <option value="query_fusion">QueryFusionRetriever (query expansion)</option>
                        </optgroup>
                    </select>

                    <label>${t('stage4Query', lang)}</label>
                    <input type="text" id="user-query" value="Jak działa RAG w LlamaIndex?" placeholder="Wpisz zapytanie...">
                    
                    <div class="code-block" id="code-snippet">
${this.#getRetrieverSnippet('vector')}
                    </div>
                    <button id="btn-retrieve" ${state.vectorIndex.length === 0 ? 'disabled' : ''}>
                        ${state.vectorIndex.length === 0 ? t('stage4NoIndex', lang) : `${t('stage4Btn', lang)} VectorIndexRetriever`}
                    </button>
                </div>
                <div class="vis-area" style="align-items: flex-start;">
                    <div style="display:flex; width: 100%; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--primary); padding-bottom: 1rem; margin-bottom: 1rem; flex-wrap:wrap; gap:0.5rem;">
                        <div style="background: white; padding: 1rem; border: 2px solid var(--primary); font-family: 'Inter', sans-serif;">
                            <b>Query Vector:</b><br><span id="q-vec" style="color: var(--color-blue);">[...]</span>
                        </div>
                        <div id="method-icon"><i class="fa-solid fa-calculator" style="font-size:2rem; color:#444;"></i></div>
                        <div style="background: white; padding: 1rem; border: 2px solid var(--primary); font-family: 'Inter', sans-serif;">
                            <b>${t('stage4Method', lang)}</b><br><span id="method-label">Cosine Similarity</span>
                        </div>
                    </div>

                    <div id="retriever-badges" style="margin-bottom:0.5rem;"></div>
                    
                    <h3 style="margin-top:0;">${t('stage4RetrievedNodes', lang)}</h3>
                    <div id="retrieved-container" style="display:flex; flex-direction:column; gap:0.5rem; width: 100%;"></div>
                </div>
            </div>
        `;

        const retSel = this.shadowRoot.getElementById('retriever-select');
        retSel.addEventListener('change', () => {
            const m = retSel.value;
            this.shadowRoot.getElementById('code-snippet').textContent = this.#getRetrieverSnippet(m);
            this.shadowRoot.getElementById('btn-retrieve').textContent = `Uruchom ${retSel.options[retSel.selectedIndex].text.split(' ')[0]}`;
            const icons = { vector:'fa-calculator', bm25:'fa-font', hybrid:'fa-shuffle', recursive:'fa-repeat', router:'fa-compass' };
            const labels = { vector:'Cosine KNN', bm25:'BM25/TF-IDF', hybrid:'Vector + Keyword + RRF', recursive:'Hierarchiczny', router:'LLM Selector' };
            this.shadowRoot.getElementById('method-icon').innerHTML = `<i class="fa-solid ${icons[m]||'fa-calculator'}" style="font-size:2rem; color:#444;"></i>`;
            this.shadowRoot.getElementById('method-label').textContent = labels[m] || 'Cosine';
            this.#updateBadges(m);
        });

        this.#updateBadges('vector');
        this.shadowRoot.getElementById('btn-retrieve')?.addEventListener('click', () => this.performRetrieval());
    }

    #updateBadges(method) {
        const container = this.shadowRoot.getElementById('retriever-badges');
        if (!container) return;
        const all = [
            { key:'vector', label:'Vector KNN' },
            { key:'bm25', label:'BM25' },
            { key:'hybrid', label:'RRF Fusion' },
            { key:'recursive', label:'Recursive' },
            { key:'router', label:'LLM Router' }
        ];
        container.innerHTML = all.map(a => 
            `<span class="retriever-badge${method === a.key || (method === 'hybrid' && (a.key === 'vector' || a.key === 'bm25')) ? ' used' : ''}">${a.label}</span>`
        ).join('');
    }

    performRetrieval() {
        const lang = state.lang;
        const query = this.shadowRoot.getElementById('user-query').value;
        const method = this.shadowRoot.getElementById('retriever-select').value;
        state.query = query;
        
        this.shadowRoot.getElementById('q-vec').innerText = `[0.${Math.floor(Math.random()*999)}, 0.${Math.floor(Math.random()*999)}...]`;
        
        const container = this.shadowRoot.getElementById('retrieved-container');
        container.innerHTML = '';

        const topK = Math.min(method === 'hybrid' ? 4 : 3, state.vectorIndex.length);
        const shuffled = [...state.vectorIndex].sort(() => 0.5 - Math.random());
        
        // Różne strategie scoringu
        const scoreRanges = {
            vector: [0.6, 0.9],
            bm25: [0.3, 0.7],
            hybrid: [0.5, 0.95],
            recursive: [0.4, 0.85],
            router: [0.55, 0.88]
        };
        const [minScore, maxScore] = scoreRanges[method] || [0.6, 0.9];
        
        state.retrievedNodes = shuffled.slice(0, topK).map((n, i) => ({
            ...n,
            score: (Math.random() * (maxScore - minScore) + minScore).toFixed(2),
            retrieverMethod: method
        })).sort((a,b) => b.score - a.score);

        const colors = { 
            vector: 'var(--retriever-vector-bg)', 
            bm25: 'var(--retriever-bm25-bg)', 
            hybrid: 'var(--retriever-hybrid-bg)', 
            recursive: 'var(--retriever-recursive-bg)', 
            router: 'var(--retriever-router-bg)' 
        };
        const borderColors = { 
            vector: 'var(--retriever-vector-border)', 
            bm25: 'var(--retriever-bm25-border)', 
            hybrid: 'var(--retriever-hybrid-border)', 
            recursive: 'var(--retriever-recursive-border)', 
            router: 'var(--retriever-router-border)' 
        };

        state.retrievedNodes.forEach((node, idx) => {
            setTimeout(() => {
                const el = document.createElement('div');
                el.className = 'node-item';
                el.style.display = 'flex';
                el.style.justifyContent = 'space-between';
                el.style.background = colors[method] || 'var(--retriever-vector-bg)';
                el.style.borderColor = borderColors[method] || 'var(--retriever-vector-border)';
                el.innerHTML = `
                    <span><b>${node.id}</b> (${t('stage4FromDoc', lang)} ${node.parentId})</span>
                    <span style="color: ${borderColors[method]}; font-weight: bold;">${t('stage4Score', lang)} ${node.score}</span>
                `;
                container.appendChild(el);
            }, idx * 400);
        });

        const btn = this.shadowRoot.getElementById('btn-retrieve');
        btn.textContent = `${t('stage4Retrieved', lang)} (${state.retrievedNodes.length} ${t('stage4Nodes', lang)}) [${t('goToNext', lang)} →]`;
        btn.style.background = 'var(--success)';
        btn.onclick = () => document.querySelector('.step-indicator[data-step="5"]').click();
    }
}
customElements.define('stage-retrieval', StageRetrieval);
