import { SignJWT, jwtVerify } from 'jose';

export type JWTPayload = {
  userId: string;
  email: string;
  role: string;
};

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-minimum-32-characters-long'
);

export async function signToken(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return token;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload as JWTPayload;
  } catch (error) {
    return null;
  }
}
