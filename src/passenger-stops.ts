import { TAXI_STOPS, type TaxiStopId } from './village';
import { vergePosition } from './placement';

/** A customer, their map pin and both taxi drivers share one physical stop. */
export const PASSENGER_STOPS = TAXI_STOPS.map((stop) => ({
  ...stop,
  ...vergePosition({ x: stop.npcX, z: stop.npcZ }),
}));
export const passengerStop = (id: TaxiStopId) => PASSENGER_STOPS.find((s) => s.id === id)!;
