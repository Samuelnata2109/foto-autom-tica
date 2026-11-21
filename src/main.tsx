import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import { App } from './App';
import { PasswordPage } from './pages/PasswordPage';
import { consumePasswordLink } from './services/passwordLink';
import { createPasswordFlow } from './services/passwordFlow';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Elemento raiz da aplicação não encontrado.');
}

function mount(element: HTMLElement) {
  const link = consumePasswordLink(window);
  createRoot(element).render(
    <StrictMode>
      {link ? (
        <PasswordPage flow={createPasswordFlow(link)} />
      ) : (
        <HashRouter>
          <App />
        </HashRouter>
      )}
    </StrictMode>,
  );
}

mount(root);
