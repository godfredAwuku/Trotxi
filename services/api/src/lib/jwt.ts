import jwt from 'jsonwebtoken';

export type Role = 'commuter' | 'driver' | 'admin';

export interface AuthClaims {
  sub: string;
  email: string;
  role: Role;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export function signToken(claims: AuthClaims, config: JwtConfig): string {
  return jwt.sign(claims, config.secret, {
    expiresIn: config.expiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string, config: JwtConfig): AuthClaims {
  const decoded = jwt.verify(token, config.secret);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }
  return {
    sub: String(decoded.sub),
    email: String(decoded.email),
    role: decoded.role as Role,
  };
}
