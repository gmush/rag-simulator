import { state, sharedStyles } from './state.js';
import { t } from './i18n.js';

// --- STAGE 2: CHUNKING + METADATA EXTRACTION ---
class StageChunking extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    #getPipelineSnippet(splitter, extractor) {
        const splitterImports = {
            simple:       `from llama_index.node_parser import SimpleNodeParser`,
            sentence:     `from llama_index.node_parser import SentenceSplitter`,
            hierarchical: `from llama_index.node_parser import HierarchicalNodeParser`,
            code:         `from llama_index.node_parser import CodeSplitter`,
            semantic:     `from llama_index.node_parser import SemanticSplitterNodeParser`
        };
        const splitterInits = {
            simple:       `SimpleNodeParser.from_defaults(chunk_size=1024, chunk_overlap=200)`,
            sentence:     `SentenceSplitter(chunk_size=1024, chunk_overlap=200)`,
            hierarchical:`HierarchicalNodeParser.from_defaults(chunk_sizes=[2048, 1024, 512])`,
            code:         `CodeSplitter(language="python", chunk_lines=40)`,
            semantic:     `SemanticSplitterNodeParser(embed_model=embed_model, breakpoint_percentile_threshold=95)`
        };

        const extractorImport = {
            summary:  `from llama_index.extractors import SummaryExtractor`,
            qa:       `from llama_index.extractors import QuestionsAnsweredExtractor`,
            title:    `from llama_index.extractors import TitleExtractor`,
            entities: `from llama_index.extractors import EntityExtractor`,
            keyword:  `from llama_index.extractors import KeywordExtractor`
        };
        const extractorInit = {
            summary:  `SummaryExtractor(llm=llm, summaries=["self"])`,
            qa:       `QuestionsAnsweredExtractor(llm=llm, questions=3)`,
            title:    `TitleExtractor(llm=llm, nodes=5)`,
            entities: `EntityExtractor(llm=llm, prediction_threshold=0.5)`,
            keyword:  `KeywordExtractor(llm=llm, keywords=10)`
        };

        const lines = [splitterImports[splitter] || splitterImports.simple];
        if (extractor && extractor !== 'none') {
            lines.push(extractorImport[extractor]);
        }
        lines.push(`from llama_index.ingestion import IngestionPipeline`);
        lines.push('');
        lines.push(`pipeline = IngestionPipeline(`);
        lines.push(`    transformations=[`);
        lines.push(`        ${splitterInits[splitter] || splitterInits.simple},`);
        if (extractor && extractor !== 'none') {
            lines.push(`        ${extractorInit[extractor]},`);
        }
        lines.push(`    ]`);
        lines.push(`)`);
        lines.push(`nodes = pipeline.run(documents=docs)`);
        if (!extractor || extractor === 'none') {
            lines.push(`# Chunking: dzieli dokument na node'y o stałym rozmiarze`);
        } else {
            lines.push(`# Chunking dzieli, extractor dodaje metadata — dwie oddzielne warstwy`);
        }
        return lines.join('\n');
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const lang = state.lang;
        this.shadowRoot.innerHTML = `
            ${sharedStyles}
            <style>
                select { width:100%; padding:0.5rem; font-family:'Inter', sans-serif; border:1px solid #cccccc; border-radius:4px; margin-bottom:0.75rem; background:white; font-size:0.85rem; }
                .hier-node { border-left:4px solid var(--chunk-hier-l1) !important; padding-left:1rem; }
                .hier-node.l2 { margin-left:20px; border-left-color:var(--chunk-hier-l2) !important; }
                .hier-node.l3 { margin-left:40px; border-left-color:var(--chunk-hier-l3) !important; }
                .chunk-label { font-family:'Inter', sans-serif; font-size:0.7rem; color:var(--color-muted); margin-top:0.25rem; }
                .meta-badge { display:inline-block; padding:1px 6px; margin:2px; border-radius:3px; font-size:0.65rem; font-family:'Inter', sans-serif; background:#444; color:#fff; }
                .meta-badge.summary { background:#444; }
                .meta-badge.questions { background:#555; }
                .meta-badge.title { background:#666; }
                .meta-badge.entities { background:#777; }
                .meta-badge.keyword { background:#333; }
                .extractor-box { border:1px solid #cccccc; padding:1rem; border-radius:4px; text-align:center; background:#fff; min-width:80px; }
                .extractor-box.active { border-color:#555; background:#f5f5f5; }
                .extractor-box.skipped { border-style:dashed; opacity:0.5; }
                .pipeline-arrow { font-size:1.5rem; color:#999; display:flex; align-items:center; }
            </style>
            <div class="stage-layout">
                <div class="info-panel">
                    <h2>${t('stage2Title', lang)}</h2>
                    <p>${t('stage2Desc1', lang)}</p>
                    <p>${t('stage2Desc2', lang)}</p>
                    <p style="font-size:0.85rem; color:var(--color-muted);"><em>${t('stage2MetaNote', lang)}</em></p>

                    <label style="margin-top:0.5rem;">${t('stage2SplitterLabel', lang)}</label>
                    <select id="splitter-select">
                        <option value="simple">SimpleNodeParser (stały rozmiar tokenowy)</option>
                        <option value="sentence">SentenceSplitter (granice zdań)</option>
                        <option value="hierarchical">HierarchicalNodeParser (parent→child)</option>
                        <option value="code">CodeSplitter (świadomy składni kodu)</option>
                        <option value="semantic">SemanticSplitterNodeParser (podobieństwo)</option>
                    </select>

                    <label>${t('stage2ExtractorLabel', lang)}</label>
                    <select id="extractor-select">
                        <option value="none">${t('stage2ExtractorNone', lang)}</option>
                        <option value="summary">SummaryExtractor (podsumowania)</option>
                        <option value="qa">QuestionsAnsweredExtractor (pytania)</option>
                        <option value="title">TitleExtractor (tytuł dokumentu)</option>
                        <option value="entities">EntityExtractor (encje)</option>
                        <option value="keyword">KeywordExtractor (słowa kluczowe)</option>
                    </select>

                    <label>${t('stage2ChunkSize', lang)} <span id="val-size">1024</span></label>
                    <input type="range" id="chunk-size" min="256" max="2048" step="256" value="1024">

                    <label>${t('stage2ChunkOverlap', lang)} <span id="val-overlap">20</span>%</label>
                    <input type="range" id="chunk-overlap" min="0" max="50" step="10" value="20">

                    <div class="code-block" id="code-snippet">
${this.#getPipelineSnippet('simple', 'none')}
                    </div>
                    <button id="btn-split" ${state.documents.length === 0 ? 'disabled' : ''}>
                        ${state.documents.length === 0 ? t('stage2NoDocs', lang) : t('stage2Btn', lang)}
                    </button>
                </div>
                <div class="vis-area" style="flex-direction: column; overflow-y: auto; align-items: stretch;">
                    <!-- Pipeline flow: Documents → Splitter → Extractor → Nodes -->
                    <div style="display:flex; align-items:center; justify-content:center; gap:1rem; flex-wrap:wrap; padding:1rem 0;">
                        <div style="text-align:center;">
                            <div style="font-weight:bold; font-family:'Inter', sans-serif; font-size:0.8rem; margin-bottom:0.5rem;">${t('stage2Documents', lang)}</div>
                            <div id="docs-mini" style="display:flex; flex-direction:column; gap:4px;">
                                ${state.documents.length === 0 ? `<div style="color:#999; font-size:0.75rem; font-family:'Inter', sans-serif;">${t('stage2BackToStep1', lang)}</div>` : ''}
                            </div>
                        </div>
                        <div class="pipeline-arrow">→</div>
                        <div style="text-align:center;" id="splitter-icon">
                            <i class="fa-solid fa-gear" style="font-size:2rem; color:#444;"></i><br>
                            <small style="font-family:'Inter', sans-serif; font-size:0.7rem;">Splitter</small>
                        </div>
                        <div class="pipeline-arrow">→</div>
                        <div style="text-align:center;" id="extractor-box">
                            <div class="extractor-box skipped" id="extractor-vis">
                                <i class="fa-solid fa-circle-xmark" style="font-size:2rem; color:#999;"></i><br>
                                <small style="font-family:'Inter', sans-serif; font-size:0.7rem;">${t('stage2SkipExtractor', lang)}</small>
                            </div>
                        </div>
                        <div class="pipeline-arrow">→</div>
                        <div style="text-align:center;">
                            <div style="font-weight:bold; font-family:'Inter', sans-serif; font-size:0.8rem; margin-bottom:0.5rem;">${t('stage2TextNodes', lang)}</div>
                            <div id="nodes-container" style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content:center;"></div>
                            <div id="nodes-stats" style="font-family:'Inter', sans-serif; font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (state.documents.length > 0) {
            const docsMini = this.shadowRoot.getElementById('docs-mini');
            state.documents.forEach(d => {
                docsMini.innerHTML += `<div class="doc-item" style="font-size:0.7rem; padding:0.3rem 0.5rem; margin:0;">${d.id}</div>`;
            });
        }

        const splitterSel = this.shadowRoot.getElementById('splitter-select');
        const extractorSel = this.shadowRoot.getElementById('extractor-select');

        const updateUI = () => {
            const s = splitterSel.value;
            const e = extractorSel.value;
            this.shadowRoot.getElementById('code-snippet').textContent = this.#getPipelineSnippet(s, e);
            this.#updateSplitterIcon(s);
            this.#updateExtractorVis(e);
        };

        splitterSel.addEventListener('change', updateUI);
        extractorSel.addEventListener('change', updateUI);

        this.shadowRoot.getElementById('chunk-size')?.addEventListener('input', (e) => {
            this.shadowRoot.getElementById('val-size').textContent = e.target.value;
        });
        this.shadowRoot.getElementById('chunk-overlap')?.addEventListener('input', (e) => {
            this.shadowRoot.getElementById('val-overlap').textContent = e.target.value;
        });

        this.shadowRoot.getElementById('btn-split')?.addEventListener('click', () => this.performChunking());
    }

    #updateSplitterIcon(splitter) {
        const iconMap = { simple:'fa-gear', sentence:'fa-align-left', hierarchical:'fa-sitemap', code:'fa-code', semantic:'fa-brain' };
        const names = { simple:'SimpleNP', sentence:'Sentence', hierarchical:'Hierarch.', code:'CodeSplit', semantic:'Semantic' };
        this.shadowRoot.getElementById('splitter-icon').innerHTML =
            `<i class="fa-solid ${iconMap[splitter]||'fa-gear'}" style="font-size:2rem; color:#444;"></i><br><small style="font-family:'Inter', sans-serif; font-size:0.7rem;">${names[splitter]||'Splitter'}</small>`;
    }

    #updateExtractorVis(extractor) {
        const box = this.shadowRoot.getElementById('extractor-vis');
        const iconMap = {
            none:     'fa-circle-xmark',
            summary:  'fa-tag',
            qa:       'fa-circle-question',
            title:    'fa-heading',
            entities: 'fa-cubes',
            keyword:  'fa-magnifying-glass'
        };
        const names = {
            none:     'pominięto',
            summary:  'SummaryExtr',
            qa:       'QAExtractor',
            title:    'TitleExtr',
            entities: 'EntityExtr',
            keyword:  'KeywordExtr'
        };
        if (extractor === 'none') {
            box.className = 'extractor-box skipped';
        } else {
            box.className = 'extractor-box active';
        }
        box.innerHTML = `<i class="fa-solid ${iconMap[extractor]||'fa-circle-xmark'}" style="font-size:2rem; color:${extractor==='none'?'#999':'#444'};"></i><br><small style="font-family:'Inter', sans-serif; font-size:0.7rem;">${names[extractor]||'pominięto'}</small>`;
    }

    performChunking() {
        const nodesContainer = this.shadowRoot.getElementById('nodes-container');
        nodesContainer.innerHTML = '';
        state.nodes = [];

        const splitter = this.shadowRoot.getElementById('splitter-select').value;
        const extractor = this.shadowRoot.getElementById('extractor-select').value;
        const chunkSize = parseInt(this.shadowRoot.getElementById('chunk-size').value);
        let nodeIdCounter = 1;

        const splitStrategies = {
            simple: () => {
                state.documents.forEach(doc => {
                    const numChunks = Math.floor(Math.random() * 3) + 2;
                    for (let i = 0; i < numChunks; i++) {
                        state.nodes.push({ id: `node_${nodeIdCounter++}`, parentId: doc.id, text: `[Token ${chunkSize}] Fragment ${i + 1} z ${doc.id}`, embedding: null, level: 0 });
                    }
                });
            },
            sentence: () => {
                state.documents.forEach(doc => {
                    const numChunks = Math.floor(Math.random() * 4) + 3;
                    for (let i = 0; i < numChunks; i++) {
                        state.nodes.push({ id: `sent_${nodeIdCounter++}`, parentId: doc.id, text: `Zdanie ${i + 1}: fragment semantyczny...`, embedding: null, level: 0 });
                    }
                });
            },
            hierarchical: () => {
                state.documents.forEach(doc => {
                    const parentCount = Math.floor(Math.random() * 2) + 1;
                    for (let p = 0; p < parentCount; p++) {
                        const parentId = `hier_parent_${nodeIdCounter++}`;
                        state.nodes.push({ id: parentId, parentId: doc.id, text: `[Poziom 1] Sekcja ${p + 1} z ${doc.id}`, embedding: null, level: 1 });
                        const childCount = Math.floor(Math.random() * 3) + 2;
                        for (let c = 0; c < childCount; c++) {
                            state.nodes.push({ id: `hier_child_${nodeIdCounter++}`, parentId: parentId, text: `[Poziom 2] Podsekcja ${c + 1}`, embedding: null, level: 2 });
                        }
                    }
                });
            },
            code: () => {
                state.documents.forEach(doc => {
                    const funcs = ['def load_data()', 'class VectorStore', 'def embed_text()', 'async def query()'];
                    const numChunks = Math.min(funcs.length, Math.floor(Math.random() * 3) + 2);
                    for (let i = 0; i < numChunks; i++) {
                        state.nodes.push({ id: `code_${nodeIdCounter++}`, parentId: doc.id, text: `${funcs[i]}:\n    # ...`, embedding: null, level: 0, language: 'python' });
                    }
                });
            },
            semantic: () => {
                state.documents.forEach(doc => {
                    const numChunks = Math.floor(Math.random() * 2) + 2;
                    const topics = ['Wprowadzenie', 'Architektura', 'Implementacja', 'Wnioski'];
                    for (let i = 0; i < numChunks; i++) {
                        state.nodes.push({ id: `sem_${nodeIdCounter++}`, parentId: doc.id, text: `[Temat: ${topics[i]}] — ${doc.id}`, embedding: null, level: 0, topic: topics[i] });
                    }
                });
            }
        };

        (splitStrategies[splitter] || splitStrategies.simple)();

        // Apply metadata extraction if selected
        if (extractor !== 'none') {
            const metaGenerators = {
                summary:  () => ({ summary: `Streszczenie fragmentu o długości ${chunkSize} tokenów...` }),
                qa:       () => ({ questions: ['Co zawiera ten fragment?', 'Jaki jest główny temat?', 'Które encje występują?'] }),
                title:    () => ({ title: `Dokument: Sekcja ${Math.floor(Math.random() * 5) + 1}` }),
                entities: () => ({ entities: ['LLM', 'RAG', 'embedding', 'token', 'chunk'].sort(() => 0.5 - Math.random()).slice(0, 3) }),
                keyword:  () => ({ keywords: ['RAG', 'pipeline', 'indeks', 'wektor', 'LLM', 'chunk', 'retrieval', 'synteza'].sort(() => 0.5 - Math.random()).slice(0, 5) })
            };
            state.nodes.forEach(node => {
                node.metadata = metaGenerators[extractor]();
            });
        }

        // Render nodes
        const lang = state.lang;
        state.nodes.forEach((node, idx) => {
            setTimeout(() => {
                const el = document.createElement('div');
                el.className = 'node-item';
                if (node.level === 1) el.classList.add('hier-node');
                if (node.level === 2) el.classList.add('hier-node', 'l2');

                let label = `<b>${node.id}</b><br><small>parent:${node.parentId}</small>`;
                if (node.topic) label += `<div class="chunk-label">${node.topic}</div>`;
                if (node.language) label += `<div class="chunk-label" style="background:#333;color:#fff;padding:2px 8px;border-radius:3px;display:inline-block;"><i class="fa-brands fa-python" style="color:#fff;"></i> ${node.language}</div>`;
                // Metadata badges
                if (node.metadata) {
                    label += `<div style="margin-top:4px;">`;
                    if (node.metadata.summary) label += `<span class="meta-badge summary" title="${node.metadata.summary}"><i class="fa-solid fa-tag" style="color:#fff; font-size:0.6rem;"></i> ${t('stage2SummaryLabel', lang)}</span>`;
                    if (node.metadata.questions) label += `<span class="meta-badge questions" title="${node.metadata.questions.join(' | ')}"><i class="fa-solid fa-circle-question" style="color:#fff; font-size:0.6rem;"></i> ${t('stage2QuestionsLabel', lang)}</span>`;
                    if (node.metadata.title) label += `<span class="meta-badge title" title="${node.metadata.title}"><i class="fa-solid fa-heading" style="color:#fff; font-size:0.6rem;"></i> ${t('stage2TitleLabel', lang)}</span>`;
                    if (node.metadata.entities) label += `<span class="meta-badge entities" title="${node.metadata.entities.join(', ')}"><i class="fa-solid fa-cubes" style="color:#fff; font-size:0.6rem;"></i> ${t('stage2EntitiesLabel', lang)}</span>`;
                    if (node.metadata.keywords) label += `<span class="meta-badge keyword" title="${node.metadata.keywords.join(', ')}"><i class="fa-solid fa-magnifying-glass" style="color:#fff; font-size:0.6rem;"></i> ${t('stage2KeywordsLabel', lang)}</span>`;
                    label += `</div>`;
                }
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
        const splitterName = this.shadowRoot.getElementById('splitter-select').options[this.shadowRoot.getElementById('splitter-select').selectedIndex].text.split(' ')[0];
        const extName = this.shadowRoot.getElementById('extractor-select').value;
        const extLabel = extName === 'none' ? '' : ` + ${this.shadowRoot.getElementById('extractor-select').options[this.shadowRoot.getElementById('extractor-select').selectedIndex].text.split(' ')[0]}`;

        this.shadowRoot.getElementById('nodes-stats').textContent =
            `${t('stage2Created', lang)} ${totalNodes} ${t('stage2Nodes', lang)} (${rootNodes} ${t('stage2RootNodes', lang)}) — ${splitterName}${extLabel}`;

        const btn = this.shadowRoot.getElementById('btn-split');
        btn.textContent = `${t('stage2Created', lang)} (${totalNodes}) [${t('goToNext', lang)} →]`;
        btn.style.background = 'var(--success)';
        btn.onclick = () => document.querySelector('.step-indicator[data-step="3"]').click();
    }
}
customElements.define('stage-chunking', StageChunking);
