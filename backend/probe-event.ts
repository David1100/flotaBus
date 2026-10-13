import { TripsService } from './src/trips/trips.service';
import { PrismaService } from './src/prisma/prisma.service';
import { WhatsappService } from './src/notifications/whatsapp.service';

const db = new PrismaService();
const service = new TripsService(db, new WhatsappService() as any);

(async () => {
  await db.$transaction([
    db.operationEvent.deleteMany({ where: { tripId: 10 } }),
    db.legExecution.deleteMany({ where: { leg: { tripId: 10 } } }),
    db.maintenanceRecord.deleteMany({ where: { busId: 8, detail: 'prueba diferencial' } }),
    db.trip.update({ where: { id: 10 }, data: { status: 'ASSIGNED' } }),
  ]);
  console.log('trip 10 reseteado a ASSIGNED; ejecutando STARTED como chofer 24…');

  try {
    const result = await service.event(10, { type: 'STARTED' }, { id: 24, rol: 'CHOFER' });
    console.log('OK status:', result.status);
  } catch (e: any) {
    console.log('ERROR NAME:', e?.constructor?.name);
    console.log('ERROR MESSAGE:', e?.message);
    console.log('ERROR STACK:', e?.stack?.split('\n').slice(0, 12).join('\n'));
  } finally {
    await db.$disconnect();
  }
})();
