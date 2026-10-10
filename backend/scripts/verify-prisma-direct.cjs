const forbidden = [
  'PRISMA_GENERATE_DATAPROXY',
  'PRISMA_GENERATE_ACCELERATE',
  'PRISMA_ACCELERATE_URL',
];

const enabled = forbidden.filter((name) => {
  const value = process.env[name];
  return value !== undefined && value !== '' && value.toLowerCase() !== 'false';
});

if (enabled.length > 0) {
  throw new Error(
    `Direct PostgreSQL Prisma configuration cannot run with inherited Data Proxy/Accelerate variables: ${enabled.join(', ')}. Unset them and regenerate.`,
  );
}

const engineType = process.env.PRISMA_CLIENT_ENGINE_TYPE;
if (engineType && !['library', 'binary'].includes(engineType)) {
  throw new Error(
    'PRISMA_CLIENT_ENGINE_TYPE must be library or binary for direct PostgreSQL.',
  );
}

console.log('Prisma direct PostgreSQL configuration guard passed.');
