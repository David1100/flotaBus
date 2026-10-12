import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';

const messageSelect = {
  id: true,
  senderId: true,
  recipientId: true,
  body: true,
  readAt: true,
  createdAt: true,
  sender: { select: { id: true, nombres: true, username: true, rol: true } },
  recipient: { select: { id: true, nombres: true, username: true, rol: true } },
} as const;

@Injectable()
export class MessagesService {
  constructor(private readonly db: PrismaService) {}

  private async ensureUser(userId: number) {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { id: true, isActive: true } });
    if (!user) throw new NotFoundException('Usuario destinatario no encontrado.');
    if (!user.isActive) throw new BadRequestException('El destinatario está inactivo y no puede recibir mensajes.');
    return user;
  }

  async inbox(actorId: number, page: number, limit: number) {
    const where = { recipientId: actorId };
    const [items, total] = await this.db.$transaction([
      this.db.message.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: messageSelect }),
      this.db.message.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async sent(actorId: number, page: number, limit: number) {
    const where = { senderId: actorId };
    const [items, total] = await this.db.$transaction([
      this.db.message.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: messageSelect }),
      this.db.message.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async send(actorId: number, dto: SendMessageDto) {
    const body = dto.body.trim();
    if (!body) throw new BadRequestException('El mensaje no puede estar vacío.');
    if (dto.recipientId === actorId) throw new BadRequestException('No puedes enviarte mensajes a ti mismo.');
    await this.ensureUser(dto.recipientId);
    return this.db.message.create({
      data: { senderId: actorId, recipientId: dto.recipientId, body },
      select: messageSelect,
    });
  }

  async markRead(actorId: number, messageId: number) {
    const message = await this.db.message.findUnique({ where: { id: messageId }, select: { id: true, recipientId: true, readAt: true } });
    if (!message) throw new NotFoundException('Mensaje no encontrado.');
    if (message.recipientId !== actorId) throw new ForbiddenException('Sólo el destinatario puede marcar el mensaje como leído.');
    if (message.readAt) return this.db.message.findUnique({ where: { id: messageId }, select: messageSelect });
    return this.db.message.update({ where: { id: messageId }, data: { readAt: new Date() }, select: messageSelect });
  }
}
