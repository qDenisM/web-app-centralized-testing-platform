import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  await prisma.specialtySubject.deleteMany();
  await prisma.passingScore.deleteMany();
  await prisma.specialty.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.campaignStage.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.subject.deleteMany();

  const math = await prisma.subject.create({
    data: { name: "Математика", shortCode: "MATH", status: "active" },
  });
  const physics = await prisma.subject.create({
    data: { name: "Физика", shortCode: "PHYS", status: "active" },
  });
  const belLang = await prisma.subject.create({
    data: { name: "Белорусский язык", shortCode: "BEL", status: "active" },
  });
  const rusLang = await prisma.subject.create({
    data: { name: "Русский язык", shortCode: "RUS", status: "active" },
  });
  const history = await prisma.subject.create({
    data: { name: "История Беларуси", shortCode: "HIST", status: "active" },
  });
  const foreign = await prisma.subject.create({
    data: { name: "Иностранный язык", shortCode: "LANG", status: "active" },
  });
  await prisma.subject.create({
    data: { name: "Химия", shortCode: "CHEM", status: "active" },
  });
  await prisma.subject.create({
    data: { name: "Биология", shortCode: "BIO", status: "active" },
  });

  const bsu = await prisma.institution.create({
    data: {
      type: "university",
      shortName: "БГУ",
      fullName: "Белорусский государственный университет",
      address: "пр. Независимости, 4",
      city: "Минск",
      isPublished: true,
    },
  });

  const bntu = await prisma.institution.create({
    data: {
      type: "university",
      shortName: "БНТУ",
      fullName: "Белорусский национальный технический университет",
      address: "пр. Независимости, 65",
      city: "Минск",
      isPublished: true,
    },
  });

  const bsuir = await prisma.institution.create({
    data: {
      type: "university",
      shortName: "БГУИР",
      fullName: "Белорусский государственный университет информатики и радиоэлектроники",
      address: "ул. П. Бровки, 6",
      city: "Минск",
      isPublished: true,
    },
  });

  const mgpt = await prisma.institution.create({
    data: {
      type: "college",
      shortName: "МГПТ",
      fullName: "Минский государственный политехнический колледж",
      address: "пр. Независимости, 85",
      city: "Минск",
      isPublished: true,
    },
  });

  const bsuCs = await prisma.specialty.create({
    data: {
      institutionId: bsu.id,
      okrbCode: "6-05-0611-01",
      name: "Информатика",
      studyForm: "fulltime",
      funding: "budget",
      placesPlan: 40,
      contentMode: "ct",
      isPublished: true,
    },
  });

  const bsuLaw = await prisma.specialty.create({
    data: {
      institutionId: bsu.id,
      okrbCode: "6-05-0421-01",
      name: "Правоведение",
      studyForm: "fulltime",
      funding: "budget",
      placesPlan: 50,
      contentMode: "ct",
      isPublished: true,
    },
  });

  const bntuMech = await prisma.specialty.create({
    data: {
      institutionId: bntu.id,
      okrbCode: "6-05-0714-01",
      name: "Машиностроение",
      studyForm: "fulltime",
      funding: "budget",
      placesPlan: 60,
      contentMode: "ct",
      isPublished: true,
    },
  });

  const bsuirSoft = await prisma.specialty.create({
    data: {
      institutionId: bsuir.id,
      okrbCode: "6-05-0612-01",
      name: "Программная инженерия",
      studyForm: "fulltime",
      funding: "budget",
      placesPlan: 80,
      contentMode: "ct",
      isPublished: true,
    },
  });

  const bsuirRadio = await prisma.specialty.create({
    data: {
      institutionId: bsuir.id,
      okrbCode: "6-05-0713-01",
      name: "Инфокоммуникационные технологии",
      studyForm: "fulltime",
      funding: "paid",
      placesPlan: 30,
      contentMode: "ct",
      isPublished: true,
    },
  });

  const mgptIt = await prisma.specialty.create({
    data: {
      institutionId: mgpt.id,
      okrbCode: "2-40-01-01",
      name: "Программное обеспечение информационных технологий",
      studyForm: "fulltime",
      funding: "budget",
      placesPlan: 25,
      contentMode: "ct",
      isPublished: true,
    },
  });

  await prisma.specialtySubject.createMany({
    data: [
      { specialtyId: bsuCs.id, subjectId: math.id, slot: 1, minScore: 20 },
      { specialtyId: bsuCs.id, subjectId: physics.id, slot: 2, minScore: 20 },
      { specialtyId: bsuCs.id, subjectId: rusLang.id, slot: 3, minScore: 10 },
      { specialtyId: bsuLaw.id, subjectId: history.id, slot: 1, minScore: 20 },
      { specialtyId: bsuLaw.id, subjectId: foreign.id, slot: 2, minScore: 20 },
      { specialtyId: bsuLaw.id, subjectId: belLang.id, slot: 3, minScore: 10 },
      { specialtyId: bntuMech.id, subjectId: math.id, slot: 1, minScore: 15 },
      { specialtyId: bntuMech.id, subjectId: physics.id, slot: 2, minScore: 15 },
      { specialtyId: bntuMech.id, subjectId: rusLang.id, slot: 3, minScore: 10 },
      { specialtyId: bsuirSoft.id, subjectId: math.id, slot: 1, minScore: 25 },
      { specialtyId: bsuirSoft.id, subjectId: physics.id, slot: 2, minScore: 20 },
      { specialtyId: bsuirSoft.id, subjectId: rusLang.id, slot: 3, minScore: 10 },
      { specialtyId: bsuirRadio.id, subjectId: math.id, slot: 1, minScore: 20 },
      { specialtyId: bsuirRadio.id, subjectId: physics.id, slot: 2, minScore: 20 },
      { specialtyId: bsuirRadio.id, subjectId: belLang.id, slot: 3, minScore: 10 },
      { specialtyId: mgptIt.id, subjectId: math.id, slot: 1, minScore: 10 },
      { specialtyId: mgptIt.id, subjectId: physics.id, slot: 2, minScore: 10 },
      { specialtyId: mgptIt.id, subjectId: rusLang.id, slot: 3, minScore: 5 },
    ],
  });

  await prisma.passingScore.createMany({
    data: [
      { specialtyId: bsuCs.id, year: 2024, score: 320, competition: 3.2 },
      { specialtyId: bsuCs.id, year: 2025, score: 335, competition: 3.5 },
      { specialtyId: bsuLaw.id, year: 2024, score: 310, competition: 2.8 },
      { specialtyId: bsuLaw.id, year: 2025, score: 318, competition: 2.9 },
      { specialtyId: bntuMech.id, year: 2024, score: 250, competition: 1.4 },
      { specialtyId: bntuMech.id, year: 2025, score: 255, competition: 1.5 },
      { specialtyId: bsuirSoft.id, year: 2024, score: 340, competition: 4.1 },
      { specialtyId: bsuirSoft.id, year: 2025, score: 348, competition: 4.3 },
      { specialtyId: bsuirRadio.id, year: 2024, score: 280, competition: 1.8 },
      { specialtyId: bsuirRadio.id, year: 2025, score: 285, competition: 1.9 },
      { specialtyId: mgptIt.id, year: 2024, score: 180, competition: 1.2 },
      { specialtyId: mgptIt.id, year: 2025, score: 185, competition: 1.3 },
    ],
  });

  const campaign = await prisma.campaign.create({
    data: {
      year: 2026,
      isActive: true,
    },
  });

  await prisma.campaignStage.createMany({
    data: [
      {
        campaignId: campaign.id,
        sortOrder: 1,
        name: "Подача документов",
        startsOn: new Date("2026-06-01"),
        endsOn: new Date("2026-07-15"),
      },
      {
        campaignId: campaign.id,
        sortOrder: 2,
        name: "ЦТ / ЦЭ",
        startsOn: new Date("2026-05-20"),
        endsOn: new Date("2026-06-20"),
      },
      {
        campaignId: campaign.id,
        sortOrder: 3,
        name: "Зачисление",
        startsOn: new Date("2026-07-20"),
        endsOn: new Date("2026-08-10"),
      },
    ],
  });

  console.log("seed: subjects", await prisma.subject.count());
  console.log("seed: institutions", await prisma.institution.count());
  console.log("seed: specialties", await prisma.specialty.count());
  console.log("seed: campaign", campaign.year);
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
