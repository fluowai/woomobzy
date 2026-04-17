-- Adicionar enum e colunas para busca avançada
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'Venda',
ADD COLUMN IF NOT EXISTS aptitude TEXT[] DEFAULT '{}';

-- Atualizar comentários para documentação
COMMENT ON COLUMN properties.purpose IS 'Finalidade: Venda, Aluguel ou Ambos';
COMMENT ON COLUMN properties.aptitude IS 'Lista de aptidões: Agricultura, Pecuária, etc';
