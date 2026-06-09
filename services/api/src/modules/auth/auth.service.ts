import { AppError } from '../../lib/errors';
import { signToken, type JwtConfig, type Role } from '../../lib/jwt';
import { hashPassword, verifyPassword } from '../../lib/password';
import type { User, UserRepository } from '../users/user.repository';

export interface RegisterInput {
  email: string;
  password: string;
  role?: Role;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: { id: string; email: string; role: Role };
}

function publicUser(user: User): AuthResult['user'] {
  return { id: user.id, email: user.email, role: user.role };
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly jwt: JwtConfig,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
    }
    const passwordHash = await hashPassword(input.password);
    const user = await this.users.create({
      email: input.email,
      passwordHash,
      role: input.role ?? 'commuter',
    });
    return { token: this.issue(user), user: publicUser(user) };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }
    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }
    return { token: this.issue(user), user: publicUser(user) };
  }

  private issue(user: User): string {
    return signToken({ sub: user.id, email: user.email, role: user.role }, this.jwt);
  }
}
