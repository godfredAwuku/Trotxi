import { randomUUID } from 'node:crypto';
import type { Role } from '../../lib/jwt';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

export interface NewUser {
  email: string;
  passwordHash: string;
  role: Role;
}

export interface UserRepository {
  create(user: NewUser): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}

export class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, User>();
  private readonly byEmail = new Map<string, User>();

  async create(input: NewUser): Promise<User> {
    const user: User = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role,
      createdAt: new Date(),
    };
    this.byId.set(user.id, user);
    this.byEmail.set(user.email, user);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.byEmail.get(email.toLowerCase()) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }
}
