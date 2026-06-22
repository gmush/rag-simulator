import { state, sharedStyles } from './state.js';
import { t } from './i18n.js';

// --- STAGE 1: INGESTION ---
class StageIngestion extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    #getLoaderSnippet(method) {
        const snippets = {
            simple: `from llama_index import SimpleDirectoryReader

documents = SimpleDirectoryReader('./data').load_data()
# Ładuje wszystkie pliki z katalogu: PDF, TXT, MD, DOCX...`,
            wikipedia: `from llama_index import WikipediaReader

loader = WikipediaReader()
documents = loader.load_data(
    pages=['RAG', 'LlamaIndex']
)
# Pobiera artykuły z Wikipedii jako Document`,
            json: `from llama_index import JSONReader

reader = JSONReader()
documents = reader.load_data('data.json')
# Parsuje JSON — każdy klucz jako osobny Document`,
            database: `from llama_index import DatabaseReader

reader = DatabaseReader(
    uri="postgresql://user:pass@host/db"
)
documents = reader.load_data(
    query="SELECT * FROM knowledge_base"
)
# Ładuje wyniki zapytania SQL jako Document`,
            notion: `from llama_index import NotionPageReader

reader = NotionPageReader(
    integration_token="secret_..."
)
documents = reader.load_data(
    page_ids=["page-uuid-1"]
)
# Importuje strony Notion przez API`,
            llamaparse: `from llama_parse import LlamaParse

parser = LlamaParse(
    api_key="llx-...",
    result_type="markdown",
    num_workers=4,
    verbose=True
)

documents = parser.load_data("./complex_doc.pdf")
# Zaawansowany parser PDF z zachowaniem struktury,
# tabel, obrazów i layoutu dokumentu`,
            unstructured: `from llama_index.readers import UnstructuredReader

reader = UnstructuredReader()
documents = reader.load_data(
    file_name="document.pdf",
    split_documents=True
)
# Uniwersalny parser dla wielu formatów:
# PDF, DOCX, HTML, EPUB, images (OCR)`,
            web: `from llama_index.readers import SimpleWebPageReader

reader = SimpleWebPageReader(
    html_to_text=True,
    metadata_fn=lambda url: {"source": url}
)
documents = reader.load_data([
    "https://example.com/page1",
    "https://example.com/page2"
])
# Ładuje strony webowe i konwertuje HTML na tekst`
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
                .source-icons { display:flex; flex-direction:column; gap:10px; justify-content:center; }
                .src-badge { padding:0.5rem 1rem; border:2px solid #0f172a; background:white; font-family:'Inter', sans-serif; font-size:0.8rem; border-radius:4px; }
                .src-badge.active-src { background:#fef3c7; border-color:#d97706; }
            </style>
            <div class="stage-layout">
                <div class="info-panel">
                    <h2>${t('stage1Title', lang)}</h2>
                    <p><strong>LlamaHub (Konektory) & Loaders:</strong><br/>
                    ${t('stage1Desc1', lang)}</p>
                    <p><strong>Obiekt Document:</strong><br/>
                    ${t('stage1Desc2', lang)} <code>id_</code>, <code>text</code> oraz <code>metadata</code>.</p>

                    <label>${t('stage1Label', lang)}</label>
                    <select id="loader-select">
                        <option value="simple">SimpleDirectoryReader (lokalne pliki)</option>
                        <option value="wikipedia">WikipediaReader (artykuły Wiki)</option>
                        <option value="json">JSONReader (dane strukturalne)</option>
                        <option value="database">DatabaseReader (SQL)</option>
                        <option value="notion">NotionPageReader (Notion API)</option>
                        <optgroup label="Advanced Parsers">
                            <option value="llamaparse">LlamaParse (zaawansowany PDF)</option>
                            <option value="unstructured">UnstructuredReader (multi-format)</option>
                            <option value="web">SimpleWebPageReader (strony webowe)</option>
                        </optgroup>
                    </select>

                    <div class="code-block" id="code-snippet">
${this.#getLoaderSnippet('simple')}
                    </div>
                    <button id="btn-load">${t('stage1Btn', lang)} SimpleDirectoryReader()</button>
                </div>
                <div class="vis-area">
                    <div style="display: flex; align-items: center; width: 100%; gap: 20px; flex-wrap:wrap; justify-content:center;">
                        <div class="source-icons" id="source-icons">
                            <div class="src-badge active-src">📄 PDF</div>
                            <div class="src-badge active-src">📝 TXT</div>
                            <div class="src-badge">📊 JSON</div>
                            <div class="src-badge">🗄️ DB</div>
                            <div class="src-badge">📓 Notion</div>
                            <div class="src-badge">🌐 Wiki</div>
                            <div class="src-badge">🌍 Web</div>
                        </div>
                        <div style="font-size: 2rem;">→</div>
                        <div style="border: 4px solid #0f172a; padding: 20px; border-radius: 8px; text-align: center; background: #fff;" id="loader-hub">
                            <strong>LlamaHub</strong><br><span id="loader-name">SimpleDirectoryReader</span>
                        </div>
                        <div style="font-size: 2rem;">→</div>
                        <div class="conveyor" id="conveyor" style="flex: 1; min-width:200px;">
                        </div>
                    </div>
                    <div id="doc-count" style="margin-top:1rem; font-family:'Inter', sans-serif; color:#475569;"></div>
                </div>
            </div>
        `;

        const sel = this.shadowRoot.getElementById('loader-select');
        sel.addEventListener('change', () => {
            const method = sel.value;
            this.shadowRoot.getElementById('btn-load').textContent = `${t('stage1Btn', lang)} ${sel.options[sel.selectedIndex].text.split(' ')[0]}()`;
            this.shadowRoot.getElementById('loader-name').textContent = sel.options[sel.selectedIndex].text.split(' ')[0];
            this.#updateSourceIcons(method);
            this.shadowRoot.getElementById('code-snippet').textContent = this.#getLoaderSnippet(method);
        });

        this.shadowRoot.getElementById('btn-load').addEventListener('click', () => this.loadData());
    }

    #updateSourceIcons(method) {
        const badges = this.shadowRoot.querySelectorAll('.src-badge');
        const activeMap = { 
            simple: [0, 1],           // PDF, TXT
            wikipedia: [5],           // Wiki
            json: [2],                // JSON
            database: [3],            // DB
            notion: [4],              // Notion
            llamaparse: [0],          // PDF (advanced parser)
            unstructured: [0, 1],     // PDF, TXT (multi-format)
            web: [6]                  // Web pages
        };
        const active = activeMap[method] || [0, 1];
        badges.forEach((b, i) => b.classList.toggle('active-src', active.includes(i)));
    }

    loadData() {
        const method = this.shadowRoot.getElementById('loader-select').value;
        const conveyor = this.shadowRoot.getElementById('conveyor');
        conveyor.innerHTML = '';

        const docSets = {
            simple: [
                { id: 'doc_1', text: 'Architektura LLM składa się z...', metadata: { source: 'PDF', path: './data/llm.pdf' } },
                { id: 'doc_2', text: 'Zarządzanie wektorami wymaga bazy...', metadata: { source: 'TXT', path: './data/vectors.txt' } }
            ],
            wikipedia: [
                { id: 'wiki_rag', text: 'Retrieval-Augmented Generation (RAG) to technika...', metadata: { source: 'Wikipedia', page: 'RAG' } },
                { id: 'wiki_llama', text: 'LlamaIndex to framework do budowy aplikacji...', metadata: { source: 'Wikipedia', page: 'LlamaIndex' } },
                { id: 'wiki_emb', text: 'Embedding to numeryczna reprezentacja tekstu...', metadata: { source: 'Wikipedia', page: 'Embedding' } }
            ],
            json: [
                { id: 'json_1', text: '{"title":"RAG Pipeline","steps":["load","chunk","embed"]}', metadata: { source: 'JSON', path: 'pipeline.json' } },
                { id: 'json_2', text: '{"model":"gpt-4","temperature":0.7,"max_tokens":2048}', metadata: { source: 'JSON', path: 'config.json' } }
            ],
            database: [
                { id: 'db_row_1', text: 'SELECT: Architektura transformerów opiera się na...', metadata: { source: 'PostgreSQL', table: 'knowledge_base', row: 1 } },
                { id: 'db_row_2', text: 'SELECT: Wektory przechowywane są w pgvector...', metadata: { source: 'PostgreSQL', table: 'embeddings', row: 42 } },
                { id: 'db_row_3', text: 'SELECT: Optymalizacja zapytań przez HNSW...', metadata: { source: 'PostgreSQL', table: 'indexes', row: 7 } }
            ],
            notion: [
                { id: 'notion_1', text: 'Projekt RAG — cele i architektura systemu...', metadata: { source: 'Notion', page_id: 'abc-123', last_edited: '2026-06-15' } },
                { id: 'notion_2', text: 'Sprint 5: integracja z ChromaDB i testy...', metadata: { source: 'Notion', page_id: 'def-456', last_edited: '2026-06-20' } }
            ],
            llamaparse: [
                { id: 'pdf_1', text: 'ZAWARENY DOKUMENT: Archiecture overview with tables and diagrams...', metadata: { source: 'PDF (LlamaParse)', path: './complex_doc.pdf', parsing_type: 'advanced', elements: ['tables', 'headers', 'footnotes'] } },
                { id: 'pdf_2', text: 'Financial Report Q1 2026 — structured data extraction...', metadata: { source: 'PDF (LlamaParse)', path: './financial.pdf', parsing_type: 'advanced', elements: ['tables', 'charts', 'metadata'] } }
            ],
            unstructured: [
                { id: 'unstructured_1', text: 'Dokument zeskanowany przez OCR — tekst odczytany z obrazu...', metadata: { source: 'PDF (Unstructured)', path: './scanned.pdf', format: 'image-based', ocr_confidence: 0.92 } },
                { id: 'unstructured_2', text: 'Tekst z dokumentu tekstowego — czyste parsowanie...', metadata: { source: 'TXT (Unstructured)', path: './notes.txt', format: 'text' } }
            ],
            web: [
                { id: 'web_1', text: 'Najnowsze artykuły o LLM i RAG — tutorial, dokumentacja...', metadata: { source: 'Web', url: 'https://example.com/article1', extracted_date: '2026-06-22' } },
                { id: 'web_2', text: 'Dokumentacja API LlamaIndex — przewodnik integracji...', metadata: { source: 'Web', url: 'https://example.com/api-docs', extracted_date: '2026-06-22' } },
                { id: 'web_3', text: 'Blog o AI — najnowsze posty i case studies...', metadata: { source: 'Web', url: 'https://example.com/blog', extracted_date: '2026-06-22' } }
            ]
        };

        state.documents = docSets[method] || docSets.simple;
        
        state.documents.forEach((doc, idx) => {
            setTimeout(() => {
                const el = document.createElement('div');
                el.className = 'doc-item';
                el.innerHTML = `Document<br><small>${doc.id}</small><br><small style="color:#64748b;">${doc.metadata.source}</small>`;
                el.style.transform = 'translateX(300px)';
                el.style.opacity = '0';
                el.style.transition = 'all 0.5s ease-out';
                conveyor.appendChild(el);
                requestAnimationFrame(() => {
                    el.style.transform = 'translateX(0)';
                    el.style.opacity = '1';
                });
            }, idx * 400);
        });

        const loaderName = this.shadowRoot.getElementById('loader-select').options[this.shadowRoot.getElementById('loader-select').selectedIndex].text.split(' ')[0];
        this.shadowRoot.getElementById('doc-count').textContent = `${t('stage1LoadedDocs', lang)} ${state.documents.length} ${t('stage1Docs', lang)} ${t('stage1By', lang)} ${loaderName}`;
        
        const btn = this.shadowRoot.getElementById('btn-load');
        btn.textContent = `${t('stage1Loaded', lang)} (${state.documents.length} ${t('stage1Docs', lang)}) [${t('stage1Next', lang)} →]`;
        btn.style.background = '#10b981';
        btn.onclick = () => document.querySelector('.step-indicator[data-step="2"]').click();
    }
}
customElements.define('stage-ingestion', StageIngestion);
