// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function render(path = '/') {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    ),
  );
}

function find<T extends HTMLElement>(selector: string) {
  const element = container.querySelector<T>(selector);
  expect(element, selector).not.toBeNull();
  return element!;
}

async function click(selector: string) {
  await act(async () => find(selector).click());
}

describe('Experiência da cabine', () => {
  it('exibe a recepção e navega entre início e cabine', async () => {
    await render();
    expect(find('h1').textContent).toMatch(/Seu momento\.\s*Sua melhor foto\./);
    expect(find('a[href="/cabine"]').textContent).toContain('Iniciar experiência');

    await click('a[href="/cabine"]');
    expect(find('h1').textContent).toBe('Cabine fotográfica');
    expect(document.activeElement).toBe(find('h1'));

    await click('a[href="/"]');
    expect(find('h1').textContent).toContain('Sua melhor foto.');
  });

  it('seleciona 5 ou 10 segundos sem iniciar uma contagem', async () => {
    await render('/cabine');
    const five = find<HTMLInputElement>('label:first-child input[type="radio"]');
    const ten = find<HTMLInputElement>('label:last-child input[type="radio"]');

    expect(five.checked).toBe(true);
    await act(async () => ten.click());
    expect(ten.checked).toBe(true);
    expect(five.checked).toBe(false);
    expect(container.querySelector('progress')).toBeNull();
  });

  it('explica a indisponibilidade da câmera e exibe os quatro gestos previstos', async () => {
    await render('/cabine');
    expect(find('.camera-status').textContent).toBe('Câmera indisponível');
    expect(find('.camera-viewport').textContent).toContain('Etapa 03');
    expect(find<HTMLButtonElement>('.shutter').disabled).toBe(true);
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelectorAll('.gesture-guide li')).toHaveLength(4);
    expect(find('.gesture-guide').textContent).toContain('Etapa 05');
  });
});

describe('Prévias de desenvolvimento', () => {
  it('exibe um quadro de contagem e permite demonstrar seu cancelamento', async () => {
    await render('/previa/contagem');
    expect(find('.preview-notice').textContent).toContain('Prévia de desenvolvimento');
    expect(find<HTMLProgressElement>('progress').value).toBe(0.4);
    await click('.countdown button');
    expect(find('[role="status"]').textContent).toBe('Cancelado');
    expect(container.querySelector('progress')).toBeNull();
    await click('.preview-actions button');
    expect(find('[role="status"]').textContent).toContain('3 segundos restantes');
  });

  it('exibe a revisão sem foto e desabilita ações indisponíveis', async () => {
    await render('/previa/revisao');
    expect(find('.photo-preview').textContent).toContain('Nenhuma foto disponível');
    expect(container.querySelector('.photo-preview img')).toBeNull();
    expect(container.querySelectorAll('.preview-actions button:disabled')).toHaveLength(2);
    await click('.preview-actions a');
    expect(find('h1').textContent).toBe('Cabine fotográfica');
  });

  it('mostra os espaços reservados e permite finalizar a experiência', async () => {
    await render('/previa/compartilhamento');
    const panel = find('.sharing-panel');
    expect(panel.textContent).toContain('QR Code indisponível');
    expect(panel.textContent).toContain('Download');
    expect(panel.textContent).toContain('Instagram');
    expect(panel.querySelector('a')).toBeNull();
    await click('.preview-actions a');
    expect(find('h1').textContent).toContain('Sua melhor foto.');
  });
});
