import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_TRIP_STATUSES = ['ASSIGNED', 'IN_TRANSIT', 'STOPPED', 'PAUSED_LUNCH'] as const;

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
            legs: { orderBy: { sequence: 'asc' }, select: { id: true, origin: true, destination: true, plannedDepartureAt: true, plannedArrivalAt: true } },
          },
        },
        bus: { select: { id: true, placa: true, marca: true, modelo: true, kilometraje: true, busType: true, isActive: true, manualStatus: true, photoUrl: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const activeAssignment = activeAssignments.find((a): a is typeof a & { trip: NonNullable<typeof a.trip> } => ACTIVE_TRIP_STATUSES.includes((a as any).trip?.status as any)) ?? null;

    const currentBus = activeAssignment
      ? {
          ...activeAssignment.bus,
          status: !activeAssignment.bus.isActive ? 'INACTIVE' : activeAssignment.trip.status,
          currentAssignment: {
            id: activeAssignment.id,
            tripId: activeAssignment.tripId,
            trip: { code: activeAssignment.trip.code, status: activeAssignment.trip.status },
          },
        }
      : null;

    const upcomingTrips = await this.db.assignment.findMany({
      where: {
        driverId,
        status: 'ACTIVE',
        trip: { status: { in: ['ASSIGNED'] } },
      },
      include: {
        trip: {
          include: {
            legs: { orderBy: { sequence: 'asc' }, take: 1, select: { destination: true, plannedDepartureAt: true } },
            _count: { select: { legs: true } },
          },
        },
      },
      orderBy: { trip: { initialStartAt: 'asc' } },
      take: 3,
    });

    const recentMaintenance = currentBus
      ? await this.db.maintenanceRecord.findMany({
          where: { busId: currentBus.id },
          orderBy: { recordedAt: 'desc' },
          take: 5,
          select: { id: true, area: true, detail: true, cost: true, photoUrl: true, recordedAt: true },
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
            legs: activeAssignment.trip.legs,
          }
        : null,
      currentBus,
      upcomingTrips: upcomingTrips.map(a => ({
        assignmentId: a.id,
        assignedAt: a.assignedAt,
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