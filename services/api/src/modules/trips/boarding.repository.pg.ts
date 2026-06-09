import type { Pool } from 'pg';
import type { Boarding } from '../routes/route.types';
import type { BoardingRepository, NewBoarding } from './boarding.repository';

interface BoardingRow {
  id: string;
  user_id: string;
  trip_id: string;
  tokens_spent: number;
  created_at: Date;
}

const toBoarding = (r: BoardingRow): Boarding => ({
  id: r.id,
  userId: r.user_id,
  tripId: r.trip_id,
  tokensSpent: r.tokens_spent,
  createdAt: r.created_at,
});

export class PgBoardingRepository implements BoardingRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: NewBoarding): Promise<Boarding> {
    const { rows } = await this.pool.query<BoardingRow>(
      `INSERT INTO boardings (user_id, trip_id, tokens_spent)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, trip_id, tokens_spent, created_at`,
      [input.userId, input.tripId, input.tokensSpent],
    );
    return toBoarding(rows[0]!);
  }

  async listByUser(userId: string): Promise<Boarding[]> {
    const { rows } = await this.pool.query<BoardingRow>(
      `SELECT id, user_id, trip_id, tokens_spent, created_at
       FROM boardings WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map(toBoarding);
  }

  async exists(userId: string, tripId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM boardings WHERE user_id = $1 AND trip_id = $2 LIMIT 1`,
      [userId, tripId],
    );
    return rows.length > 0;
  }
}
