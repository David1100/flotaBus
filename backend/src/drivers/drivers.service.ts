import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';

@Injectable()
export class DriversService {
  constructor(private readonly db: PrismaService) {}
  private readonly driverSelect = { id: true, codigo: true, username: true, nombres: true, telefono: true, rol: true, isActive: true, photoUrl: true, photoPublicId: true, defaultBusId: true, defaultBus: { select: { id: true, marca: true, modelo: true, placa: true } }, createdAt: true, updatedAt: true } as const;

  private async validateDefaultBus(defaultBusId: number | null | undefined) {
    if (defaultBusId == null) return;
    const bus = await this.db.bus.findFirst({
      where: {
        id: defaultBusId,
        isActive: true,
        OR: [{ manualStatus: null }, { manualStatus: 'AVAILABLE' }],
        assignments: { none: { status: 'ACTIVE', trip: { status: { notIn: ['RETURNED', 'CANCELLED'] } } } },
      },
      select: { id: true },
    });
    if (!bus) throw new BadRequestException('El bus por defecto no existe o no está activo y disponible.');
  }

  async list(search = '', page = 1, limit = 20) {
    const where = { rol: 'CHOFER' as const, ...(search ? { OR: [{ codigo: { contains: search, mode: 'insensitive' as const } }, { username: { contains: search, mode: 'insensitive' as const } }, { nombres: { contains: search, mode: 'insensitive' as const } }] } : {}) };
    const [data, total] = await Promise.all([
      this.db.user.findMany({ where, select: this.driverSelect, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' } }),
      this.db.user.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async create(dto: CreateDriverDto) {
     await this.validateDefaultBus(dto.defaultBusId);
     try { return await this.db.user.create({ data: { codigo: dto.codigo.trim().toUpperCase(), username: dto.username.trim(), nombres: dto.nombres.trim(), telefono: dto.telefono, passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }), defaultBusId: dto.defaultBusId ?? null }, select: this.driverSelect }); }
    catch (e: any) { if (e.code === 'P2002') throw new ConflictException(e.meta?.target?.includes('codigo') ? 'El código de conductor ya está registrado.' : 'El nombre de usuario ya está registrado.'); throw e; }
  }

  async update(id: number, dto: UpdateDriverDto) {
    const current = await this.db.user.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Driver not found');
    if (current.rol !== 'CHOFER') throw new ForbiddenException('Protected administrator');
     await this.validateDefaultBus(dto.defaultBusId);
     try { return await this.db.user.update({ where: { id }, data: { codigo: dto.codigo.trim().toUpperCase(), nombres: dto.nombres.trim(), telefono: dto.telefono, ...(dto.defaultBusId === undefined ? {} : { defaultBusId: dto.defaultBusId }), ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }), ...(dto.password ? { passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }) } : {}) }, select: this.driverSelect }); }
    catch (e: any) { if (e.code === 'P2002') throw new ConflictException('El código de conductor ya está registrado.'); throw e; }
  }

  async deactivate(id: number) { const user = await this.db.user.findUnique({ where: { id } }); if (!user) throw new NotFoundException('Driver not found'); if (user.rol !== 'CHOFER') throw new ForbiddenException('Protected administrator'); return this.db.user.update({ where: { id }, data: { isActive: false }, select: this.driverSelect }); }
  async getPhoto(id: number) { const user = await this.db.user.findUnique({ where: { id }, select: { photoPublicId: true, rol: true } }); if (!user) throw new NotFoundException('Driver not found'); if (user.rol !== 'CHOFER') throw new ForbiddenException('Protected administrator'); return user; }
  async setPhoto(id: number, photo: { photoUrl: string; photoPublicId: string }) { const user = await this.db.user.findUnique({ where: { id }, select: { rol: true } }); if (!user) throw new NotFoundException('Driver not found'); if (user.rol !== 'CHOFER') throw new ForbiddenException('Protected administrator'); return this.db.user.update({ where: { id }, data: photo, select: this.driverSelect }); }
}
