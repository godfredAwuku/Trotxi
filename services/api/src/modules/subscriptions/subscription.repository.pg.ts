import type { Pool } from 'pg';
import type {
  NewSubscription,
  Subscription,
  SubscriptionPlan,
  SubscriptionRepository,
  SubscriptionStatus,
} from './subscription.repository';

interface SubRow {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  token_balance: number;
  started_at: Date;
  expires_at: Date;
}

function toSub(row: SubRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    status: row.status,
    tokenBalance: row.token_balance,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
  };
}

export class PgSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: NewSubscription): Promise<Subscription> {
    const { rows } = await this.pool.query<SubRow>(
      `INSERT INTO subscriptions (user_id, plan, token_balance, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, plan, status, token_balance, started_at, expires_at`,
      [input.userId, input.plan, input.tokenBalance, input.expiresAt],
    );
    return toSub(rows[0]!);
  }

  async findActiveByUser(userId: string): Promise<Subscription | null> {
    const { rows } = await this.pool.query<SubRow>(
      `SELECT id, user_id, plan, status, token_balance, started_at, expires_at
       FROM subscriptions WHERE user_id = $1 AND status = 'active'
       ORDER BY started_at DESC LIMIT 1`,
      [userId],
    );
    return rows[0] ? toSub(rows[0]) : null;
  }

  async updateTokenBalance(id: string, balance: number): Promise<Subscription> {
    const { rows } = await this.pool.query<SubRow>(
      `UPDATE subscriptions SET token_balance = $2 WHERE id = $1
       RETURNING id, user_id, plan, status, token_balance, started_at, expires_at`,
      [id, balance],
    );
    if (!rows[0]) throw new Error(`Subscription ${id} not found`);
    return toSub(rows[0]);
  }
}
