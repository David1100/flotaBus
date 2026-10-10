import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
const prisma = new PrismaClient();
async function main() {
  const { ADMIN_USERNAME: username, ADMIN_NAMES: nombres, ADMIN_PHONE: telefono, ADMIN_PASSWORD: password } = process.env;
  if (!username || !nombres || !telefono || !password) throw new Error('Admin seed variables are required');
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.upsert({ where: { username }, create: { username, nombres, telefono, passwordHash, rol: Role.ADMINISTRADOR, isActive: true }, update: { nombres, telefono, rol: Role.ADMINISTRADOR, isActive: true } });
}
main().finally(() => prisma.$disconnect());
