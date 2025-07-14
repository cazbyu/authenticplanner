import { supabase } from '../supabaseClient';

/**
 * Gets a signed URL for an image stored in Supabase Storage
 * 
 * @param imagePath The storage path/key of the image (e.g., 'user-abc123/photo.jpg')
 * @param expiresIn Number of seconds until the URL expires (default: 3600 = 1 hour)
 * @returns The signed URL or null if there was an error
 */
export const getSignedImageUrl = async (imagePath: string, expiresIn: number = 3600): Promise<string | null> => {
  if (!imagePath) return null;
  
  try {
    const { data, error } = await supabase
      .storage
      .from('0007-key-relationship-images')
      .createSignedUrl(imagePath, expiresIn);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  } catch (err) {
    console.error('Unexpected error creating signed URL:', err);
    return null;
  }
};