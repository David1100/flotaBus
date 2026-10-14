const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const trips = await db.trip.findMany({
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: {
      assignments: {
        select: { id: true, driverId: true, status: true, driver: { select: { username: true } } },
      },
      events: {
        orderBy: { occurredAt: 'desc' },
        take: 5,
        select: { id: true, type: true, occurredAt: true, notes: true, actorId: true },
      },
    },
  });
  console.log('--- TRIPS ---');
  for (const t of trips) {
    console.log(`trip#${t.id} ${t.code} status=${t.status} assignments=${JSON.stringify(t.assignments)}`);
    for (const e of t.events) {
      console.log(`   event ${e.type} at ${e.occurredAt.toISOString()} notes=${JSON.stringify((e.notes || '').slice(0, 50))}`);
    }
  }

  const records = await db.maintenanceRecord.findMany({
    orderBy: { recordedAt: 'desc' },
    take: 8,
    select: { id: true, busId: true, category: true, area: true, cost: true, detail: true, recordedAt: true },
  });
  console.log('--- MAINTENANCE RECORDS ---');
  for (const r of records) {
    console.log(`rec#${r.id} bus=${r.busId} cat=${r.category} area=${r.area} cost=${r.cost} at ${r.recordedAt.toISOString()} detail=${JSON.stringify(r.detail.slice(0, 50))}`);
  }

  const legs = await db.tripLeg.findMany({ orderBy: { id: 'desc' }, take: 5, include: { execution: true } });
  console.log('--- LEGS + EXECUTIONS ---');
  for (const l of legs) {
    console.log(`leg#${l.id} trip=${l.tripId} seq=${l.sequence} exec=${l.execution ? l.execution.status : 'none'}`);
  }
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
