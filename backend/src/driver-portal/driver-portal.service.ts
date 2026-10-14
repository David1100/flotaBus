import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Estados en los que el viaje sigue siendo responsabilidad operativa del chofer:
 * debe ver la tarjeta con sus acciones. INCIDENT y ARRIVED se incluyen porque el
 * chofer aún debe resolver la incidencia o confirmar el retorno; excluirlos hacía
 * que el viaje desapareciera de su panel y quedara trabado sin salida.
 */
const ACTIVE_TRIP_STATUSES = ['ASSIGNED', 'IN_TRANSIT', 'STOPPED', 'PAUSED_LUNCH', 'INCIDENT', 'ARRIVED'] as const;

@Injectable()
export class DriverPortalService {
  constructor(private readonly db: PrismaService) {}

  async dashboard(driverId: number) {
    const driver = await this.db.user.findUnique({
      where: { id: driverId },
      select: { id: true, codigo: true, nombres: true, username: true, telefono: true, photoUrl: true, defaultBusId: true },
    });
    if (!driver) throw new NotFoundException('Chofer no encontrado.');

    const activeAssignments = await this.db.assignment.findMany({
      where: { driverId, status: 'ACTIVE' },
      include: {
        trip: {
          include: {
            legs: { orderBy: { sequence: 'asc' }, include: { execution: { select: { id: true, status: true, actualDepartureAt: true, actualArrivalAt: true } } } },
          },
        },
        bus: { select: { id: true, placa: true, marca: true, modelo: true, kilometraje: true, busType: true, isActive: true, manualStatus: true, photoUrl: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // activeAssignment manda sobre activeTrip: sólo viajes abiertos muestran controles.
    // La unidad, en cambio, es la de la asignación activa aunque el viaje ya haya
    // cerrado: el chofer siempre tiene bus y no debe perderlo de su panel al finalizar.
    const assignmentsWithTrip = activeAssignments.filter((a): a is typeof a & { trip: NonNullable<typeof a.trip> } => Boolean(a.trip));
    const activeAssignment = assignmentsWithTrip.find((a) => ACTIVE_TRIP_STATUSES.includes(a.trip.status as any)) ?? null;
    const busAssignment = activeAssignment ?? assignmentsWithTrip[0] ?? null;

    const currentBus = busAssignment
      ? {
          ...busAssignment.bus,
          status: !busAssignment.bus.isActive ? 'INACTIVE' : busAssignment.trip.status,
          currentAssignment: {
            id: busAssignment.id,
            tripId: busAssignment.tripId,
            trip: { code: busAssignment.trip.code, status: busAssignment.trip.status },
          },
        }
      : null;

    const allAssignedTrips = await this.db.assignment.findMany({
      where: { driverId },
      include: {
        trip: {
          include: {
            legs: { orderBy: { sequence: 'asc' }, take: 1, select: { destination: true, plannedDepartureAt: true } },
            _count: { select: { legs: true } },
          },
        },
      },
      orderBy: { trip: { initialStartAt: 'desc' } },
      take: 50,
    });
    const upcomingTrips = allAssignedTrips
      .filter((a) => a.status === 'ACTIVE' && a.trip.status === 'ASSIGNED')
      .slice(0, 3);

    const recentMaintenance = currentBus
      ? await this.db.maintenanceRecord.findMany({
          where: { busId: currentBus.id },
          orderBy: { recordedAt: 'desc' },
          take: 5,
          select: { id: true, category: true, area: true, detail: true, cost: true, photoUrl: true, recordedAt: true },
        })
      : [];

    const admins = await this.admins();

    return {
      driver,
      activeTrip: activeAssignment
        ? {
            id: activeAssignment.trip.id,
            code: activeAssignment.trip.code,
            origin: activeAssignment.trip.origin,
            timezone: activeAssignment.trip.timezone,
            initialStartAt: activeAssignment.trip.initialStartAt,
            notes: activeAssignment.trip.notes,
            status: activeAssignment.trip.status,
            legs: activeAssignment.trip.legs.map((leg) => ({
              id: leg.id,
              sequence: leg.sequence,
              origin: leg.origin,
              destination: leg.destination,
              plannedDepartureAt: leg.plannedDepartureAt,
              plannedArrivalAt: leg.plannedArrivalAt,
              durationDays: leg.durationDays,
              notes: leg.notes,
              execution: leg.execution,
            })),
          }
        : null,
      currentBus,
      upcomingTrips: upcomingTrips.map(a => ({
        assignmentId: a.id,
        assignedAt: a.assignedAt,
        trip: { id: a.trip.id, code: a.trip.code, status: a.trip.status, origin: a.trip.origin, initialStartAt: a.trip.initialStartAt, firstDestination: a.trip.legs[0]?.destination ?? null, legsCount: a.trip._count.legs },
      })),
      allTrips: allAssignedTrips.map(a => ({
        assignmentId: a.id,
        assignedAt: a.assignedAt,
        revokedAt: a.revokedAt,
        trip: { id: a.trip.id, code: a.trip.code, status: a.trip.status, origin: a.trip.origin, initialStartAt: a.trip.initialStartAt, firstDestination: a.trip.legs[0]?.destination ?? null, legsCount: a.trip._count.legs },
      })),
      recentMaintenance,
      admins,
    };
  }

  async admins() {
    const items = await this.db.user.findMany({
      where: { rol: 'ADMINISTRADOR', isActive: true },
      orderBy: [{ nombres: 'asc' }],
      select: { id: true, nombres: true, username: true },
    });
    return items;
  }

  async tripDetail(driverId: number, tripId: number) {
    const assignment = await this.db.assignment.findFirst({
      where: { driverId, tripId },
      select: { id: true, status: true },
    });
    if (!assignment) throw new NotFoundException('Viaje no encontrado.');
    const trip = await this.db.trip.findUnique({
      where: { id: tripId },
      include: {
        legs: {
          orderBy: { sequence: 'asc' },
          include: { execution: { select: { id: true, status: true, actualDepartureAt: true, actualArrivalAt: true } } },
        },
      },
    });
    if (!trip) throw new NotFoundException('Viaje no encontrado.');
    return {
      id: trip.id,
      code: trip.code,
      origin: trip.origin,
      initialStartAt: trip.initialStartAt,
      timezone: trip.timezone,
      status: trip.status,
      notes: trip.notes,
      legs: trip.legs.map((leg) => ({
        id: leg.id,
        sequence: leg.sequence,
        origin: leg.origin,
        destination: leg.destination,
        plannedDepartureAt: leg.plannedDepartureAt,
        plannedArrivalAt: leg.plannedArrivalAt,
        durationDays: leg.durationDays,
        notes: leg.notes,
        execution: leg.execution ? { id: leg.execution.id, status: leg.execution.status, actualDepartureAt: leg.execution.actualDepartureAt, actualArrivalAt: leg.execution.actualArrivalAt } : null,
      })),
    };
  }

  async notifications(driverId: number) {
    const unread = await this.db.message.findMany({
      where: { recipientId: driverId, readAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { sender: { select: { id: true, nombres: true, username: true } } },
    });
    const items = unread.map((m) => ({
      id: `message:${m.id}`,
      kind: 'MESSAGE' as const,
      title: `${m.sender?.nombres || m.sender?.username || 'Administrador'} respondió`,
      body: (m.body || '').slice(0, 140),
      url: '/chofer/mensajes',
      createdAt: m.createdAt,
      read: false,
      meta: { senderId: m.senderId, messageId: m.id },
    }));
    return { items, totalUnread: unread.length };
  }
}