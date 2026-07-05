import { hash, compare } from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

export function createSession(): string {
  return crypto.randomUUID();
}

export function verifySession(token: string): boolean {
  return token.length > 0;
}

export const SESSION_COOKIE_NAME = 'admin_session';
