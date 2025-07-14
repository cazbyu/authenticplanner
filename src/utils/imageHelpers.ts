import { supabase } from '../supabaseClient';

/**
 * Generates a signed URL for an image stored in Supabase Storage.
 * Accepts either a relative file path or a full Supabase URL.
 * Logs the extracted relative path for debugging.
 *
 * @param imagePath - The storage path (e.g., 'user-xxx/filename.jpg') or full URL.
 * @param expiresIn - How long the URL should last (default: 3600 seconds = 1 hour)
 * @returns The signed URL string, or null on failure.
 */
export const getSignedImageUrl = async (
  imagePath: string,
  expiresIn: number = 3600
): Promise<string | null> => {
  if (!imagePath) return null;

  let relativePath = imagePath;

  // If imagePath is a full URL (contains protocol), extract the relative storage path
  if (imagePath.includes('://')) {
    try {
      const url = new URL(imagePath);
      // Find where the bucket name appears in the path
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(
        (part) => part === '0007-key-relationship-images'
      );
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        relativePath = pathParts.slice(bucketIndex + 1).join('/');
      } else {
        console.error('Could not extract relative path from URL:', imagePath);
        return null;
      }
    } catch (err) {
      console.error('Invalid URL format for imagePath:', imagePath, err);
      return null;
    }
  }

  // DEBUG LOG: Show the path you’re sending to Supabase (for troubleshooting invisible chars)
  console.log(
    '[getSignedImageUrl] Requesting signed URL for:',
    JSON.stringify(relativePath),
    '| Length:',
    relativePath.length
  );

  try {
    const { data, error } = await supabase.storage
      .from('0007-key-relationship-images')
      .createSignedUrl(relativePath, expiresIn);

    if (error) {
      console.error(
        '[getSignedImageUrl] Error creating signed URL for path:',
        JSON.stringify(relativePath),
        '| Length:',
        relativePath.length,
        error
      );
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error(
      '[getSignedImageUrl] Unexpected error for path:',
      JSON.stringify(relativePath),
      err
    );
    return null;
  }
};
