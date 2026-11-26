import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.js';
import './presentation/tokens.css';

const container = document.getElementById('root');
if (!container) {
    throw new Error('ReStart bootstrapped without a #root element.');
}

createRoot(container).render(
    <StrictMode>
        <App />
    </StrictMode>
);
