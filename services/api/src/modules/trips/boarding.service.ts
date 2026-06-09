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

export interface ActiveRide {
  boarding: Boarding;
  trip: Trip | null;
}

export interface BoardingHistoryItem {
  id: string;
  tripId: string;
  routeName: string | null;
  origin: string | null;
  destination: string | null;
  tokensSpent: number;
  status: Boarding['status'];
  createdAt: Date;
}

export class BoardingService {
  constructor(
    private readonly trips: TripRepository,
    private readonly boardings: BoardingRepository,
    private readonly subscriptions: SubscriptionService,
  ) {}

  /**
   * Board a trip. A rider may hold only one active ride at a time and may
   * board a given trip only once. Spends the route fare in tokens, then
   * records an active boarding.
   */
  async board(userId: string, tripId: string): Promise<BoardResult> {
    const trip = await this.trips.findById(tripId);
    if (!trip) {
      throw AppError.notFound('Trip not found', 'TRIP_NOT_FOUND');
    }
    if (trip.status !== 'scheduled' && trip.status !== 'active') {
      throw AppError.badRequest('This trip is no longer boardable', 'TRIP_NOT_BOARDABLE');
    }
    if (await this.boardings.findActiveByUser(userId)) {
      throw AppError.conflict('Finish your current ride before boarding another', 'ON_RIDE');
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

  /** The rider's current active ride (with trip details), or null. */
  async activeRide(userId: string): Promise<ActiveRide | null> {
    const boarding = await this.boardings.findActiveByUser(userId);
    if (!boarding) return null;
    const trip = await this.trips.findById(boarding.tripId);
    return { boarding, trip };
  }

  /** End the rider's active ride so they can board again. */
  async completeRide(userId: string): Promise<Boarding> {
    const completed = await this.boardings.completeActive(userId);
    if (!completed) {
      throw AppError.notFound('No active ride to end', 'NO_ACTIVE_RIDE');
    }
    return completed;
  }

  /** Boarding history enriched with the route details of each trip. */
  async history(userId: string): Promise<BoardingHistoryItem[]> {
    const rows = await this.boardings.listByUser(userId);
    return Promise.all(
      rows.map(async (b) => {
        const trip = await this.trips.findById(b.tripId);
        return {
          id: b.id,
          tripId: b.tripId,
          routeName: trip?.routeName ?? null,
          origin: trip?.origin ?? null,
          destination: trip?.destination ?? null,
          tokensSpent: b.tokensSpent,
          status: b.status,
          createdAt: b.createdAt,
        };
      }),
    );
  }
}
