import { logger } from '@/utils/logger';
import { supabase } from './supabase';

export const uploadFile = async (
  file: File,
  bucket: 'agency-assets' | 'property-images' | 'imobzyimg' | 'imobzymsg' | 'whatsapp-media',
  folder?: string
): Promise<string | null> => {
  try {
    const storageBucket = resolveStorageBucket(bucket);
    // Sanitiza o nome do arquivo para evitar problemas de caracteres especiais
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(filePath, file);

    if (uploadError) {
      logger.error('Erro detalhado no upload:', uploadError);
      alert(`Erro no upload: ${uploadError.message}`); // Feedback visual para o usuário
      throw uploadError;
    }

    const { data } = supabase.storage.from(storageBucket).getPublicUrl(filePath);

    logger.info('Upload sucesso. URL:', data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    logger.error('Falha ao fazer upload da imagem:', error);
    return null;
  }
};

function resolveStorageBucket(bucket: string): 'imobzyimg' | 'imobzymsg' | 'whatsapp-media' {
  if (bucket === 'agency-assets' || bucket === 'property-images') {
    return 'imobzyimg';
  }

  if (bucket === 'imobzymsg' || bucket === 'whatsapp-media') {
    return bucket;
  }

  return 'imobzyimg';
}
