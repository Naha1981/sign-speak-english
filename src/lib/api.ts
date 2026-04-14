const BASE_API_URL = import.meta.env.VITE_API_BASE_URL || 'https://sasl-perplexity-1-backend.onrender.com';

export type UploadVideoDto = {
  title: string;
  grade_level: string;
  storage_url: string;
  duration_sec: number;
  is_published: boolean;
};

export async function uploadVideoToBackend(
  dto: UploadVideoDto
): Promise<{
  id: string;
  title: string;
  grade_level: string;
  language: string;
  is_published: boolean;
  storage_url: string;
  duration_sec: number;
}> {
  const response = await fetch(`${BASE_API_URL}/videos/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Upload failed:', text);
    throw new Error('Failed to upload video metadata');
  }

  return response.json();
}
