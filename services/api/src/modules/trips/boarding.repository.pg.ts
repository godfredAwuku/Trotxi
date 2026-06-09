import type { Pool } from 'pg';
import type { Boarding, BoardingStatus } from '../routes/route.types';
import type { BoardingRepository, NewBoarding } from './boarding.repository';

interface BoardingRow {
  id: string;
  user_id: string;
  trip_id: string;
  tokens_spent: number;
  status: BoardingStatus;
  created_at: Date;
}

const COLS = 'id, user_id, trip_id, tokens_spent, status, created_at';

const toBoarding = (r: BoardingRow): Boarding => ({
  id: r.id,
  userId: r.user_id,
  tripId: r.trip_id,
  tokensSpent: r.tokens_spent,
  status: r.status,
  createdAt: r.created_at,
});

export class PgBoardingRepository implements BoardingRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: NewBoarding): Promise<Boarding> {
    const { rows } = await this.pool.query<BoardingRow>(
      `INSERT INTO boardings (user_id, trip_id, tokens_spent, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING ${COLS}`,
      [input.userId, input.tripId, input.tokensSpent],
    );
    return toBoarding(rows[0]!);
  }

  async listByUser(userId: string): Promise<Boarding[]> {
    const { rows } = await this.pool.query<BoardingRow>(
      `SELECT ${COLS} FROM boardings WHERE user_id = $1 ORDER BY created_at DESC`,
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

  async findActiveByUser(userId: string): Promise<Boarding | null> {
    const { rows } = await this.pool.query<BoardingRow>(
      `SELECT ${COLS} FROM boardings WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId],
    );
    return rows[0] ? toBoarding(rows[0]) : null;
  }

  async completeActive(userId: string): Promise<Boarding | null> {
    const { rows } = await this.pool.query<BoardingRow>(
      `UPDATE boardings SET status = 'completed'
       WHERE user_id = $1 AND status = 'active'
       RETURNING ${COLS}`,
      [userId],
    );
    return rows[0] ? toBoarding(rows[0]) : null;
  }
}
