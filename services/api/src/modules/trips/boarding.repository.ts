import { randomUUID } from 'node:crypto';
import { AppError } from '../../lib/errors';
import type { Boarding } from '../routes/route.types';

export interface NewBoarding {
  userId: string;
  tripId: string;
  tokensSpent: number;
}

export interface BoardingRepository {
  create(input: NewBoarding): Promise<Boarding>;
  listByUser(userId: string): Promise<Boarding[]>;
  exists(userId: string, tripId: string): Promise<boolean>;
}

export class InMemoryBoardingRepository implements BoardingRepository {
  private readonly rows: Boarding[] = [];

  async create(input: NewBoarding): Promise<Boarding> {
    if (await this.exists(input.userId, input.tripId)) {
      throw AppError.conflict('Already boarded this trip', 'ALREADY_BOARDED');
    }
    const boarding: Boarding = {
      id: randomUUID(),
      userId: input.userId,
      tripId: input.tripId,
      tokensSpent: input.tokensSpent,
      createdAt: new Date(),
    };
    this.rows.push(boarding);
    return boarding;
  }

  async listByUser(userId: string): Promise<Boarding[]> {
    return this.rows
      .filter((b) => b.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async exists(userId: string, tripId: string): Promise<boolean> {
    return this.rows.some((b) => b.userId === userId && b.tripId === tripId);
  }
}
