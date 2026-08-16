import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const appSource = fs.readFileSync(
  path.join(projectRoot, 'App.routes.tsx'),
  'utf8'
);
const urbanLayoutSource = fs.readFileSync(
  path.join(projectRoot, 'components', 'UrbanLayout.tsx'),
  'utf8'
);

describe('rotas do menu urbano', () => {
  const expectedRoutes = [
    {
      menuPath: '/urban/fintech',
      routePath: 'fintech',
      component: 'FinancialHub',
    },
    {
      menuPath: '/urban/clube',
      routePath: 'clube',
      component: 'ClubeImobzy',
    },
  ];

  it.each(expectedRoutes)(
    'mantém $menuPath registrado no menu e no roteador',
    ({ menuPath, routePath, component }) => {
      expect(urbanLayoutSource).toContain(`path: '${menuPath}'`);
      expect(appSource).toContain(
        `<Route path="${routePath}" element={<${component} />} />`
      );
      expect(appSource).toContain(
        `const ${component} = lazy(() => import('./views/urban/${component}'))`
      );
    }
  );
});
