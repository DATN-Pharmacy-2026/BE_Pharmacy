const { PrismaClient } = require("./node_modules/.prisma/client/identity");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash("Admin@123", 10);
  const user = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash: hash,
      status: "ACTIVE",
      isSystemAdmin: true,
    },
    create: {
      username: "admin",
      email: "admin@pharmaplus.com",
      fullName: "Super Administrator",
      passwordHash: hash,
      phone: "0987654321",
      status: "ACTIVE",
      isSystemAdmin: true,
      userRoles: {
        create: {
          roleId: "a81622b8-c55c-4b5a-a490-95e2ffdf2b40"
        }
      }
    }
  });
  console.log("Admin user created successfully! ID:", user.id);
}
main().catch(console.error);
