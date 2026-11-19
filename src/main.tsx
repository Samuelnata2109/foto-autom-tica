import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HomePage } from './pages/HomePage';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Elemento raiz da aplicação não encontrado.');
}

createRoot(root).render(
  <StrictMode>
    <HomePage />
  </StrictMode>,
);
