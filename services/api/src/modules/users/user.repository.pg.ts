import type { Pool } from 'pg';
import type { Role } from '../../lib/jwt';
import type { NewUser, User, UserRepository } from './user.repository';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  created_at: Date;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
  };
}

export class PgUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: NewUser): Promise<User> {
    const { rows } = await this.pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, password_hash, role, created_at`,
      [input.email.toLowerCase(), input.passwordHash, input.role],
    );
    return toUser(rows[0]!);
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT id, email, password_hash, role, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT id, email, password_hash, role, created_at
       FROM users WHERE id = $1`,
      [id],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }
}
