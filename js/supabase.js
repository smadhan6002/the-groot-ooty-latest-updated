// Initialize and export a single reusable Supabase client instance
export const SUPABASE_URL = 'https://jritiortuorrpcfkoupf.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyaXRpb3J0dW9ycnBjZmtvdXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1ODkwMjMsImV4cCI6MjEwNDE2NTAyM30.aV_Z6atA8OgrPZFQ_Oj74u24nGYocz2L8XQXpSRgk0Q';

let client = null;
try {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.warn('Supabase CDN offline or unreachable; using local store fallback:', err);
  const chainable = () => ({
    select: () => Promise.resolve({ data: null, error: null }),
    order: () => Promise.resolve({ data: null, error: null }),
    eq: () => ({
      select: () => Promise.resolve({ data: null, error: null })
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({
      eq: () => ({
        select: () => Promise.resolve({ data: null, error: null })
      })
    })
  });
  client = {
    from: chainable,
    storage: {
      from: () => ({
        getPublicUrl: (f) => ({ data: { publicUrl: `assets/images/${f}` } })
      })
    }
  };
}

export const supabase = client;

/**
 * Helper function to generate Supabase Storage public URLs
 * @param {string} bucket - The storage bucket name
 * @param {string} fileName - The name of the file
 * @returns {string} The public URL for the image
 */
export function getStorageImageUrl(bucket, fileName) {
  if (supabase && supabase.storage) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data ? data.publicUrl : `assets/images/${fileName}`;
  }
  return `assets/images/${fileName}`;
}

if (typeof window !== 'undefined') {
  window.supabase = supabase;
  window.getStorageImageUrl = getStorageImageUrl;
}
