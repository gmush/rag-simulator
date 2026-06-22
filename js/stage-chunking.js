import { state, sharedStyles } from './state.js';
import { t } from './i18n.js';

// --- STAGE 2: CHUNKING ---
class StageChunking extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    #getSplitterSnippet(method) {
        const snippets = {
            simple: `from llama_index.node_parser import SimpleNodeParser

parser = SimpleNodeParser.from_defaults(
    chunk_size=1024,
    chunk_overlap=200
)
nodes = parser.get_nodes_from_documents(docs)
# Dzieli dokumenty na固定 rozmiaru tokenowego`,
            sentence: `from llama_index.node_parser import SentenceSplitter

splitter = SentenceSplitter(
    chunk_size=1024,
    chunk_overlap=200,
    paragraph_separator="\\n\\n"
)
nodes = splitter.get_nodes_from_documents(docs)
# Dzieli po granicach zdań — zachowuje semantykę`,
            hierarchical: `from llama_index.node_parser import HierarchicalNodeParser

parser = HierarchicalNodeParser.from_defaults(
    chunk_sizes=[2048, 1024, 512]
)
nodes = parser.get_nodes_from_documents(docs)
# Tworzy 3-poziomową hierarchię: parent->child->grandchild`,
            code: `from llama_index.node_parser import CodeSplitter

splitter = CodeSplitter(
    language="python",
    chunk_lines=40,
    max_chars=1500
)
nodes = splitter.get_nodes_from_documents(docs)
# Dzieli kod wg funkcji/klas — nie rozcina składni`,
            semantic: `from llama_index.node_parser import SemanticSplitterNodeParser

splitter = SemanticSplitterNodeParser(
    embed_model=embed_model,
    breakpoint_percentile_threshold=95
)
nodes = splitter.get_nodes_from_documents(docs)
# Dzieli tam, gdzie similarity między zdaniami spada`,
            summary_extractor: `from llama_index.extractors import SummaryExtractor
from llama_index.ingestion import IngestionPipeline

extractor = SummaryExtractor(
    llm=llm,
    summaries=["self"],
    prompt_template="Summarize: {context_str}"
)

pipeline = IngestionPipeline(
    transformations=[
        SentenceSplitter(),
        extractor,
    ]
)
nodes = pipeline.run(documents=docs)
# Ekstrahuje podsumowania do metadata każdego node`,
            qa_extractor: `from llama_index.extractors import QuestionsAnsweredExtractor

extractor = QuestionsAnsweredExtractor(
    llm=llm,
    questions=3,
)

pipeline = IngestionPipeline(
    transformations=[
        SentenceSplitter(),
        extractor,
    ]
)
nodes = pipeline.run(documents=docs)
# Generuje pytania, na które odpowiada node — poprawia retrieval`,
            title_extractor: `from llama_index.extractors import TitleExtractor

extractor = TitleExtractor(
    llm=llm,
    nodes=5,  # liczba pierwszych nodes do analizy
)

pipeline = IngestionPipeline(
    transformations=[
        SentenceSplitter(),
        extractor,
    ]
)
nodes = pipeline.run(documents=docs)
# Ekstrahuje tytuł dokumentu do metadata`,
            keyword_extractor: `from llama_index.extractors import KeywordExtractor

extractor = KeywordExtractor(
    llm=llm,
    keywords=10,
)

pipeline = IngestionPipeline(
    transformations=[
        SentenceSplitter(),
        extractor,
    ]
)
nodes = pipeline.run(documents=docs)
# Ekstrahuje słowa kluczowe do metadata — poprawia keyword search`
        };
        return snippets[method] || snippets.simple;
    }

    connectedCallback() {
        this.render();
    }
    
    render() {
        const lang = state.lang;
        this.shadowRoot.innerHTML = `
            ${sharedStyles}
            <style>
                select { width:100%; padding:0.5rem; font-family:'Inter', sans-serif; border:2px solid #0f172a; border-radius:4px; margin-bottom:1rem; background:white; }
                .hier-node { border-left:4px solid #8b5cf6 !important; padding-left:1rem; }
                .hier-node.l2 { margin-left:20px; border-left-color:#a78bfa !important; }
                .hier-node.l3 { margin-left:40px; border-left-color:#c4b5fd !important; }
                .chunk-label { font-family:'Inter', sans-serif; font-size:0.7rem; color:#64748b; margin-top:0.25rem; }
            </style>
            <div class="stage-layout">
                <div class="info-panel">
                    <h2>${t('stage2Title', lang)}</h2>
                    <p><strong>Node Parsers:</strong><br/>
                    ${t('stage2Desc1', lang)} <code>Document</code> ${t('stage2Desc2', lang)}</p>

                    <label>${t('stage2Label', lang)}</label>
                    <select id="splitter-select">
                        <option value="simple">SimpleNodeParser (stały rozmiar tokenowy)</option>
                        <option value="sentence">SentenceSplitter (granice zdań)</option>
                        <option value="hierarchical">HierarchicalNodeParser (parent→child)</option>
                        <option value="code">CodeSplitter (świadomy składni kodu)</option>
                        <option value="semantic">SemanticSplitterNodeParser (podobieństwo)</option>
                        <optgroup label="Metadata Extractors">
                            <option value="summary_extractor">SummaryExtractor (podsumowania)</option>
                            <option value="qa_extractor">QuestionsAnsweredExtractor (Q&A)</option>
                            <option value="title_extractor">TitleExtractor (tytuły)</option>
                            <option value="keyword_extractor">KeywordExtractor (słowa kluczowe)</option>
                        </optgroup>
                    </select>

                    <label>${t('stage2ChunkSize', lang)} <span id="val-size">1024</span></label>
                    <input type="range" id="chunk-size" min="256" max="2048" step="256" value="1024">
                    
                    <label>${t('stage2ChunkOverlap', lang)} <span id="val-overlap">20</span>%</label>
                    <input type="range" id="chunk-overlap" min="0" max="50" step="10" value="20">

                    <div class="code-block" id="code-snippet">
${this.#getSplitterSnippet('simple')}
                    </div>
                    <button id="btn-split" ${state.documents.length === 0 ? 'disabled' : ''}>
                        ${state.documents.length === 0 ? t('stage2NoDocs', lang) : t('stage2Btn', lang)}
                    </button>
                </div>
                <div class="vis-area" style="flex-direction: row; align-items: flex-start; overflow-y: auto;">
                    <div style="flex: 1; border-right: 2px dashed #64748b; padding-right: 1rem;">
                        <h3>${t('stage2Documents', lang)}</h3>
                        <div id="docs-container" style="display: flex; flex-direction: column; gap: 1rem;">
                            ${state.documents.length === 0 ? `<p style="color:red">${t('stage2BackToStep1', lang)}</p>` : ''}
                        </div>
                    </div>
                    <div style="padding: 2rem; font-size: 2rem; text-align:center;" id="splitter-icon">
                        ⚙️<br><small style="font-size:0.8rem; font-family:'Inter', sans-serif;">TextSplitter</small>
                    </div>
                    <div style="flex: 1; padding-left: 1rem;">
                        <h3>${t('stage2TextNodes', lang)}</h3>
                        <div id="nodes-container" style="display: flex; flex-wrap: wrap; gap: 0.5rem;"></div>
                        <div id="nodes-stats" style="font-family:'Inter', sans-serif; font-size:0.8rem; color:#475569; margin-top:0.5rem;"></div>
                    </div>
                </div>
            </div>
        `;

        if(state.documents.length > 0) {
            const docsContainer = this.shadowRoot.getElementById('docs-container');
            state.documents.forEach(d => {
                docsContainer.innerHTML += `<div class="doc-item">Document [${d.id}]<br><small style="color:#64748b;">${d.metadata?.source || ''}</small></div>`;
            });
        }

        const splitterSel = this.shadowRoot.getElementById('splitter-select');
        splitterSel.addEventListener('change', () => {
            this.shadowRoot.getElementById('code-snippet').textContent = this.#getSplitterSnippet(splitterSel.value);
            const iconMap = { simple:'⚙️', sentence:'📝', hierarchical:'🌳', code:'💻', semantic:'🧠' };
            this.shadowRoot.getElementById('splitter-icon').innerHTML = 
                `${iconMap[splitterSel.value]||'⚙️'}<br><small style="font-size:0.8rem;font-family:'Inter', sans-serif;">${splitterSel.options[splitterSel.selectedIndex].text.split(' ')[0]}</small>`;
        });

        this.shadowRoot.getElementById('chunk-size')?.addEventListener('input', (e) => {
            this.shadowRoot.getElementById('val-size').textContent = e.target.value;
        });
        this.shadowRoot.getElementById('chunk-overlap')?.addEventListener('input', (e) => {
            this.shadowRoot.getElementById('val-overlap').textContent = e.target.value;
        });
        
        this.shadowRoot.getElementById('btn-split')?.addEventListener('click', () => this.performChunking());
    }

    performChunking() {
        const nodesContainer = this.shadowRoot.getElementById('nodes-container');
        nodesContainer.innerHTML = '';
        state.nodes = [];
        
        const method = this.shadowRoot.getElementById('splitter-select').value;
        const chunkSize = parseInt(this.shadowRoot.getElementById('chunk-size').value);
        let nodeIdCounter = 1;

        const strategies = {
            simple: () => {
                state.documents.forEach(doc => {
                    const numChunks = Math.floor(Math.random() * 3) + 2;
                    for(let i=0; i<numChunks; i++) {
                        state.nodes.push({ id: `node_${nodeIdCounter++}`, parentId: doc.id, text: `[Token ${chunkSize}] Fragment ${i+1} z ${doc.id}`, embedding: null, level: 0 });
                    }
                });
            },
            sentence: () => {
                state.documents.forEach(doc => {
                    const numChunks = Math.floor(Math.random() * 4) + 3;
                    for(let i=0; i<numChunks; i++) {
                        state.nodes.push({ id: `sent_${nodeIdCounter++}`, parentId: doc.id, text: `Zdanie ${i+1}: fragment semantyczny...`, embedding: null, level: 0 });
                    }
                });
            },
            hierarchical: () => {
                state.documents.forEach(doc => {
                    const parentCount = Math.floor(Math.random() * 2) + 1;
                    for(let p=0; p<parentCount; p++) {
                        const parentId = `hier_parent_${nodeIdCounter++}`;
                        state.nodes.push({ id: parentId, parentId: doc.id, text: `[Poziom 1] Sekcja ${p+1} z ${doc.id}`, embedding: null, level: 1 });
                        const childCount = Math.floor(Math.random() * 3) + 2;
                        for(let c=0; c<childCount; c++) {
                            state.nodes.push({ id: `hier_child_${nodeIdCounter++}`, parentId: parentId, text: `[Poziom 2] Podsekcja ${c+1}`, embedding: null, level: 2 });
                        }
                    }
                });
            },
            code: () => {
                state.documents.forEach(doc => {
                    const funcs = ['def load_data()', 'class VectorStore', 'def embed_text()', 'async def query()'];
                    const numChunks = Math.min(funcs.length, Math.floor(Math.random() * 3) + 2);
                    for(let i=0; i<numChunks; i++) {
                        state.nodes.push({ id: `code_${nodeIdCounter++}`, parentId: doc.id, text: `${funcs[i]}:\n    # ...`, embedding: null, level: 0, language: 'python' });
                    }
                });
            },
            semantic: () => {
                state.documents.forEach(doc => {
                    const numChunks = Math.floor(Math.random() * 2) + 2;
                    const topics = ['Wprowadzenie', 'Architektura', 'Implementacja', 'Wnioski'];
                    for(let i=0; i<numChunks; i++) {
                        state.nodes.push({ id: `sem_${nodeIdCounter++}`, parentId: doc.id, text: `[Temat: ${topics[i]}] - ${doc.id}`, embedding: null, level: 0, topic: topics[i] });
                    }
                });
            }
        };

        (strategies[method] || strategies.simple)();

        state.nodes.forEach((node, idx) => {
            setTimeout(() => {
                const el = document.createElement('div');
                el.className = 'node-item';
                if (node.level === 1) el.classList.add('hier-node');
                if (node.level === 2) el.classList.add('hier-node', 'l2');
                
                let label = `<b>${node.id}</b><br><small>parent:${node.parentId}</small>`;
                if (node.topic) label += `<div class="chunk-label">${node.topic}</div>`;
                if (node.language) label += `<div class="chunk-label">🐍 ${node.language}</div>`;
                el.innerHTML = label;
                
                el.style.transform = 'scale(0.5)';
                el.style.opacity = '0';
                el.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                nodesContainer.appendChild(el);
                requestAnimationFrame(() => {
                    el.style.transform = 'scale(1)';
                    el.style.opacity = '1';
                });
            }, idx * 150);
        });

        const rootNodes = state.nodes.filter(n => n.level === 0 || !n.level).length;
        const totalNodes = state.nodes.length;
        const methodName = this.shadowRoot.getElementById('splitter-select').options[this.shadowRoot.getElementById('splitter-select').selectedIndex].text.split(' ')[0];
        this.shadowRoot.getElementById('nodes-stats').textContent = 
            `${t('stage2Created', lang)} ${totalNodes} ${t('stage2Nodes', lang)} (${rootNodes} ${t('stage2RootNodes', lang)}) — ${methodName}`;

        const btn = this.shadowRoot.getElementById('btn-split');
        btn.textContent = `${t('stage2Created', lang)} (${totalNodes}) [${t('goToNext', lang)} →]`;
        btn.style.background = '#10b981';
        btn.onclick = () => document.querySelector('.step-indicator[data-step="3"]').click();
    }
}
customElements.define('stage-chunking', StageChunking);
