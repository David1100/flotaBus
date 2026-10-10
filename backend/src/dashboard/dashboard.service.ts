import { BadRequestException, Injectable } from '@nestjs/common';
import { BusOperationalStatus, Prisma, TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardOverviewDto } from './dto/dashboard-overview.dto';

const TERMINAL_TRIPS: TripStatus[] = [TripStatus.RETURNED, TripStatus.CANCELLED];
const ACTIVE_TRIPS: TripStatus[] = [TripStatus.PLANNED, TripStatus.ASSIGNED, TripStatus.IN_TRANSIT, TripStatus.STOPPED, TripStatus.PAUSED_LUNCH, TripStatus.INCIDENT];

function parseBoundary(value: string | undefined, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Las fechas del periodo no son válidas.');
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + (endOfDay ? 1 : 0)));
  }
  return date;
}

function defaultPeriod() {
  const now = new Date();
  return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), to: now };
}

@Injectable()
export class DashboardService {
  constructor(private readonly db: PrismaService) {}

  async overview(query: DashboardOverviewDto) {
    const defaults = defaultPeriod();
    const from = parseBoundary(query.from) ?? defaults.from;
    const to = parseBoundary(query.to, true) ?? defaults.to;
    if (from >= to) throw new BadRequestException('La fecha inicial debe ser anterior a la fecha final.');

    const activeAssignmentWhere: Prisma.AssignmentWhereInput = {
      status: 'ACTIVE',
      trip: { status: { notIn: TERMINAL_TRIPS } },
      ...(query.busId ? { busId: query.busId } : {}),
    };
    const busWhere: Prisma.BusWhereInput = {
      isActive: true,
      ...(query.busId ? { id: query.busId } : {}),
    };
    const maintenanceWhere: Prisma.MaintenanceRecordWhereInput = {
      recordedAt: { gte: from, lt: to },
      ...(query.busId ? { busId: query.busId } : {}),
    };
    const tripWhere: Prisma.TripWhereInput = {
      status: { in: ACTIVE_TRIPS },
      initialStartAt: { gte: from, lt: to },
      ...(query.busId ? { assignments: { some: { busId: query.busId, status: 'ACTIVE' } } } : {}),
    };

    const [buses, maintenanceAggregate, maintenanceByBus, trips, activeDrivers, activeTripCount] = await Promise.all([
      this.db.bus.findMany({
        where: busWhere,
        select: {
          id: true, placa: true, marca: true, modelo: true, manualStatus: true,
          assignments: {
            where: activeAssignmentWhere,
            orderBy: { assignedAt: 'desc' }, take: 1,
            select: { id: true, tripId: true, driver: { select: { id: true, nombres: true, username: true } }, trip: { select: { code: true, status: true } } },
          },
          defaultDrivers: { where: { isActive: true }, select: { id: true, nombres: true, username: true }, take: 1 },
        },
        orderBy: { placa: 'asc' },
      }),
      this.db.maintenanceRecord.aggregate({ where: maintenanceWhere, _sum: { cost: true }, _count: { _all: true } }),
      this.db.maintenanceRecord.groupBy({ by: ['busId'], where: maintenanceWhere, _sum: { cost: true }, _count: { _all: true }, orderBy: { _sum: { cost: 'desc' } } }),
      this.db.trip.findMany({
        where: tripWhere,
        orderBy: { initialStartAt: 'asc' },
        select: { id: true, code: true, origin: true, status: true, initialStartAt: true, assignments: { where: { status: 'ACTIVE' }, select: { bus: { select: { id: true, placa: true } }, driver: { select: { id: true, nombres: true, username: true } } } } },
      }),
      this.db.user.count({ where: { rol: 'CHOFER', isActive: true } }),
      this.db.trip.count({ where: tripWhere }),
    ]);

    const busCatalog = new Map(buses.map((bus) => [bus.id, bus]));
    const statusOf = (bus: (typeof buses)[number]) => bus.manualStatus ?? (bus.assignments[0]?.trip.status === 'IN_TRANSIT' ? BusOperationalStatus.IN_TRANSIT : bus.assignments.length ? BusOperationalStatus.ASSIGNED : BusOperationalStatus.AVAILABLE);
    const filteredBuses = query.status ? buses.filter((bus) => statusOf(bus) === query.status) : buses;
    const selectedBusIds = new Set(filteredBuses.map((bus) => bus.id));
    const costs = maintenanceByBus.filter((row) => selectedBusIds.has(row.busId)).map((row) => ({
      busId: row.busId,
      placa: busCatalog.get(row.busId)?.placa ?? '—',
      total: Number(row._sum.cost ?? 0),
      records: row._count._all,
    }));
    const maintenanceBuses = filteredBuses.filter((bus) => statusOf(bus) === BusOperationalStatus.MAINTENANCE).map((bus) => ({ id: bus.id, placa: bus.placa, marca: bus.marca, modelo: bus.modelo }));
    const unassignedBuses = filteredBuses.filter((bus) => !bus.assignments.length).map((bus) => ({ id: bus.id, placa: bus.placa, status: statusOf(bus), defaultDriver: bus.defaultDrivers[0] ?? null }));
    const activeTrips = trips.filter((trip) => !query.busId || trip.assignments.some((assignment) => assignment.bus.id === query.busId)).map((trip) => ({ ...trip, assignments: trip.assignments.map((assignment) => ({ bus: assignment.bus, driver: assignment.driver })) }));
    const statusCounts = filteredBuses.reduce<Record<string, number>>((counts, bus) => { const status = statusOf(bus); counts[status] = (counts[status] ?? 0) + 1; return counts; }, {});
    const filteredMaintenanceCost = query.status ? costs.reduce((sum, row) => sum + row.total, 0) : Number(maintenanceAggregate._sum.cost ?? 0);

    return {
      period: { from: from.toISOString(), to: to.toISOString(), defaulted: !query.from && !query.to },
      kpis: {
        totalBuses: filteredBuses.length,
        availableBuses: statusCounts.AVAILABLE ?? 0,
        operationalBuses: (statusCounts.ASSIGNED ?? 0) + (statusCounts.IN_TRANSIT ?? 0) + (statusCounts.STOPPED ?? 0) + (statusCounts.PAUSED_LUNCH ?? 0) + (statusCounts.INCIDENT ?? 0),
        maintenanceBuses: statusCounts.MAINTENANCE ?? 0,
        activeDrivers,
        activeTrips: activeTripCount,
        maintenanceCost: filteredMaintenanceCost,
        maintenanceRecords: maintenanceAggregate._count._all,
      },
      maintenanceByBus: costs,
      busesInMaintenance: maintenanceBuses,
      activeTrips,
      unassignedBuses,
    };
  }
}
