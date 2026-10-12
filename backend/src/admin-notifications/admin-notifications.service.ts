import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type NotificationKind = 'MESSAGE' | 'INCIDENT' | 'EXPENSE' | 'TRIP_EVENT';

const categoryLabels: Record<string, string> = {
  MANTENIMIENTO: 'Mantenimiento',
  COMBUSTIBLE: 'Tanqueo',
  PINCHAZO: 'Pinchazo',
  OTRO: 'Otro gasto',
};

interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  url: string;
  createdAt: Date;
  read: boolean;
  meta: Record<string, unknown>;
}

@Injectable()
export class AdminNotificationsService {
  constructor(private readonly db: PrismaService) {}

  async list(actorId: number, limit: number) {
    const incidents = await this.db.operationEvent.findMany({
      where: { type: 'INCIDENT' },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      include: {
        actor: { select: { id: true, nombres: true, username: true, codigo: true } },
        trip: { select: { id: true, code: true, status: true } },
      },
    });

    const seenIncidents = await this.db.notificationView.findMany({ where: { actorId, kind: 'INCIDENT' }, select: { refId: true } });
    const seenIncidentIds = new Set(seenIncidents.map((v) => v.refId));

    const expenses = await this.db.maintenanceRecord.findMany({
      where: { recordedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { recordedAt: 'desc' },
      take: limit,
      include: { bus: { select: { id: true, placa: true } } },
    });

    const seenExpenses = await this.db.notificationView.findMany({ where: { actorId, kind: 'EXPENSE' }, select: { refId: true } });
    const seenExpenseIds = new Set(seenExpenses.map((v) => v.refId));

    const unreadMessages = await this.db.message.count({ where: { recipientId: actorId, readAt: null } });
    const recentUnreadBySender = await this.db.message.findMany({
      where: { recipientId: actorId, readAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { sender: { select: { id: true, nombres: true, username: true, codigo: true } } },
    });

    const tripEvents = await this.db.operationEvent.findMany({
      where: { type: { in: ['STARTED', 'STOPPED', 'LUNCH_STARTED', 'LUNCH_ENDED', 'ARRIVED', 'RETURNED'] } },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      include: {
        actor: { select: { id: true, nombres: true, username: true } },
        trip: { select: { id: true, code: true } },
      },
    });
    const seenTripEvents = await this.db.notificationView.findMany({ where: { actorId, kind: 'TRIP_EVENT' }, select: { refId: true } });
    const seenTripEventIds = new Set(seenTripEvents.map((v) => v.refId));

    const incidentItems: NotificationItem[] = incidents.map((inc) => ({
      id: `incident:${inc.id}`,
      kind: 'INCIDENT',
      title: `Incidencia reportada por ${inc.actor?.nombres || inc.actor?.username || 'Conductor'}`,
      body: inc.notes || 'Sin detalles',
      url: `/admin/trips/detail?id=${inc.tripId}`,
      createdAt: inc.occurredAt,
      read: seenIncidentIds.has(String(inc.id)),
      meta: { tripId: inc.tripId, tripCode: inc.trip?.code, actorId: inc.actorId, eventId: inc.id },
    }));

    const messageItemsBySender = new Map<string, NotificationItem>();
    for (const m of recentUnreadBySender) {
      const senderId = m.senderId;
      if (messageItemsBySender.has(String(senderId))) continue;
      const senderName = m.sender?.nombres || m.sender?.username || 'Conductor';
      messageItemsBySender.set(String(senderId), {
        id: `message:${senderId}:${m.id}`,
        kind: 'MESSAGE',
        title: `Nuevo mensaje de ${senderName}`,
        body: (m.body || '').slice(0, 140),
        url: `/admin/mensajes?with=${senderId}`,
        createdAt: m.createdAt,
        read: false,
        meta: { senderId, messageId: m.id, codigo: m.sender?.codigo },
      });
    }

    const expenseItems: NotificationItem[] = expenses.map((e) => ({
      id: `expense:${e.id}`,
      kind: 'EXPENSE',
      title: `${categoryLabels[e.category] ?? 'Gasto'} en ${e.bus?.placa ?? 'bus'} — $${new Intl.NumberFormat('es-CO').format(Number(e.cost))}`,
      body: e.detail,
      url: `/admin/buses/detail?id=${e.busId}`,
      createdAt: e.recordedAt,
      read: seenExpenseIds.has(String(e.id)),
      meta: { busId: e.busId, recordId: e.id, category: e.category, cost: Number(e.cost) },
    }));

    const eventLabel: Record<string, string> = {
      STARTED: 'inició ruta', STOPPED: 'detuvo el bus', LUNCH_STARTED: 'inició almuerzo', LUNCH_ENDED: 'reanudó ruta',
      ARRIVED: 'llegó a destino', RETURNED: 'retornó al origen', LEG_STARTED: 'empezó un tramo', LEG_ARRIVED: 'completó un tramo',
    };
    const tripEventItems: NotificationItem[] = tripEvents.map((ev) => ({
      id: `event:${ev.id}`,
      kind: 'TRIP_EVENT',
      title: `${ev.actor?.nombres || ev.actor?.username || 'Conductor'} ${eventLabel[ev.type] ?? ev.type.toLowerCase()} — ${ev.trip?.code ?? ''}`,
      body: ev.notes || `Actualización del viaje ${ev.trip?.code ?? ''}`,
      url: ev.trip?.id ? `/admin/trips/detail?id=${ev.trip.id}` : '/admin/trips',
      createdAt: ev.occurredAt,
      read: seenTripEventIds.has(String(ev.id)),
      meta: { tripId: ev.tripId, eventId: ev.id, type: ev.type },
    }));

    const items = [...incidentItems, ...tripEventItems, ...expenseItems, ...messageItemsBySender.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    const unreadByKind: Record<NotificationKind, number> = {
      MESSAGE: unreadMessages,
      INCIDENT: incidentItems.filter((i) => !i.read).length,
      EXPENSE: expenseItems.filter((i) => !i.read).length,
      TRIP_EVENT: tripEventItems.filter((i) => !i.read).length,
    };
    return { items, totalUnread: unreadMessages + unreadByKind.INCIDENT + unreadByKind.EXPENSE + unreadByKind.TRIP_EVENT, unreadByKind };
  }

  async markRead(actorId: number, compositeId: string) {
    const [rawKind, refId] = compositeId.split(':');
    const kind = rawKind?.toUpperCase();
    if (!kind || !refId) throw new BadRequestException('Identificador inválido.');
    if (kind === 'INCIDENT' || kind === 'EXPENSE' || kind === 'TRIP_EVENT') {
      const refNum = Number(refId);
      if (!Number.isInteger(refNum) || refNum <= 0) throw new BadRequestException('Identificador inválido.');
      await this.db.notificationView.upsert({
        where: { actorId_kind_refId: { actorId, kind, refId: String(refNum) } },
        create: { actorId, kind, refId: String(refNum) },
        update: {},
      });
      return { updated: 1 };
    }
    throw new BadRequestException('Solo se persisten vistas de incidencias o gastos; los mensajes ya tienen su propio estado de lectura.');
  }

  async markAllRead(actorId: number) {
    const incidents = await this.db.operationEvent.findMany({ where: { type: 'INCIDENT' }, select: { id: true } });
    const tripEvents = await this.db.operationEvent.findMany({ where: { type: { in: ['STARTED', 'STOPPED', 'LUNCH_STARTED', 'LUNCH_ENDED', 'ARRIVED', 'RETURNED'] } }, select: { id: true } });
    const expenses = await this.db.maintenanceRecord.findMany({ select: { id: true } });
    const ops = [
      ...incidents.map((ev) => ({ kind: 'INCIDENT' as const, refId: String(ev.id) })),
      ...tripEvents.map((ev) => ({ kind: 'TRIP_EVENT' as const, refId: String(ev.id) })),
      ...expenses.map((e) => ({ kind: 'EXPENSE' as const, refId: String(e.id) })),
    ];
    await this.db.$transaction(ops.map((entry) => this.db.notificationView.upsert({
      where: { actorId_kind_refId: { actorId, kind: entry.kind, refId: entry.refId } },
      create: { actorId, kind: entry.kind, refId: entry.refId },
      update: {},
    })));
    return { updated: ops.length };
  }
}