import { Injectable, Logger } from '@nestjs/common';

export interface WhatsAppContext {
  tripCode?: string;
  driverName?: string;
  type?: string;
  occurredAt?: Date;
  notes?: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger('WhatsappStub');
  private readonly adminPhone = process.env.ADMIN_PHONE ?? '3000000000';

  async notifyAdmin(message: string, context?: WhatsAppContext): Promise<void> {
    const payload = {
      timestamp: new Date().toISOString(),
      to: this.adminPhone,
      message,
      context: context ?? null,
    };
    this.logger.log(`[WHATSAPP-STUB] ${JSON.stringify(payload)}`);
    if (!process.env.ADMIN_PHONE) this.logger.warn('ADMIN_PHONE no está configurado; usando placeholder 3000000000.');
    return Promise.resolve();
  }
}