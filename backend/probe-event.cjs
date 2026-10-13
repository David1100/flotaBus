const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const trip = await p.trip.findUnique({ where: { id: 10 }, select: { id: true, status: true, code: true } });
  const events = await p.operationEvent.findMany({ where: { tripId: 10 }, orderBy: { occurredAt: 'asc' }, select: { id: true, type: true, actorId: true, executionId: true, occurredAt: true } });
  const execs = await p.legExecution.findMany({ select: { id: true, legId: true, status: true } });
  console.log('trip:', JSON.stringify(trip));
  console.log('events:', JSON.stringify(events));
  console.log('executions:', JSON.stringify(execs));
  await p.$disconnect();
})().catch(e => { console.error(e.message.slice(0, 200)); process.exit(1); });
