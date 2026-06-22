import { state } from './state.js';
import { t } from './i18n.js';

// Import all stage modules so custom elements get registered
import './stage-ingestion.js';
import './stage-chunking.js';
import './stage-indexing.js';
import './stage-retrieval.js';
import './stage-refinement.js';
import './stage-synthesis.js';

// --- MAIN APP CONTROLLER ---
function initApp() {
    const steps = document.querySelectorAll('.step-indicator');
    const container = document.getElementById('app-container');
    const langPlBtn = document.getElementById('lang-pl');
    const langEnBtn = document.getElementById('lang-en');

    // Language switching
    function updateUILanguage() {
        const lang = state.lang;
        
        // Update header
        document.getElementById('app-title').textContent = t('title', lang);
        
        // Update step indicators
        steps.forEach((step, idx) => {
            step.textContent = t(`step${idx + 1}`, lang);
        });
        
        // Update language buttons
        langPlBtn.classList.toggle('active', lang === 'pl');
        langEnBtn.classList.toggle('active', lang === 'en');
        
        // Re-render active stage
        const activeComponent = container.querySelector('.active');
        if (activeComponent && activeComponent.render) {
            activeComponent.render();
        }
    }

    langPlBtn.addEventListener('click', () => {
        state.lang = 'pl';
        updateUILanguage();
    });

    langEnBtn.addEventListener('click', () => {
        state.lang = 'en';
        updateUILanguage();
    });

    steps.forEach(step => {
        step.addEventListener('click', () => {
            // Update Header Active State
            steps.forEach(s => s.classList.remove('active'));
            step.classList.add('active');

            // Update Main View
            const targetStepNum = step.getAttribute('data-step');
            
            // Usuń aktywne klasy ze wszystkich komponentów
            const components = container.querySelectorAll(':scope > *');
            components.forEach(c => c.classList.remove('active'));

            // Pobierz/Re-renderuj docelowy komponent aby załapać aktualny stan (Singleton state)
            const targetComponent = container.querySelector(`#step-${targetStepNum}`);
            if(targetComponent.render) {
                targetComponent.render(); // Wymuś odświeżenie UI pod nowy stan danych
            }
            targetComponent.classList.add('active');
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
