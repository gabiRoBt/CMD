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

import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
