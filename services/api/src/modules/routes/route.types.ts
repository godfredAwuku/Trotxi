export interface Vehicle {
  id: string;
  plate: string;
  label: string;
  capacity: number;
}

export interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  fareTokens: number;
  active: boolean;
}

export interface Stop {
  id: string;
  routeId: string;
  name: string;
  lat: number;
  lng: number;
  seq: number;
}

export type TripStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

/** A trip with its route/vehicle details denormalized for read convenience. */
export interface Trip {
  id: string;
  routeId: string;
  routeName: string;
  origin: string;
  destination: string;
  fareTokens: number;
  vehicleId: string | null;
  vehicleLabel: string | null;
  scheduledAt: Date;
  status: TripStatus;
}

export interface Boarding {
  id: string;
  userId: string;
  tripId: string;
  tokensSpent: number;
  createdAt: Date;
}
