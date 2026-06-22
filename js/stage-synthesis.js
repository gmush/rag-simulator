import { state, sharedStyles } from './state.js';
import { t } from './i18n.js';

// --- STAGE 6: SYNTHESIS ---
class StageSynthesis extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    #getSynthesisSnippet(method) {
        const snippets = {
            compact: `from llama_index.response_synthesizers import CompactAndRefine

query_engine = index.as_query_engine(
    node_postprocessors=[postprocessor],
    response_mode="compact"
)
response = query_engine.query("${state.query || 'Twoje zapytanie...'}")
print(response)
# "Compact" — ścina kontekst do okna, generuje odpowiedź`,
            tree_summarize: `from llama_index.response_synthesizers import TreeSummarize

query_engine = index.as_query_engine(
    node_postprocessors=[postprocessor],
    response_mode="tree_summarize"
)
response = query_engine.query("${state.query || 'Twoje zapytanie...'}")
print(response)
# "Tree Summarize" — sumaryzuje węzły hierarchicznie, potem łączy`,
            refine: `from llama_index.response_synthesizers import Refine

query_engine = index.as_query_engine(
    node_postprocessors=[postprocessor],
    response_mode="refine"
)
response = query_engine.query("${state.query || 'Twoje zapytanie...'}")
print(response)
# "Refine" — iteracyjnie uszczegóławia odpowiedź przez każdy węzeł`,
            simple_summarize: `from llama_index.response_synthesizers import SimpleSummarize

query_engine = index.as_query_engine(
    node_postprocessors=[postprocessor],
    response_mode="simple_summarize"
)
response = query_engine.query("${state.query || 'Twoje zapytanie...'}")
print(response)
# "Simple Summarize" — tnie kontekst do limitu tokenów, jedna odpowiedź`,
            accumulate: `from llama_index.response_synthesizers import Accumulate

query_engine = index.as_query_engine(
    node_postprocessors=[postprocessor],
    response_mode="accumulate"
)
response = query_engine.query("${state.query || 'Twoje zapytanie...'}")
print(response)
# "Accumulate" — przetwarza każdy węzeł osobno, łączy wyniki`
        };
        return snippets[method] || snippets.compact;
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
                .engine-block {
                    border: 4px solid #0f172a;
                    background: #e2e8f0;
                    border-radius: 12px;
                    padding: 2rem;
                    text-align: center;
                    position: relative;
                    box-shadow: inset 0 0 20px rgba(0,0,0,0.1);
                }
                .engine-block.compact-mode { border-color:#3b82f6; }
                .engine-block.tree-mode { border-color:#8b5cf6; }
                .engine-block.refine-mode { border-color:#f59e0b; }
                .engine-block.simple-mode { border-color:#10b981; }
                .engine-block.accumulate-mode { border-color:#ec4899; }
                .piston {
                    width: 30px; height: 60px;
                    background: #64748b;
                    display: inline-block;
                    margin: 0 10px;
                    border: 2px solid #0f172a;
                    transition: background 0.3s;
                }
                .piston.anim { animation: pump 0.5s infinite alternate; }
                .piston.anim-slow { animation: pump 1s infinite alternate; }
                .piston.anim-fast { animation: pump 0.25s infinite alternate; }
                .piston:nth-child(2) { animation-delay: 0.25s; }
                .piston:nth-child(3) { animation-delay: 0.5s; }
                @keyframes pump {
                    from { transform: translateY(0); }
                    to { transform: translateY(-20px); }
                }
                .output-box {
                    background: #1e293b;
                    color: #10b981;
                    font-family: monospace;
                    padding: 1rem;
                    border-radius: 4px;
                    min-height: 80px;
                    width: 100%;
                    box-sizing: border-box;
                    box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
                }
                .output-box.compact-out { box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); }
                .output-box.tree-out { box-shadow: 0 0 15px rgba(139, 92, 246, 0.3); }
                .output-box.refine-out { box-shadow: 0 0 20px rgba(245, 158, 11, 0.4); }
                .typewriter::after {
                    content: '|';
                    animation: blink 1s infinite;
                }
                @keyframes blink { 50% { opacity: 0; } }
            </style>
            <div class="stage-layout">
                <div class="info-panel">
                    <h2>${t('stage6Title', lang)}</h2>
                    <p><strong>ResponseSynthesizer:</strong><br/>
                    ${t('stage6Desc', lang)}</p>

                    <label>${t('stage6Label', lang)}</label>
                    <select id="synthesis-select">
                        <option value="compact">compact — ściśnij kontekst, generuj</option>
                        <option value="tree_summarize">tree_summarize — hierarchiczna sumaryzacja</option>
                        <option value="refine">refine — iteracyjne uszczegóławianie</option>
                        <option value="simple_summarize">simple_summarize — prosta sumaryzacja</option>
                        <option value="accumulate">accumulate — akumulacja odpowiedzi</option>
                    </select>

                    <div class="code-block" id="code-snippet">
${this.#getSynthesisSnippet('compact')}
                    </div>
                    <button id="btn-synthesize" ${state.refinedNodes.length === 0 && !state.query ? 'disabled' : ''}>
                        ${state.refinedNodes.length === 0 && !state.query ? t('stage6NoData', lang) : t('stage6Btn', lang)}
                    </button>
                </div>
                <div class="vis-area">
                    <div style="display:flex; width: 100%; justify-content: space-around; margin-bottom: 2rem;">
                        <div style="background: white; border: 2px dashed #0f172a; padding: 1rem; flex: 1; margin-right: 1rem;">
                            <b>${t('stage6Query', lang)}</b><br>
                            <small>${state.query || t('stage6NoQuery', lang)}</small>
                        </div>
                        <div style="background: white; border: 2px dashed #0f172a; padding: 1rem; flex: 1; margin-left: 1rem;">
                            <b>${t('stage6ContextNodes', lang)}</b><br>
                            <small>${state.refinedNodes.map(n => n.id).join(', ') || t('stage6NoContext', lang)}</small>
                        </div>
                    </div>
                    
                    <div class="engine-block" id="llm-engine">
                        <h3 style="margin-top:0; font-family:monospace;" id="engine-title">${t('stage6Engine', lang)}</h3>
                        <div class="piston" id="p1"></div>
                        <div class="piston" id="p2"></div>
                        <div class="piston" id="p3"></div>
                    </div>

                    <div style="font-size: 2rem; margin: 1rem 0;">↓</div>

                    <div class="output-box" id="final-output"></div>
                    <div id="synth-stats" style="font-family:monospace; font-size:0.8rem; margin-top:0.5rem; color:#475569;"></div>
                </div>
            </div>
        `;

        const synSel = this.shadowRoot.getElementById('synthesis-select');
        synSel.addEventListener('change', () => {
            const m = synSel.value;
            this.shadowRoot.getElementById('code-snippet').textContent = this.#getSynthesisSnippet(m);
            this.#updateEngineVisual(m);
        });

        this.shadowRoot.getElementById('btn-synthesize')?.addEventListener('click', () => this.performSynthesis());
    }

    #updateEngineVisual(method) {
        const engine = this.shadowRoot.getElementById('llm-engine');
        const title = this.shadowRoot.getElementById('engine-title');
        engine.className = `engine-block ${method.replace('_','-')}-mode`;
        const titles = { compact:'Compact Engine', tree_summarize:'Tree Summarize Engine', refine:'Refine Engine', simple_summarize:'Simple Summarize Engine', accumulate:'Accumulate Engine' };
        title.textContent = titles[method] || 'LLM Synthesis Engine';
        const pistons = this.shadowRoot.querySelectorAll('.piston');
        pistons.forEach(p => p.style.background = {
            compact:'#3b82f6', tree_summarize:'#8b5cf6', refine:'#f59e0b', simple_summarize:'#10b981', accumulate:'#ec4899'
        }[method] || '#64748b');
    }

    performSynthesis() {
        const lang = state.lang;
        const method = this.shadowRoot.getElementById('synthesis-select').value;
        const pistons = this.shadowRoot.querySelectorAll('.piston');
        
        // Różne prędkości animacji dla różnych trybów
        pistons.forEach(p => p.classList.remove('anim', 'anim-slow', 'anim-fast'));
        const animClass = { compact:'anim', tree_summarize:'anim', refine:'anim-slow', simple_summarize:'anim-fast', accumulate:'anim' }[method] || 'anim';
        pistons.forEach(p => p.classList.add(animClass));

        const btn = this.shadowRoot.getElementById('btn-synthesize');
        btn.textContent = t('stage6Processing', lang);
        btn.disabled = true;

        const output = this.shadowRoot.getElementById('final-output');
        output.innerHTML = '';
        output.className = `output-box ${method.replace('_','-')}-out`;

        // Różne odpowiedzi dla różnych trybów
        const responses = {
            compact: `[compact] Na podstawie dostarczonego kontekstu (${state.refinedNodes.map(n=>n.id).join(', ')}), system RAG działa jako most między danymi a LLM. Umożliwia ładowanie, wektoryzację i wyszukiwanie w celu ograniczenia halucynacji AI.`,
            tree_summarize: `[tree_summarize] Krok 1: Analiza węzłów...\nKrok 2: Sumaryzacja fragmentów...\nKrok 3: Łączenie...\n\nWynik: System RAG oparty na LlamaIndex łączy ${state.refinedNodes.length} węzłów kontekstu z zapytaniem "${state.query}", redukując halucynacje.`,
            refine: `[refine] Iteracja 1: Podstawowa odpowiedź... → Iteracja 2: Dodano szczegóły z ${state.refinedNodes[0]?.id || 'N/A'}... → Iteracja 3: Finalna odpowiedź.\n\nSystem RAG łączy retrieval z generacją, tworząc pomost między danymi a modelem.`,
            simple_summarize: `[simple] Odpowiedź: RAG w LlamaIndex umożliwia wzbogacenie odpowiedzi LLM o dane zewnętrzne z ${state.refinedNodes.length} dokumentów kontekstowych.`,
            accumulate: `[accumulate] Z ${state.refinedNodes[0]?.id || 'N/A'}: informacje o architekturze...\nZ ${state.refinedNodes[1]?.id || 'N/A'}: szczegóły implementacji...\n\nŁącznie: System RAG skutecznie redukuje halucynacje.`
        };

        const finalText = responses[method] || responses.compact;
        let i = 0;
        const speed = method === 'simple_summarize' ? 10 : method === 'refine' ? 40 : 20;
        output.classList.add('typewriter');

        const typeWriter = () => {
            if (i < finalText.length) {
                output.innerHTML += finalText.charAt(i);
                i++;
                setTimeout(typeWriter, speed);
            } else {
                output.classList.remove('typewriter');
                pistons.forEach(p => p.classList.remove('anim', 'anim-slow', 'anim-fast'));
                btn.textContent = t('stage6Finished', lang);
                btn.disabled = false;
                btn.onclick = () => window.location.reload();
            }
        };

        setTimeout(typeWriter, 800);

        const methodNames = { compact:'compact', tree_summarize:'tree_summarize', refine:'refine', simple_summarize:'simple_summarize', accumulate:'accumulate' };
        this.shadowRoot.getElementById('synth-stats').textContent = 
            `${t('stage6Mode', lang)}: ${methodNames[method]} | ${t('stage6Context', lang)}: ${state.refinedNodes.length} ${t('stage2Nodes', lang)} | Query: "${state.query?.substring(0,30)}..."`;
    }
}
customElements.define('stage-synthesis', StageSynthesis);
