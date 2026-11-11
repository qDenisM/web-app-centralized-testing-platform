import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

type DemoUser = {
  email: string;
  password: string;
  fullName: string;
  role: "applicant" | "moderator" | "examiner" | "admin";
};

const demoUsers: DemoUser[] = [
  {
    email: "applicant@demo.local",
    password: "Applicant1!",
    fullName: "Иван Абитуриентов",
    role: "applicant",
  },
  {
    email: "moderator@demo.local",
    password: "Moderator1!",
    fullName: "Мария Модераторова",
    role: "moderator",
  },
  {
    email: "examiner@demo.local",
    password: "Examiner1!",
    fullName: "Пётр Экзаменаторов",
    role: "examiner",
  },
  {
    email: "admin@demo.local",
    password: "Admin1234!",
    fullName: "Анна Админова",
    role: "admin",
  },
];

async function main() {
  for (const demo of demoUsers) {
    const passwordHash = await argon2.hash(demo.password, {
      type: argon2.argon2id,
    });

    await prisma.user.upsert({
      where: { email: demo.email },
      update: {
        passwordHash,
        fullName: demo.fullName,
        role: demo.role,
        status: "active",
        blockedReason: null,
        blockedUntil: null,
      },
      create: {
        email: demo.email,
        passwordHash,
        fullName: demo.fullName,
        role: demo.role,
        status: "active",
      },
    });

    console.log(`seed: ${demo.role} → ${demo.email} / ${demo.password}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
