import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient as ApplicantClient } from "../../applicant-service/generated/prisma/index.js";
import { PrismaClient as CatalogClient } from "../../catalog-service/generated/prisma/index.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { buildPassStorageKey, uploadPassPdf } from "./storage.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontPath = join(__dirname, "../assets/DejaVuSans.ttf");

const catalog = new CatalogClient({
  datasources: { db: { url: config.catalogDatabaseUrl } },
});
const applicant = new ApplicantClient({
  datasources: { db: { url: config.applicantDatabaseUrl } },
});

function formatWhen(date: Date): string {
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Minsk",
  });
}

async function buildPdfBuffer(fields: {
  passNumber: string;
  fullName: string;
  subjectName: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  startsAt: Date;
  duration: number;
}): Promise<Buffer> {
  if (!existsSync(fontPath)) {
    throw new Error("Не найден шрифт assets/DejaVuSans.ttf");
  }

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font(fontPath);
    doc.fontSize(20).text("Пропуск на централизованное тестирование", {
      align: "center",
    });
    doc.moveDown();
    doc.fontSize(14).text(`Номер пропуска: ${fields.passNumber}`);
    doc.moveDown(0.5);
    doc.text(`Абитуриент: ${fields.fullName}`);
    doc.text(`Предмет: ${fields.subjectName}`);
    doc.text(`Дата и время: ${formatWhen(fields.startsAt)}`);
    doc.text(`Длительность: ${fields.duration} мин.`);
    doc.moveDown(0.5);
    doc.text(`Пункт проведения: ${fields.venueName}`);
    doc.text(`Адрес: ${fields.venueCity}, ${fields.venueAddress}`);
    doc.moveDown();
    doc.fontSize(11).text(
      "Иметь при себе документ, удостоверяющий личность, и этот пропуск.",
    );

    doc.end();
  });
}

export async function issuePassPdf(applicationId: string): Promise<string> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { exam: { include: { venue: true } } },
  });
  if (!app || app.status !== "approved" || !app.passNumber) {
    throw new Error("Application is not approved");
  }

  const subject = await catalog.subject.findUnique({
    where: { id: app.exam.subjectId },
  });
  const profile = await applicant.applicantProfile.findUnique({
    where: { userId: app.userId },
  });

  const pdf = await buildPdfBuffer({
    passNumber: app.passNumber,
    fullName: profile?.graduateName || app.userId,
    subjectName: subject?.name || app.exam.subjectId,
    venueName: app.exam.venue.name,
    venueAddress: app.exam.venue.address,
    venueCity: app.exam.venue.city,
    startsAt: app.exam.startsAt,
    duration: app.exam.duration,
  });

  const storageKey = buildPassStorageKey(app.userId, app.passNumber);
  await uploadPassPdf({ storageKey, body: pdf });

  await prisma.application.update({
    where: { id: app.id },
    data: { passStorageKey: storageKey },
  });

  return storageKey;
}
