/**
 * JWT signing secret. Never fall back to a hardcoded value.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || '';
  if (!secret.trim()) {
    throw new Error('JWT_SECRET is not configured. Set it in backend/.env (see .env.example).');
  }
  return secret;
}
