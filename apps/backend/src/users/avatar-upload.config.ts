import { randomUUID } from 'crypto';

export const AVATAR_UPLOAD_DIR =
  process.env.AVATAR_UPLOAD_DIR ?? './uploads/avatars';
export const AVATAR_MAX_SIZE_BYTES = Number(
  process.env.AVATAR_MAX_SIZE_BYTES ?? 2 * 1024 * 1024,
);

export const AVATAR_ALLOWED_MIME_TYPE = /^image\/(png|jpeg|webp)$/;

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

export function avatarFilenameFor(userId: string, mimeType: string): string {
  const ext = EXTENSION_BY_MIME_TYPE[mimeType] ?? '';
  return `${userId}-${randomUUID()}${ext}`;
}
