export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
export function deriveLegs(legs: Array<{ origin: string; destination: string; plannedDepartureAt?: string | Date; durationDays: number; notes?: string }>, initial: Date) {
  let previousArrival = initial;
  return legs.map((leg, index) => {
    const departure = index === 0 ? new Date(leg.plannedDepartureAt || initial) : new Date(leg.plannedDepartureAt || previousArrival);
    const arrival = addDays(departure, leg.durationDays);
    previousArrival = arrival;
    return { ...leg, sequence: index + 1, plannedDepartureAt: departure, plannedArrivalAt: arrival };
  });
}
