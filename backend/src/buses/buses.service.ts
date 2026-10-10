import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BusOperationalStatus, CreateBusDto, UpdateBusDto } from './dto/bus.dto';

@Injectable()
export class BusesService {
  constructor(private readonly db: PrismaService) {}

  async list(search = '', page = 1, limit = 20) {
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(100, Math.max(1, limit || 20));
    const where: Prisma.BusWhereInput = search ? { OR: [
      { placa: { contains: search.trim().toUpperCase(), mode: 'insensitive' } },
      { marca: { contains: search.trim(), mode: 'insensitive' } },
      { modelo: { contains: search.trim(), mode: 'insensitive' } },
    ] } : {};
    const [data, total] = await Promise.all([
      this.db.bus.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: { id: 'desc' },
        include: {
          // Vigente = ACTIVE and attached to a non-terminal trip. The newest
          // assignment wins when bad/legacy data leaves more than one match.
          assignments: {
            where: { status: 'ACTIVE', trip: { status: { notIn: ['RETURNED', 'CANCELLED'] } } },
            orderBy: { assignedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              tripId: true,
              assignedAt: true,
              trip: { select: { id: true, code: true, status: true } },
              driver: { select: { id: true, nombres: true, username: true } },
            },
          },
        },
      }),
      this.db.bus.count({ where }),
    ]);
    return {
      data: data.map(({ assignments, ...bus }) => {
        const assignment = assignments[0];
        return {
          ...bus,
          // Keep the response additive: existing bus fields remain unchanged.
           status: !bus.isActive ? 'INACTIVE' : assignment?.trip.status ?? bus.manualStatus ?? 'AVAILABLE',
          currentAssignment: assignment ? {
            id: assignment.id,
            tripId: assignment.tripId,
            assignedAt: assignment.assignedAt,
            trip: assignment.trip,
            driver: assignment.driver,
          } : null,
        };
      }),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async get(id: number) {
    const bus = await this.db.bus.findUnique({ where: { id }, select: { id: true, placa: true } });
    if (!bus) throw new NotFoundException('Bus no encontrado.');
    return bus;
  }

  private normalize(dto: CreateBusDto | UpdateBusDto) {
    return { ...dto, ...(dto.busType === undefined ? { busType: 'NORMAL' } : {}), ...(dto.placa !== undefined ? { placa: dto.placa.trim().toUpperCase() } : {}),
      ...(dto.marca !== undefined ? { marca: dto.marca.trim() } : {}), ...(dto.modelo !== undefined ? { modelo: dto.modelo.trim() } : {}) };
  }

  async create(dto: CreateBusDto) { try { return await this.db.bus.create({ data: this.normalize(dto) as Prisma.BusCreateInput }); } catch (error) { this.handle(error); } }

  async update(id: number, dto: UpdateBusDto, actor?: { id: number; rol: string }) {
    const current = await this.db.bus.findUnique({
      where: { id },
      include: { assignments: { where: { status: 'ACTIVE', trip: { status: { notIn: ['RETURNED', 'CANCELLED'] } } }, include: { trip: { select: { status: true } } }, take: 1 } },
    });
    if (!current) throw new NotFoundException('Bus no encontrado.');
    if (dto.isActive === false && current.assignments.length) throw new ConflictException('No se puede desactivar un bus con un viaje operativo activo.');
    if (dto.manualStatus !== undefined) {
      if (current.assignments.length) throw new ConflictException('No se puede cambiar manualmente el estado mientras el bus tiene un viaje operativo activo.');
      if (dto.manualStatus === BusOperationalStatus.AVAILABLE && dto.isActive === false) throw new BadRequestException('Un bus inactivo no puede quedar Disponible.');
      if (!actor?.id) throw new ConflictException('No se pudo identificar al administrador que actualiza el estado.');
    }
    const data = this.normalize(dto) as Prisma.BusUpdateInput;
    if (dto.isActive === false) {
      data.manualStatus = null;
      data.manualStatusUpdatedAt = null;
      data.manualStatusUpdatedBy = { disconnect: true };
    } else if (dto.manualStatus !== undefined) {
      data.manualStatusUpdatedAt = new Date();
      data.manualStatusUpdatedBy = { connect: { id: actor!.id } };
    }
    try { return await this.db.bus.update({ where: { id }, data }); } catch (error) { this.handle(error); }
  }

  async remove(id: number) { try { await this.db.bus.delete({ where: { id } }); } catch (error: any) { if (error.code === 'P2025') throw new NotFoundException('Bus no encontrado.'); throw error; } }

  private handle(error: any): never { if (error?.code === 'P2002') throw new ConflictException('La placa ya está registrada.'); throw error; }
}
