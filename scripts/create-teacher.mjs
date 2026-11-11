// O'qituvchi hisobini yaratish: npm run create-teacher -- <login> <parol> "<Ism Familiya>"
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const [login, password, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ") || "O'qituvchi";
if (!login || !password || password.length < 8) {
  console.error('Foydalanish: npm run create-teacher -- <login> <parol (kamida 8 belgi)> "Ism Familiya"');
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
const prisma = new PrismaClient();
const lg = login.trim().toLowerCase();
const user = await prisma.user.upsert({
  where: { login: lg },
  create: { login: lg, name, passwordHash, role: "TEACHER" },
  update: { passwordHash, role: "TEACHER", name }
});
console.log(`O'qituvchi tayyor: ${user.login} (${user.name})`);
await prisma.$disconnect();
