import bcrypt from 'bcryptjs';

/**
 * PHP password_hash() uses the $2y$ prefix. bcryptjs understands $2a$ / $2b$.
 */
export function normalizePhpBcryptHash(hash: string): string {
  if (hash.startsWith('$2y$')) {
    return '$2a$' + hash.slice(4);
  }
  return hash;
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) {
    return false;
  }
  try {
    return await bcrypt.compare(plain, normalizePhpBcryptHash(hash));
  } catch {
    return false;
  }
}
