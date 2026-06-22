import { state, sharedStyles } from './state.js';
import { t } from './i18n.js';

// --- STAGE 3: INDEXING ---
class StageIndexing extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    #getIndexSnippet(method) {
        const snippets = {
            vector: `from llama_index import VectorStoreIndex
from llama_index.vector_stores import ChromaVectorStore
import chromadb

db = chromadb.PersistentClient(path="./chroma_db")
chroma_collection = db.create_collection("rag_docs")
vector_store = ChromaVectorStore(chroma_collection=chroma_collection)

index = VectorStoreIndex(nodes, vector_store=vector_store)
index.storage_context.persist()
# Cosine similarity — wyszukiwanie semantyczne`,
            summary: `from llama_index import SummaryIndex

index = SummaryIndex(nodes)
# Prosta lista sekwencyjna — dobre dla małych zbiorów
# Każdy węzeł jest przetwarzany liniowo`,
            keyword: `from llama_index import KeywordTableIndex

index = KeywordTableIndex(nodes)
# Buduje mapę: słowo kluczowe → lista węzłów
# Szybkie wyszukiwanie po dokładnych terminach`,
            tree: `from llama_index import TreeIndex

index = TreeIndex(nodes)
# Hierarchiczna struktura drzewa summary
# Top-down browsing z agregacją`,
            knowledge: `from llama_index import KnowledgeGraphIndex

index = KnowledgeGraphIndex(nodes)
# Graf: encja → relacja → encja
# Multi-hop reasoning przez połączone węzły`
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
                select { width:100%; padding:0.5rem; font-family:monospace; border:2px solid #0f172a; border-radius:4px; margin-bottom:1rem; background:white; }
                .vector-store {
                    display: grid; grid-template-columns: repeat(4, 1fr);
                    gap: 10px; background: white; padding: 20px;
                    border: 2px solid #0f172a; border-radius: 4px;
                    perspective: 800px;
                    transform-style: preserve-3d;
                    box-shadow: -10px 20px 0 rgba(15, 23, 42, 0.1);
                }
                .index-vis { transition: all 0.5s; }
                .v-cell {
                    width: 60px; height: 60px;
                    border: 1px dashed #cbd5e1;
                    background: rgba(255,255,255,0.8);
                    display: flex; align-items: center; justify-content: center;
                    font-family: monospace; font-size: 0.55rem; color: #94a3b8;
                    transition: all 0.4s; transform: translateZ(0);
                    text-align:center; word-break:break-all;
                }
                .v-cell.filled-vector { background: #3b82f6; color: white; border: 2px solid #1e3a8a; transform: translateZ(20px); box-shadow: -5px 5px 10px rgba(0,0,0,0.3); }
                .v-cell.filled-summary { background: #10b981; color: white; border: 2px solid #065f46; }
                .v-cell.filled-keyword { background: #f59e0b; color: white; border: 2px solid #92400e; }
                .v-cell.filled-tree { background: #8b5cf6; color: white; border: 2px solid #5b21b6; transform: translateZ(15px); }
                .v-cell.filled-knowledge { background: #ec4899; color: white; border: 2px solid #9d174d; transform: translateZ(25px); border-radius:50%; }
                .index-stats { font-family:monospace; margin-top:1rem; padding:0.5rem 1rem; background:white; border:2px dashed #0f172a; }
            </style>
            <div class="stage-layout">
                <div class="info-panel">
                    <h2>${t('stage3Title', lang)}</h2>
                    <p><strong>Indeksy:</strong> ${t('stage3Desc', lang)}</p>

                    <label>${t('stage3Label', lang)}</label>
                    <select id="index-select">
                        <option value="vector">VectorStoreIndex (cosine similarity)</option>
                        <option value="summary">SummaryIndex (lista sekwencyjna)</option>
                        <option value="keyword">KeywordTableIndex (mapa słów kluczowych)</option>
                        <option value="tree">TreeIndex (hierarchiczne drzewo)</option>
                        <option value="knowledge">KnowledgeGraphIndex (graf wiedzy)</option>
                    </select>

                    <div class="code-block" id="code-snippet">
${this.#getIndexSnippet('vector')}
                    </div>
                    <button id="btn-index" ${state.nodes.length === 0 ? 'disabled' : ''}>
                        ${state.nodes.length === 0 ? t('stage3NoNodes', lang) : `${t('stage3Btn', lang)} VectorStoreIndex`}
                    </button>
                </div>
                <div class="vis-area">
                    <h3 style="position:absolute; top:20px; left:20px; margin:0; font-family:monospace;" id="index-title">${t('stage3VectorDb', lang)}</h3>
                    <div class="vector-store" id="v-store">
                        ${Array(16).fill('<div class="v-cell">[...]</div>').join('')}
                    </div>
                    <div class="index-stats" id="index-stats"></div>
                </div>
            </div>
        `;

        const idxSel = this.shadowRoot.getElementById('index-select');
        idxSel.addEventListener('change', () => {
            const m = idxSel.value;
            this.shadowRoot.getElementById('code-snippet').textContent = this.#getIndexSnippet(m);
            this.shadowRoot.getElementById('btn-index').textContent = `${t('stage3Btn', lang)} ${idxSel.options[idxSel.selectedIndex].text.split(' ')[0]}`;
            const titles = { vector:'Vector Database (Cosine)', summary:'Summary List', keyword:'Keyword → Node Map', tree:'Hierarchical Tree', knowledge:'Knowledge Graph' };
            this.shadowRoot.getElementById('index-title').textContent = titles[m] || 'Index';
        });

        this.shadowRoot.getElementById('btn-index')?.addEventListener('click', () => this.performIndexing());
    }

    performIndexing() {
        const lang = state.lang;
        const cells = this.shadowRoot.querySelectorAll('.v-cell');
        const method = this.shadowRoot.getElementById('index-select').value;
        state.vectorIndex = [...state.nodes];

        const fillClass = `filled-${method}`;
        
        state.vectorIndex.forEach((node, idx) => {
            node.embedding = `[0.${Math.floor(Math.random()*99)}...]`;
            node.indexType = method;

            if(idx < cells.length) {
                setTimeout(() => {
                    cells[idx].className = `v-cell ${fillClass}`;
                    if (method === 'knowledge') {
                        cells[idx].innerHTML = `${node.id}`;
                    } else if (method === 'keyword') {
                        const kw = ['RAG','LLM','wektor','indeks','embedding','GPU','token','prompt'][idx % 8];
                        cells[idx].innerHTML = `🔑<br>${kw}`;
                    } else if (method === 'tree') {
                        cells[idx].innerHTML = `${node.id}`;
                    } else {
                        cells[idx].innerHTML = `${node.id}<br>${node.embedding}`;
                    }
                }, idx * 200);
            }
        });

        const methodNames = { vector:'VectorStoreIndex (Cosine)', summary:'SummaryIndex', keyword:'KeywordTableIndex', tree:'TreeIndex', knowledge:'KnowledgeGraphIndex' };
        const descs = { vector:'Cosine similarity', summary:'Lista sekwencyjna', keyword:'Mapa słów kluczowych', tree:'Struktura drzewiasta', knowledge:'Graf encja-relacja' };
        this.shadowRoot.getElementById('index-stats').innerHTML = 
            `<strong>${methodNames[method]}</strong><br>
             ${t('stage3Indexed', lang)}: ${state.vectorIndex.length} ${t('stage2Nodes', lang)}<br>
             ${t('stage3Type', lang)}: ${descs[method]}`;

        const btn = this.shadowRoot.getElementById('btn-index');
        btn.textContent = `${t('stage3Ready', lang)} [${t('goToNext', lang)} →]`;
        btn.style.background = '#10b981';
        btn.onclick = () => document.querySelector('.step-indicator[data-step="4"]').click();
    }
}
customElements.define('stage-indexing', StageIndexing);
