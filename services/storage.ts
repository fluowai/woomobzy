
import { supabase } from './supabase';

export const uploadFile = async (
  file: File, 
  bucket: 'agency-assets' | 'property-images',
  folder?: string
): Promise<string | null> => {
  try {
    // Sanitiza o nome do arquivo para evitar problemas de caracteres especiais
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      console.error('Erro detalhado no upload:', uploadError);
      alert(`Erro no upload: ${uploadError.message}`); // Feedback visual para o usuário
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log('Upload sucesso. URL:', data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error('Falha ao fazer upload da imagem:', error);
    return null;
  }
};
