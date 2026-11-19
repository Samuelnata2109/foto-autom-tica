import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HomePage } from '../src/pages/HomePage';

describe('Página provisória', () => {
  it('exibe o nome da cabine em um título dentro da região principal', () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toMatch(/<main\b[^>]*>.*<h1\b[^>]*>AI Photo Booth<\/h1>.*<\/main>/);
  });

  it('identifica o projeto e informa que a aplicação está em desenvolvimento', () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain('Projeto de cabine fotográfica interativa.');
    expect(html).toContain('Aplicação em desenvolvimento.');
  });
});
