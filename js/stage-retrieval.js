import { state, sharedStyles } from './state.js';

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
# LLM wybiera najlepszy retriever dla zapytania`
        };
        return snippets[method] || snippets.vector;
    }

    connectedCallback() {
        this.render();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            ${sharedStyles}
            <style>
                select { width:100%; padding:0.5rem; font-family:monospace; border:2px solid #0f172a; border-radius:4px; margin-bottom:1rem; background:white; }
                .retriever-badge { display:inline-block; padding:0.25rem 0.75rem; border:2px solid #0f172a; font-family:monospace; font-size:0.7rem; margin:0.25rem; border-radius:4px; }
                .retriever-badge.used { background:#dbeafe; border-color:#3b82f6; }
            </style>
            <div class="stage-layout">
                <div class="info-panel">
                    <h2>Krok 4: Wyszukiwanie (Retrieval)</h2>
                    <p><strong>Mechanizmy Wyszukiwania (Retrievers):</strong><br/>
                    Konwersja zapytania użytkownika na wektor. Matematyczne porównanie z wektorami w bazie. Pobiera top-k pasujących węzłów.</p>

                    <label>Typ Retrievera:</label>
                    <select id="retriever-select">
                        <option value="vector">VectorIndexRetriever (KNN cosine)</option>
                        <option value="bm25">BM25Retriever (keyword TF-IDF)</option>
                        <option value="hybrid">Hybrydowy (vector + BM25 + RRF)</option>
                        <option value="recursive">RecursiveRetriever (hierarchiczny)</option>
                        <option value="router">RouterRetriever (LLM wybiera metodę)</option>
                    </select>

                    <label>Zapytanie użytkownika:</label>
                    <input type="text" id="user-query" value="Jak działa RAG w LlamaIndex?" placeholder="Wpisz zapytanie...">
                    
                    <div class="code-block" id="code-snippet">
${this.#getRetrieverSnippet('vector')}
                    </div>
                    <button id="btn-retrieve" ${state.vectorIndex.length === 0 ? 'disabled' : ''}>
                        ${state.vectorIndex.length === 0 ? 'Brak indeksu z kroku 3' : 'Uruchom VectorIndexRetriever'}
                    </button>
                </div>
                <div class="vis-area" style="align-items: flex-start;">
                    <div style="display:flex; width: 100%; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 1rem; margin-bottom: 1rem; flex-wrap:wrap; gap:0.5rem;">
                        <div style="background: white; padding: 1rem; border: 2px solid #0f172a; font-family: monospace;">
                            <b>Query Vector:</b><br><span id="q-vec" style="color: #3b82f6;">[...]</span>
                        </div>
                        <div style="font-size: 1.5rem;" id="method-icon">🧮</div>
                        <div style="background: white; padding: 1rem; border: 2px solid #0f172a; font-family: monospace;">
                            <b>Metoda</b><br><span id="method-label">Cosine Similarity</span>
                        </div>
                    </div>

                    <div id="retriever-badges" style="margin-bottom:0.5rem;"></div>
                    
                    <h3 style="margin-top:0;">Retrieved Nodes (Top-K)</h3>
                    <div id="retrieved-container" style="display:flex; flex-direction:column; gap:0.5rem; width: 100%;"></div>
                </div>
            </div>
        `;

        const retSel = this.shadowRoot.getElementById('retriever-select');
        retSel.addEventListener('change', () => {
            const m = retSel.value;
            this.shadowRoot.getElementById('code-snippet').textContent = this.#getRetrieverSnippet(m);
            this.shadowRoot.getElementById('btn-retrieve').textContent = `Uruchom ${retSel.options[retSel.selectedIndex].text.split(' ')[0]}`;
            const icons = { vector:'🧮', bm25:'🔤', hybrid:'🔀', recursive:'🔄', router:'🧭' };
            const labels = { vector:'Cosine KNN', bm25:'BM25/TF-IDF', hybrid:'Vector + Keyword + RRF', recursive:'Hierarchiczny', router:'LLM Selector' };
            this.shadowRoot.getElementById('method-icon').textContent = icons[m] || '🧮';
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

        const colors = { vector:'#fef3c7', bm25:'#e0f2fe', hybrid:'#f3e8ff', recursive:'#ffe4e6', router:'#d1fae5' };
        const borderColors = { vector:'#d97706', bm25:'#0284c7', hybrid:'#7c3aed', recursive:'#e11d48', router:'#059669' };

        state.retrievedNodes.forEach((node, idx) => {
            setTimeout(() => {
                const el = document.createElement('div');
                el.className = 'node-item';
                el.style.display = 'flex';
                el.style.justifyContent = 'space-between';
                el.style.background = colors[method] || '#fef3c7';
                el.style.borderColor = borderColors[method] || '#d97706';
                el.innerHTML = `
                    <span><b>${node.id}</b> (z dokumentu ${node.parentId})</span>
                    <span style="color: ${borderColors[method]}; font-weight: bold;">Score: ${node.score}</span>
                `;
                container.appendChild(el);
            }, idx * 400);
        });

        const btn = this.shadowRoot.getElementById('btn-retrieve');
        btn.textContent = `Pobrano Kontekst (${state.retrievedNodes.length} węzłów) [Przejdź dalej →]`;
        btn.style.background = '#10b981';
        btn.onclick = () => document.querySelector('.step-indicator[data-step="5"]').click();
    }
}
customElements.define('stage-retrieval', StageRetrieval);
