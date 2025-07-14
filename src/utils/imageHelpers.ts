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
  
  // Extract relative path if imagePath is a full URL
  let relativePath = imagePath;
  
  // Check if imagePath is a full URL (contains protocol)
  if (imagePath.includes('://')) {
    try {
      const url = new URL(imagePath);
      // Extract the path after the bucket name
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === '0007-key-relationship-images');
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        relativePath = pathParts.slice(bucketIndex + 1).join('/');
      } else {
        console.error('Could not extract relative path from URL:', imagePath);
        return null;
      }
    } catch (err) {
      console.error('Invalid URL format:', imagePath);
      return null;
    }
  }
  
  try {
    const { data, error } = await supabase
      .storage
      .from('0007-key-relationship-images')
      .createSignedUrl(relativePath, expiresIn);
    
    if (error) {
      console.error('Error creating signed URL for path:', relativePath, error);
      return null;
    }
    
    return data.signedUrl;
  } catch (err) {
    console.error('Unexpected error creating signed URL for path:', relativePath, err);
    return null;
  }
};