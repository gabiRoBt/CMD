import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/base.css';
import './styles/lobby.css';
import './styles/arena.css';
import './styles/terminal.css';
import './styles/footer.css';
import './styles/skin-dev-mode.css';
import './styles/skin-siberia.css';
import './styles/skin-retro.css';
import './styles/skin-wasteland.css';
import './styles/skin-jungle.css';

import { sounds } from './utils/sounds';

import App from './App';

document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || (e.target.closest && (e.target.closest('.btn') || e.target.closest('.ability-pill') || e.target.closest('button')))) {
        sounds.click();
    }
});

document.addEventListener('change', (e) => {
    if (e.target.tagName === 'SELECT') {
        sounds.click();
    }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
