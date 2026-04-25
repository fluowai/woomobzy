// Script para testar o Editor Visual de Layout
// Execute este arquivo para verificar se todos os componentes foram criados corretamente

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando componentes do Editor Visual...\n');

const componentsToCheck = [
  // Core
  { path: 'types.ts', type: 'Core' },
  { path: 'context/LayoutEditorContext.tsx', type: 'Context' },
  
  // Editor UI
  { path: 'components/LayoutEditor/LayoutEditor.tsx', type: 'Editor UI' },
  { path: 'components/LayoutEditor/WidgetPanel.tsx', type: 'Editor UI' },
  { path: 'components/LayoutEditor/EditorCanvas.tsx', type: 'Editor UI' },
  { path: 'components/LayoutEditor/BlockRenderer.tsx', type: 'Editor UI' },
  { path: 'components/LayoutEditor/EditorToolbar.tsx', type: 'Editor UI' },
  { path: 'components/LayoutEditor/PropertiesPanel.tsx', type: 'Editor UI' },
  
  // Blocks
  { path: 'components/LayoutEditor/Blocks/HeroBlock.tsx', type: 'Block' },
  { path: 'components/LayoutEditor/Blocks/TextBlock.tsx', type: 'Block' },
  { path: 'components/LayoutEditor/Blocks/ImageBlock.tsx', type: 'Block' },
  { path: 'components/LayoutEditor/Blocks/PropertyGridBlock.tsx', type: 'Block' },
  { path: 'components/LayoutEditor/Blocks/StatsBlock.tsx', type: 'Block' },
  { path: 'components/LayoutEditor/Blocks/FormBlock.tsx', type: 'Block' },
  { path: 'components/LayoutEditor/Blocks/CTABlock.tsx', type: 'Block' },
  { path: 'components/LayoutEditor/Blocks/SpacerBlock.tsx', type: 'Block' },
  { path: 'components/LayoutEditor/Blocks/DividerBlock.tsx', type: 'Block' },
  { path: 'components/LayoutEditor/Blocks/TestimonialsBlock.tsx', type: 'Block' },
  { path: 'components/LayoutEditor/Blocks/GalleryBlock.tsx', type: 'Block' },
  { path: 'components/LayoutEditor/Blocks/MapBlock.tsx', type: 'Block' },
  { path: 'components/LayoutEditor/Blocks/BrokerCardBlock.tsx', type: 'Block' },
  { path: 'components/LayoutEditor/Blocks/FooterBlock.tsx', type: 'Block' },
  { path: 'components/LayoutEditor/Blocks/CustomHTMLBlock.tsx', type: 'Block' },
];

let totalFiles = 0;
let foundFiles = 0;
let missingFiles = [];

const baseDir = __dirname;

componentsToCheck.forEach(component => {
  totalFiles++;
  const fullPath = path.join(baseDir, component.path);
  
  if (fs.existsSync(fullPath)) {
    foundFiles++;
    console.log(`✅ [${component.type}] ${component.path}`);
  } else {
    missingFiles.push(component);
    console.log(`❌ [${component.type}] ${component.path} - NÃO ENCONTRADO`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`📊 Resultado: ${foundFiles}/${totalFiles} arquivos encontrados`);
console.log('='.repeat(60));

if (missingFiles.length > 0) {
  console.log('\n⚠️  Arquivos faltando:');
  missingFiles.forEach(file => {
    console.log(`   - ${file.path}`);
  });
} else {
  console.log('\n🎉 Todos os componentes foram criados com sucesso!');
  console.log('\n📋 Próximos passos:');
  console.log('   1. Execute a migração SQL no Supabase (add_layout_editor_columns.sql)');
  console.log('   2. Inicie o servidor: npm run dev');
  console.log('   3. Acesse Configurações > Editor Visual');
  console.log('   4. Teste arrastar e soltar blocos');
  console.log('   5. Configure propriedades dos blocos');
  console.log('   6. Salve o layout');
}

console.log('\n');
