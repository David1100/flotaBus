import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../notifications/whatsapp.service';
import { CreateMaintenanceRecordDto, MaintenanceArea } from './dto/maintenance-record.dto';

const MONEY_PATTERN = /^\d{1,12}(?:\.\d{1,2})?$/;

const categoryLabels: Record<string, string> = {
  MANTENIMIENTO: 'Mantenimiento',
  COMBUSTIBLE: 'Combustible',
  PINCHAZO: 'Pinchazo',
  OTRO: 'Otro gasto',
};

@Injectable()
export class MaintenanceRecordsService {
  constructor(private readonly db: PrismaService, private whatsapp: WhatsappService) {}

  async list(busId: number, area: MaintenanceArea) {
    this.ensureArea(area);
    await this.ensureBus(busId);
    return this.db.maintenanceRecord.findMany({
      where: { busId, area },
      orderBy: { recordedAt: 'desc' },
      select: { id: true, busId: true, area: true, category: true, cost: true, detail: true, photoUrl: true, recordedAt: true },
    });
  }

  async listAll(busId: number) {
    await this.ensureBus(busId);
    return this.db.maintenanceRecord.findMany({
      where: { busId },
      orderBy: { recordedAt: 'desc' },
      take: 50,
      select: { id: true, busId: true, area: true, category: true, cost: true, detail: true, photoUrl: true, recordedAt: true },
    });
  }

  async create(busId: number, dto: CreateMaintenanceRecordDto, actor: { id: number; rol: string }) {
    if (dto.category === 'MANTENIMIENTO') this.ensureArea(dto.area);
    await this.ensureBus(busId);
    if (actor.rol === 'CHOFER') await this.assertDriverCanReport(busId, actor.id);
    const cost = dto.cost.trim();
    if (!MONEY_PATTERN.test(cost) || Number(cost) <= 0 || Number(cost) > 999999999999.99) {
      throw new BadRequestException('El costo debe ser un valor positivo en pesos colombianos con máximo dos decimales.');
    }
    const result = await this.db.maintenanceRecord.create({
      data: {
        busId,
        category: dto.category,
        area: dto.area ?? null,
        cost: new Prisma.Decimal(cost),
        detail: dto.detail.trim(),
        photoUrl: dto.photoUrl?.trim() || null,
      },
      select: { id: true, busId: true, area: true, category: true, cost: true, detail: true, photoUrl: true, recordedAt: true },
    });

    const [actorInfo, busInfo] = await Promise.all([
      this.db.user.findUnique({ where: { id: actor.id }, select: { nombres: true, username: true, codigo: true } }),
      this.db.bus.findUnique({ where: { id: busId }, select: { placa: true } }),
    ]);
    const actorName = actorInfo?.nombres || actorInfo?.username || `Conductor #${actor.id}`;
    const placa = busInfo?.placa || `Bus #${busId}`;
    const label = categoryLabels[result.category] ?? result.category;
    void this.whatsapp.notifyAdmin(
      `💰 ${actorName} registró un gasto en ${placa}: ${label} — $${new Intl.NumberFormat('es-CO').format(Number(result.cost))}${result.area ? ` (${result.area})` : ''}.`,
      { tripCode: placa, driverName: actorName, type: 'MAINTENANCE_RECORD', occurredAt: result.recordedAt, notes: result.detail },
    );
    return result;
  }

  private async ensureBus(busId: number) {
    if (!await this.db.bus.findUnique({ where: { id: busId }, select: { id: true } })) {
      throw new NotFoundException('Bus no encontrado.');
    }
  }

  async assertDriverCanReport(busId: number, driverId: number) {
    const assignment = await this.db.assignment.findFirst({
      where: { busId, driverId, status: 'ACTIVE' },
      select: { id: true, trip: { select: { status: true } } },
    });
    if (!assignment) throw new ForbiddenException('Solo puedes registrar mantenimiento para los buses en los que tienes una asignación activa.');
    if (assignment.trip.status === 'RETURNED' || assignment.trip.status === 'CANCELLED') {
      throw new ForbiddenException('No puedes registrar mantenimiento para un viaje que ya terminó.');
    }
  }

  private ensureArea(area?: MaintenanceArea) {
    if (!area) return;
    if (!Object.values(MaintenanceArea).includes(area)) throw new BadRequestException('Área de mantenimiento inválida.');
  }
}
