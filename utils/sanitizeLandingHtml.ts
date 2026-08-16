import sanitizeHtml from 'sanitize-html';

const DANGEROUS_CSS_PATTERN = /expression\s*\(|javascript\s*:|@import/gi;

export const sanitizeLandingHtml = (html: string): string =>
  sanitizeHtml((html || '').replace(DANGEROUS_CSS_PATTERN, ''), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'form',
      'input',
      'select',
      'option',
      'textarea',
      'button',
      'label',
      'main',
      'section',
      'article',
      'header',
      'footer',
      'nav',
      'aside',
      'details',
      'summary',
    ]),
    allowedAttributes: {
      '*': ['class', 'id', 'style', 'title', 'role', 'aria-*', 'data-*'],
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      form: ['id', 'class'],
      input: [
        'type',
        'name',
        'placeholder',
        'value',
        'required',
        'checked',
        'autocomplete',
      ],
      select: ['name', 'required'],
      option: ['value', 'selected'],
      textarea: ['name', 'placeholder', 'required', 'rows'],
      button: ['type', 'name', 'value', 'disabled'],
      label: ['for'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs:
          attribs.target === '_blank'
            ? { ...attribs, rel: 'noopener noreferrer' }
            : attribs,
      }),
    },
  });
