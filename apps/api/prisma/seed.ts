import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = process.env["DIRECT_DATABASE_URL"] ?? process.env["DATABASE_URL"];
if (!connectionString) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
});

async function main() {
  await prisma.appointment.deleteMany();
  await prisma.slot.deleteMany();

  const cardiology = await prisma.specialty.upsert({
    where: { name: "Kardiologia" },
    update: {},
    create: {
      name: "Kardiologia",
      description: "Konsultacje sercowo-naczyniowe i kontrola wyników badań."
    }
  });

  const dermatology = await prisma.specialty.upsert({
    where: { name: "Dermatologia" },
    update: {},
    create: {
      name: "Dermatologia",
      description: "Diagnostyka skóry, znamion i zmian alergicznych."
    }
  });

  await seedDoctor("Dr Anna Kowalska", cardiology.id, "MedConnect Warszawa");
  await seedDoctor("Dr Piotr Nowak", dermatology.id, "MedConnect Kraków");
}

async function seedDoctor(name: string, specialtyId: string, clinicName: string) {
  const existing = await prisma.doctor.findFirst({ where: { name, specialtyId } });
  const doctor =
    existing ??
    (await prisma.doctor.create({
      data: { name, specialtyId, clinicName, rating: 4.8 }
    }));

  const slots = buildSlotTimes(new Date()).map(({ startTime, endTime }) => ({
    doctorId: doctor.id,
    startTime,
    endTime
  }));

  await prisma.slot.createMany({ data: slots, skipDuplicates: true });
}

function roundToNextHalfHour(date: Date) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  rounded.setMinutes(rounded.getMinutes() < 30 ? 30 : 60);
  return rounded;
}

function buildSlotTimes(now: Date) {
  const starts: Date[] = [];

  for (const offsetHours of [2, 4]) {
    starts.push(roundToNextHalfHour(new Date(now.getTime() + offsetHours * 3_600_000)));
  }

  for (let day = 1; day <= 6; day += 1) {
    for (const hour of [9, 11, 14, 16]) {
      const start = new Date(now);
      start.setDate(now.getDate() + day);
      start.setHours(hour, 0, 0, 0);
      starts.push(start);
    }
  }

  return starts.map((startTime) => ({
    startTime,
    endTime: new Date(startTime.getTime() + 30 * 60_000)
  }));
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

