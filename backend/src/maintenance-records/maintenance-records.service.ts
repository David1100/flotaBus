import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaintenanceRecordDto, MaintenanceArea } from './dto/maintenance-record.dto';

const MONEY_PATTERN = /^\d{1,12}(?:\.\d{1,2})?$/;

@Injectable()
export class MaintenanceRecordsService {
  constructor(private readonly db: PrismaService) {}

  async list(busId: number, area: MaintenanceArea) {
    this.ensureArea(area);
    await this.ensureBus(busId);
    return this.db.maintenanceRecord.findMany({
      where: { busId, area },
      orderBy: { recordedAt: 'desc' },
      select: { id: true, busId: true, area: true, cost: true, detail: true, photoUrl: true, recordedAt: true },
    });
  }

  async create(busId: number, dto: CreateMaintenanceRecordDto) {
    this.ensureArea(dto.area);
    await this.ensureBus(busId);
    const cost = dto.cost.trim();
    if (!MONEY_PATTERN.test(cost) || Number(cost) <= 0 || Number(cost) > 999999999999.99) {
      throw new BadRequestException('El costo debe ser un valor positivo en pesos colombianos con máximo dos decimales.');
    }
    return this.db.maintenanceRecord.create({
      data: {
        busId,
        area: dto.area,
        cost: new Prisma.Decimal(cost),
        detail: dto.detail.trim(),
        photoUrl: dto.photoUrl?.trim() || null,
      },
      select: { id: true, busId: true, area: true, cost: true, detail: true, photoUrl: true, recordedAt: true },
    });
  }

  private async ensureBus(busId: number) {
    if (!await this.db.bus.findUnique({ where: { id: busId }, select: { id: true } })) {
      throw new NotFoundException('Bus no encontrado.');
    }
  }

  private ensureArea(area: MaintenanceArea) {
    if (!Object.values(MaintenanceArea).includes(area)) throw new BadRequestException('Área de mantenimiento inválida.');
  }
}
