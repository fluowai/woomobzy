import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const projectRoot = process.cwd();
const appPath = path.join(projectRoot, 'App.tsx');
const outputPath = path.resolve(
  projectRoot,
  process.argv[2] || 'DEV/TESTS/FUNCTIONAL_AUDIT_MATRIX.md'
);

const sourceText = fs.readFileSync(appPath, 'utf8');
const sourceFile = ts.createSourceFile(
  appPath,
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

const wrapperNames = new Set([
  'ProtectedRoute',
  'PanelGuard',
  'SubscriptionGuard',
  'SuperAdminGuard',
  'MegaAdminGuard',
]);

const routeRows = [];
const componentFiles = new Map();

const resolveLocalModule = (modulePath) => {
  if (!modulePath.startsWith('.')) return '';
  const normalized = modulePath.replace(/^\.\//, '').replaceAll('\\', '/');
  const candidates = [
    normalized,
    `${normalized}.tsx`,
    `${normalized}.ts`,
    `${normalized}.jsx`,
    `${normalized}.js`,
    `${normalized}/index.tsx`,
    `${normalized}/index.ts`,
    `${normalized}/index.jsx`,
    `${normalized}/index.js`,
  ];
  return candidates.find((candidate) => fs.existsSync(path.join(projectRoot, candidate))) || normalized;
};

for (const statement of sourceFile.statements) {
  if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
    const modulePath = resolveLocalModule(statement.moduleSpecifier.text);
    if (!modulePath || !statement.importClause) continue;
    if (statement.importClause.name) {
      componentFiles.set(statement.importClause.name.text, modulePath);
    }
    const bindings = statement.importClause.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        componentFiles.set(element.name.text, modulePath);
      }
    }
  }

  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      let dynamicImport = '';
      const findDynamicImport = (node) => {
        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword &&
          node.arguments[0] &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          dynamicImport = resolveLocalModule(node.arguments[0].text);
        }
        ts.forEachChild(node, findDynamicImport);
      };
      findDynamicImport(declaration.initializer);
      if (dynamicImport) componentFiles.set(declaration.name.text, dynamicImport);
    }
  }
}

const tagName = (node) => {
  if (!node) return '';
  if (ts.isIdentifier(node)) return node.text;
  return node.getText(sourceFile);
};

const openingNode = (node) =>
  ts.isJsxElement(node) ? node.openingElement : node;

const getAttribute = (node, name) => {
  const opening = openingNode(node);
  return opening.attributes.properties.find(
    (property) =>
      ts.isJsxAttribute(property) && property.name.getText(sourceFile) === name
  );
};

const getStringAttribute = (node, name) => {
  const attribute = getAttribute(node, name);
  if (!attribute?.initializer) return null;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (
    ts.isJsxExpression(attribute.initializer) &&
    attribute.initializer.expression &&
    ts.isStringLiteral(attribute.initializer.expression)
  ) {
    return attribute.initializer.expression.text;
  }
  return null;
};

const hasAttribute = (node, name) => Boolean(getAttribute(node, name));

const getElementMetadata = (node) => {
  const attribute = getAttribute(node, 'element');
  if (
    !attribute?.initializer ||
    !ts.isJsxExpression(attribute.initializer) ||
    !attribute.initializer.expression
  ) {
    return { component: 'Layout/índice', guards: [] };
  }

  const names = [];
  const collect = (child) => {
    if (ts.isJsxElement(child)) names.push(tagName(child.openingElement.tagName));
    if (ts.isJsxSelfClosingElement(child)) names.push(tagName(child.tagName));
    ts.forEachChild(child, collect);
  };
  collect(attribute.initializer.expression);

  const guards = [...new Set(names.filter((name) => wrapperNames.has(name)))];
  const components = names.filter(
    (name) => name !== 'Route' && !wrapperNames.has(name)
  );

  return {
    component: components.at(-1) || 'Expressão',
    guards,
  };
};

const joinRoutePath = (parentPath, routePath, isIndex) => {
  if (isIndex) return parentPath || '/';
  if (!routePath) return parentPath || '/';
  if (routePath.startsWith('/')) return routePath;
  const base = parentPath === '/' ? '' : parentPath.replace(/\/$/, '');
  return `${base}/${routePath}`.replace(/\/+/g, '/');
};

const classifyPanel = (routePath) => {
  if (routePath.startsWith('/urban')) return 'Urbano';
  if (routePath.startsWith('/rural')) return 'Rural';
  if (routePath.startsWith('/superadmin')) return 'Super Admin';
  if (routePath.startsWith('/megaadmin')) return 'Mega Admin';
  return 'Público/compartilhado';
};

const classifyRisk = (routePath) => {
  const critical =
    /login|register|onboarding|impersonate|superadmin|megaadmin|billing|cobranca|financeiro|financial|locacao|contract|settings|integrations/i;
  const high =
    /crm|clients|properties|empreendimentos|loteamentos|whatsapp|email|documents|documentos|compliance|car|valuation|due-diligence|storage|domains|plans|feature-flags/i;
  if (critical.test(routePath)) return 'CRÍTICO';
  if (high.test(routePath)) return 'ALTO';
  return 'MÉDIO';
};

const visit = (node, parentPath = '') => {
  const isRouteElement =
    (ts.isJsxElement(node) &&
      tagName(node.openingElement.tagName) === 'Route') ||
    (ts.isJsxSelfClosingElement(node) && tagName(node.tagName) === 'Route');

  let nextParentPath = parentPath;

  if (isRouteElement) {
    const routePath = getStringAttribute(node, 'path');
    const isIndex = hasAttribute(node, 'index');
    const fullPath = joinRoutePath(parentPath, routePath, isIndex);
    const { component, guards } = getElementMetadata(node);
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

    routeRows.push({
      panel: classifyPanel(fullPath),
      path: fullPath,
      component,
      file: componentFiles.get(component) || 'Externo/inline',
      guards: guards.join(', ') || 'Herdado',
      risk: classifyRisk(fullPath),
      line,
      kind: isIndex ? 'índice' : component === 'Navigate' ? 'redirecionamento' : 'função',
    });
    nextParentPath = fullPath;
  }

  ts.forEachChild(node, (child) => visit(child, nextParentPath));
};

visit(sourceFile);

const testRoots = ['tests', path.join('src', 'test'), path.join('server', '__tests__')];
const testFiles = [];

const collectTestFiles = (directory) => {
  const absoluteDirectory = path.join(projectRoot, directory);
  if (!fs.existsSync(absoluteDirectory)) return;
  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectTestFiles(relativePath);
    if (entry.isFile() && /\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) {
      testFiles.push({
        path: relativePath.replaceAll('\\', '/'),
        content: fs.readFileSync(path.join(projectRoot, relativePath), 'utf8'),
      });
    }
  }
};

for (const root of testRoots) collectTestFiles(root);

const coverageFor = (routePath) => {
  if (routePath === '/' || routePath.includes('*') || routePath.includes(':')) {
    return 'REVISAR';
  }
  const matches = testFiles
    .filter((file) => file.content.includes(routePath))
    .map((file) => file.path);
  return matches.length ? `REFERENCIADA: ${matches.join(', ')}` : 'SEM REFERÊNCIA';
};

const panelOrder = [
  'Público/compartilhado',
  'Urbano',
  'Rural',
  'Super Admin',
  'Mega Admin',
];
const riskOrder = { CRÍTICO: 0, ALTO: 1, MÉDIO: 2 };

routeRows.sort(
  (left, right) =>
    panelOrder.indexOf(left.panel) - panelOrder.indexOf(right.panel) ||
    riskOrder[left.risk] - riskOrder[right.risk] ||
    left.path.localeCompare(right.path, 'pt-BR')
);

const counts = routeRows.reduce((result, row) => {
  result[row.panel] = (result[row.panel] || 0) + 1;
  return result;
}, {});

const escapeCell = (value) => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');

const lines = [
  '# Matriz mestra de auditoria funcional — IMOBZY',
  '',
  `**Gerada em:** ${new Date().toISOString()}  `,
  '**Fonte:** `App.tsx` analisado por AST  ',
  '**Status inicial:** PENDENTE até execução com evidência',
  '',
  '> Esta matriz é um inventário estrutural. Uma rota referenciada por teste não é automaticamente considerada validada.',
  '',
  '## Resumo',
  '',
  '| Painel | Rotas inventariadas |',
  '| --- | ---: |',
  ...panelOrder.map((panel) => `| ${panel} | ${counts[panel] || 0} |`),
  `| **Total** | **${routeRows.length}** |`,
  '',
  '## Casos',
  '',
  '| ID | Painel | Rota | Componente | Arquivo | Proteção | Risco | Tipo | Cobertura encontrada | Status | Fonte |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...routeRows.map((row, index) => {
    const id = `AF-${String(index + 1).padStart(3, '0')}`;
    const values = [
      id,
      row.panel,
      `\`${row.path}\``,
      `\`${row.component}\``,
      `\`${row.file}\``,
      row.guards,
      row.risk,
      row.kind,
      coverageFor(row.path),
      'PENDENTE',
      `App.tsx:${row.line}`,
    ];
    return `| ${values.map(escapeCell).join(' | ')} |`;
  }),
  '',
  '## Regra de atualização',
  '',
  '- Regenerar com `npm run audit:matrix` após mudanças em `App.tsx`.',
  '- A execução deve registrar evidência, ambiente, perfil, tenant, resultado e defeito relacionado.',
  '- Casos críticos só podem mudar para APROVADO depois de validar interface, API, persistência e autorização.',
  '',
];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

console.log(
  JSON.stringify(
    {
      output: path.relative(projectRoot, outputPath).replaceAll('\\', '/'),
      routes: routeRows.length,
      panels: counts,
      testFilesScanned: testFiles.length,
    },
    null,
    2
  )
);
