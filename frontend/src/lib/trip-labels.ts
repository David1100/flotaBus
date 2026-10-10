export const TRIP_STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planificado',
  ASSIGNED: 'Asignado',
  IN_TRANSIT: 'En ruta',
  IN_ROUTE: 'En ruta',
  STOPPED: 'En parada',
  PAUSED_LUNCH: 'En pausa de almuerzo',
  REFUELING: 'Tanqueando',
  MAINTENANCE: 'En mantenimiento',
  OUT_OF_ROUTE: 'Fuera de ruta',
  INCIDENT: 'Incidencia',
  ARRIVED: 'Llegó',
  RETURNED: 'Completado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  CANCELED: 'Cancelado',
};

/** One visible label per backend operation state, plus fleet-only states. */
export const BUS_STATUS_LABELS: Record<string, string> = {
  INACTIVE: 'Inactivo',
  AVAILABLE: 'Disponible',
  ...TRIP_STATUS_LABELS,
};
export const BUS_OPERATIONAL_STATUS_OPTIONS = [
  ['AVAILABLE', 'Disponible'], ['ASSIGNED', 'Ruta asignada'], ['IN_TRANSIT', 'En ruta'],
  ['MAINTENANCE', 'En mantenimiento'], ['OUT_OF_ROUTE', 'Fuera de ruta'], ['STOPPED', 'Parada del chofer'],
  ['REFUELING', 'Tanqueando'], ['INCIDENT', 'Incidencia'],
] as const;
for (const [value, label] of BUS_OPERATIONAL_STATUS_OPTIONS) BUS_STATUS_LABELS[value] = label;

export const OPERATION_EVENT_LABELS: Record<string, string> = {
  STARTED: 'Iniciar viaje',
  STOPPED: 'Registrar parada',
  LUNCH_STARTED: 'Iniciar pausa de almuerzo',
  LUNCH_ENDED: 'Reanudar viaje',
  INCIDENT: 'Registrar incidencia',
  INCIDENT_RESOLVED: 'Resolver incidencia',
  ARRIVED: 'Registrar llegada',
  RETURNED: 'Confirmar retorno',
  CANCELLED: 'Cancelar viaje',
};

// Keep aliases readable for records from older API versions, but expose one
// option per backend enum value so filters never render duplicate labels.
export const TRIP_STATUS_OPTIONS = [
  'PLANNED', 'ASSIGNED', 'IN_TRANSIT', 'STOPPED', 'PAUSED_LUNCH',
  'INCIDENT', 'ARRIVED', 'RETURNED', 'CANCELLED',
].map((value) => ({ value, label: TRIP_STATUS_LABELS[value] }));
export const EDITABLE_TRIP_STATUSES = new Set(['PLANNED', 'ASSIGNED']);
export const isTripEditable = (status: string) => EDITABLE_TRIP_STATUSES.has(status);
export const OPERATION_EVENT_OPTIONS = Object.entries(OPERATION_EVENT_LABELS).map(([value, label]) => ({ value, label }));

export const tripStatusLabel = (status: string) => TRIP_STATUS_LABELS[status] ?? 'Estado no disponible';
export const busStatusLabel = (status: string) => BUS_STATUS_LABELS[status] ?? 'Estado no disponible';
export const busStatusClass = (status: string) => {
  if (status === 'INACTIVE' || ['CANCELLED', 'INCIDENT'].includes(status)) return 'is-inactive';
  if (status === 'AVAILABLE' || ['RETURNED', 'ARRIVED'].includes(status)) return 'is-active';
  return 'is-planned';
};
export const operationEventLabel = (type: string) => OPERATION_EVENT_LABELS[type] ?? 'Evento operativo';

export const tripStatusClass = (status: string) => {
  if (['RETURNED', 'ARRIVED', 'COMPLETED'].includes(status)) return 'is-active';
  if (['CANCELLED', 'INCIDENT', 'OUT_OF_ROUTE'].includes(status)) return 'is-inactive';
  return 'is-planned';
};
