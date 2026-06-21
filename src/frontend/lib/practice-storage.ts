import { createSupabaseServiceClient } from "@/lib/supabase/server";

import { MAX_IMAGES_PER_SUBMIT } from "@/lib/practice-grader";

export { MAX_IMAGES_PER_SUBMIT };
export const PRACTICE_IMAGES_BUCKET = "practice-images";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type PracticeImageInput = {
  base64: string;
  mimeType: string;
};

export async function uploadPracticeImages(
  userId: string,
  moduleId: string,
  submissionId: string,
  images: PracticeImageInput[],
): Promise<string[]> {
  const supabase = createSupabaseServiceClient();
  const paths: string[] = [];

  for (let i = 0; i < images.length; i += 1) {
    const { base64, mimeType } = images[i];
    const ext = MIME_EXT[mimeType] ?? "png";
    const path = `${userId}/${moduleId}/${submissionId}/${i}.${ext}`;
    const buffer = Buffer.from(base64, "base64");

    const { error } = await supabase.storage
      .from(PRACTICE_IMAGES_BUCKET)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) throw error;
    paths.push(path);
  }

  return paths;
}

export async function createPracticeImageSignedUrls(
  paths: string[],
  expiresIn = 3600,
): Promise<string[]> {
  if (paths.length === 0) return [];

  const supabase = createSupabaseServiceClient();
  const urls: string[] = [];

  for (const path of paths) {
    const { data, error } = await supabase.storage
      .from(PRACTICE_IMAGES_BUCKET)
      .createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) continue;
    urls.push(data.signedUrl);
  }

  return urls;
}
