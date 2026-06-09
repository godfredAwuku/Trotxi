import { AppError } from '../../lib/errors';
import type { Boarding, Trip } from '../routes/route.types';
import type { Subscription } from '../subscriptions/subscription.repository';
import type { SubscriptionService } from '../subscriptions/subscription.service';
import type { BoardingRepository } from './boarding.repository';
import type { TripRepository } from './trip.repository';

export interface BoardResult {
  boarding: Boarding;
  subscription: Subscription;
  trip: Trip;
}

export class BoardingService {
  constructor(
    private readonly trips: TripRepository,
    private readonly boardings: BoardingRepository,
    private readonly subscriptions: SubscriptionService,
  ) {}

  /**
   * Board a trip: validates the trip, ensures the rider hasn't already boarded,
   * spends the route fare in tokens, then records the boarding.
   */
  async board(userId: string, tripId: string): Promise<BoardResult> {
    const trip = await this.trips.findById(tripId);
    if (!trip) {
      throw AppError.notFound('Trip not found', 'TRIP_NOT_FOUND');
    }
    if (trip.status !== 'scheduled' && trip.status !== 'active') {
      throw AppError.badRequest('This trip is no longer boardable', 'TRIP_NOT_BOARDABLE');
    }
    if (await this.boardings.exists(userId, tripId)) {
      throw AppError.conflict('You have already boarded this trip', 'ALREADY_BOARDED');
    }

    // Spend the fare first — this enforces the subscription/balance guards.
    const subscription = await this.subscriptions.redeem(userId, trip.fareTokens);
    const boarding = await this.boardings.create({
      userId,
      tripId,
      tokensSpent: trip.fareTokens,
    });
    return { boarding, subscription, trip };
  }

  async history(userId: string): Promise<Boarding[]> {
    return this.boardings.listByUser(userId);
  }
}
