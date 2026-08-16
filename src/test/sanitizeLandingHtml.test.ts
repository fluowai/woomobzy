import { describe, expect, it } from 'vitest';
import { sanitizeLandingHtml } from '../../utils/sanitizeLandingHtml';

describe('sanitizeLandingHtml', () => {
  it('remove scripts, handlers e protocolos executáveis', () => {
    const sanitized = sanitizeLandingHtml(`
      <script>alert('xss')</script>
      <img src="javascript:alert(1)" onerror="alert(2)" />
      <a href="javascript:alert(3)">Perigoso</a>
      <p onclick="alert(4)">Conteúdo seguro</p>
    `);

    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).toContain('Conteúdo seguro');
  });

  it('preserva campos de formulário e protege links em nova aba', () => {
    const sanitized = sanitizeLandingHtml(`
      <form action="https://evil.example">
        <input name="name" required />
        <button type="submit">Enviar</button>
      </form>
      <a href="https://example.com" target="_blank">Abrir</a>
    `);

    expect(sanitized).toContain('<form>');
    expect(sanitized).not.toContain('action=');
    expect(sanitized).toContain('name="name"');
    expect(sanitized).toContain('type="submit"');
    expect(sanitized).toContain('rel="noopener noreferrer"');
  });
});
