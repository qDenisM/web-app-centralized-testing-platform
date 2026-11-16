import { PrismaClient } from "../generated/prisma/index.js";
import { PrismaClient as CatalogClient } from "../../catalog-service/generated/prisma/index.js";

const prisma = new PrismaClient();
const catalog = new CatalogClient({
  datasources: {
    db: {
      url:
        process.env.CATALOG_DATABASE_URL ||
        "postgresql://abiturent:abiturent@localhost:5432/catalog",
    },
  },
});

async function main() {
  await prisma.waitlistEntry.deleteMany();
  await prisma.application.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.venue.deleteMany();

  const subjects = await catalog.subject.findMany({
    where: { status: "active" },
  });
  const byCode = new Map(subjects.map((s) => [s.shortCode, s.id]));

  const required = ["MATH", "PHYS", "RUS", "BEL", "HIST", "LANG", "CHEM", "BIO"];
  for (const code of required) {
    if (!byCode.has(code)) {
      throw new Error(
        `В catalog нет предмета ${code}. Сначала: npm run seed -w @abiturent/catalog-service`,
      );
    }
  }

  const bsu = await prisma.venue.create({
    data: {
      name: "БГУ",
      address: "пр. Независимости, 4",
      city: "Минск",
    },
  });
  const bntu = await prisma.venue.create({
    data: {
      name: "БНТУ",
      address: "пр. Независимости, 65",
      city: "Минск",
    },
  });
  const bsuir = await prisma.venue.create({
    data: {
      name: "БГУИР",
      address: "ул. П. Бровки, 6",
      city: "Минск",
    },
  });

  const year = 2026;
  const sessions: Array<{
    subjectCode: string;
    venueId: string;
    startsAt: string;
    duration: number;
    capacity: number;
    isReserve: boolean;
  }> = [
    {
      subjectCode: "MATH",
      venueId: bsu.id,
      startsAt: `${year}-06-02T09:00:00+03:00`,
      duration: 210,
      capacity: 120,
      isReserve: false,
    },
    {
      subjectCode: "MATH",
      venueId: bntu.id,
      startsAt: `${year}-06-02T09:00:00+03:00`,
      duration: 210,
      capacity: 80,
      isReserve: false,
    },
    {
      subjectCode: "PHYS",
      venueId: bsuir.id,
      startsAt: `${year}-06-04T09:00:00+03:00`,
      duration: 180,
      capacity: 90,
      isReserve: false,
    },
    {
      subjectCode: "RUS",
      venueId: bsu.id,
      startsAt: `${year}-06-06T09:00:00+03:00`,
      duration: 180,
      capacity: 150,
      isReserve: false,
    },
    {
      subjectCode: "BEL",
      venueId: bsu.id,
      startsAt: `${year}-06-06T14:00:00+03:00`,
      duration: 180,
      capacity: 100,
      isReserve: false,
    },
    {
      subjectCode: "HIST",
      venueId: bntu.id,
      startsAt: `${year}-06-08T09:00:00+03:00`,
      duration: 180,
      capacity: 70,
      isReserve: false,
    },
    {
      subjectCode: "LANG",
      venueId: bsuir.id,
      startsAt: `${year}-06-10T09:00:00+03:00`,
      duration: 180,
      capacity: 60,
      isReserve: false,
    },
    {
      subjectCode: "CHEM",
      venueId: bsu.id,
      startsAt: `${year}-06-12T09:00:00+03:00`,
      duration: 180,
      capacity: 50,
      isReserve: false,
    },
    {
      subjectCode: "BIO",
      venueId: bntu.id,
      startsAt: `${year}-06-12T09:00:00+03:00`,
      duration: 180,
      capacity: 50,
      isReserve: false,
    },
    {
      subjectCode: "MATH",
      venueId: bsu.id,
      startsAt: `${year}-06-20T09:00:00+03:00`,
      duration: 210,
      capacity: 40,
      isReserve: true,
    },
    {
      subjectCode: "RUS",
      venueId: bsuir.id,
      startsAt: `${year}-06-21T09:00:00+03:00`,
      duration: 180,
      capacity: 40,
      isReserve: true,
    },
  ];

  for (const row of sessions) {
    await prisma.exam.create({
      data: {
        subjectId: byCode.get(row.subjectCode)!,
        venueId: row.venueId,
        startsAt: new Date(row.startsAt),
        duration: row.duration,
        capacity: row.capacity,
        seatsTaken: 0,
        isReserve: row.isReserve,
      },
    });
  }

  console.log("seed: venues", await prisma.venue.count());
  console.log("seed: exams", await prisma.exam.count());
  console.log(
    "seed: reserve exams",
    await prisma.exam.count({ where: { isReserve: true } }),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await catalog.$disconnect();
  });
