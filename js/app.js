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
