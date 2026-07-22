import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";

export async function getPatientProfile(userId: string) {
  return prisma.patientProfile.findUnique({
    where: { userId }
  });
}

export async function upsertPatientProfile(input: {
  userId: string;
  sex?: string | null;
  birthDate?: Date | null;
  underlyingDiseases: Prisma.InputJsonValue;
  currentMedications: Prisma.InputJsonValue;
  healthMetrics: Prisma.InputJsonValue;
}) {
  return prisma.patientProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      sex: input.sex ?? null,
      birthDate: input.birthDate ?? null,
      underlyingDiseases: input.underlyingDiseases,
      currentMedications: input.currentMedications,
      healthMetrics: input.healthMetrics
    },
    update: {
      sex: input.sex ?? null,
      birthDate: input.birthDate ?? null,
      underlyingDiseases: input.underlyingDiseases,
      currentMedications: input.currentMedications,
      healthMetrics: input.healthMetrics
    }
  });
}
