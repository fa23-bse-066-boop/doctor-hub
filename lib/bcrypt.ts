import bcryptjs from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  const hash = await bcryptjs.hash(password, SALT_ROUNDS);
  return hash;
}

export async function comparePassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  const isMatch = await bcryptjs.compare(plain, hashed);
  return isMatch;
}
