import type { Route, Stop, Trip, Vehicle } from '../modules/routes/route.types';

// Stable demo IDs so cross-references hold across in-memory repos and SQL seed.
export const DEMO = {
  vehicles: {
    sprinter: '11111111-1111-1111-1111-111111111111',
    coaster: '22222222-2222-2222-2222-222222222222',
  },
  routes: {
    circleMadina: 'aaaaaaaa-0000-0000-0000-000000000001',
    kaneshieTema: 'aaaaaaaa-0000-0000-0000-000000000002',
    achimotaCentral: 'aaaaaaaa-0000-0000-0000-000000000003',
  },
} as const;

export const demoVehicles: Vehicle[] = [
  { id: DEMO.vehicles.sprinter, plate: 'GT-1234-20', label: 'Mercedes Sprinter', capacity: 18 },
  { id: DEMO.vehicles.coaster, plate: 'GR-5678-21', label: 'Toyota Coaster', capacity: 29 },
];

export const demoRoutes: Route[] = [
  {
    id: DEMO.routes.circleMadina,
    name: 'Circle – Madina Express',
    origin: 'Kwame Nkrumah Circle',
    destination: 'Madina Market',
    fareTokens: 1,
    active: true,
  },
  {
    id: DEMO.routes.kaneshieTema,
    name: 'Kaneshie – Tema',
    origin: 'Kaneshie Terminal',
    destination: 'Tema Station',
    fareTokens: 2,
    active: true,
  },
  {
    id: DEMO.routes.achimotaCentral,
    name: 'Achimota – Accra Central',
    origin: 'Achimota New Station',
    destination: 'Accra Central (Tudu)',
    fareTokens: 1,
    active: true,
  },
];

export const demoStops: Stop[] = [
  // Circle – Madina
  { id: 's1-1', routeId: DEMO.routes.circleMadina, name: 'Kwame Nkrumah Circle', lat: 5.5709, lng: -0.2074, seq: 1 },
  { id: 's1-2', routeId: DEMO.routes.circleMadina, name: 'Sankara Interchange', lat: 5.5772, lng: -0.1969, seq: 2 },
  { id: 's1-3', routeId: DEMO.routes.circleMadina, name: '37 Station', lat: 5.5847, lng: -0.1869, seq: 3 },
  { id: 's1-4', routeId: DEMO.routes.circleMadina, name: 'Shiashie', lat: 5.6201, lng: -0.1719, seq: 4 },
  { id: 's1-5', routeId: DEMO.routes.circleMadina, name: 'Madina Market', lat: 5.6837, lng: -0.1668, seq: 5 },
  // Kaneshie – Tema
  { id: 's2-1', routeId: DEMO.routes.kaneshieTema, name: 'Kaneshie Terminal', lat: 5.5599, lng: -0.2335, seq: 1 },
  { id: 's2-2', routeId: DEMO.routes.kaneshieTema, name: 'Mallam Atta', lat: 5.5731, lng: -0.2189, seq: 2 },
  { id: 's2-3', routeId: DEMO.routes.kaneshieTema, name: 'Tema Station', lat: 5.6698, lng: -0.0166, seq: 3 },
  // Achimota – Accra Central
  { id: 's3-1', routeId: DEMO.routes.achimotaCentral, name: 'Achimota New Station', lat: 5.6189, lng: -0.2278, seq: 1 },
  { id: 's3-2', routeId: DEMO.routes.achimotaCentral, name: 'Lapaz', lat: 5.6066, lng: -0.2540, seq: 2 },
  { id: 's3-3', routeId: DEMO.routes.achimotaCentral, name: 'Accra Central (Tudu)', lat: 5.5485, lng: -0.2086, seq: 3 },
];

const MIN = 60 * 1000;

/** Upcoming/active demo trips relative to `now`. */
export function demoTrips(now: Date = new Date()): Trip[] {
  const t = now.getTime();
  const r = (id: string) => demoRoutes.find((x) => x.id === id)!;
  const make = (
    id: string,
    routeId: string,
    vehicleId: string,
    offsetMin: number,
    status: Trip['status'],
  ): Trip => {
    const route = r(routeId);
    const vehicle = demoVehicles.find((v) => v.id === vehicleId)!;
    return {
      id,
      routeId,
      routeName: route.name,
      origin: route.origin,
      destination: route.destination,
      fareTokens: route.fareTokens,
      vehicleId: vehicle.id,
      vehicleLabel: vehicle.label,
      scheduledAt: new Date(t + offsetMin * MIN),
      status,
    };
  };
  return [
    make('trip-1', DEMO.routes.circleMadina, DEMO.vehicles.sprinter, -5, 'active'),
    make('trip-2', DEMO.routes.circleMadina, DEMO.vehicles.coaster, 20, 'scheduled'),
    make('trip-3', DEMO.routes.kaneshieTema, DEMO.vehicles.coaster, 35, 'scheduled'),
    make('trip-4', DEMO.routes.achimotaCentral, DEMO.vehicles.sprinter, 50, 'scheduled'),
  ];
}
