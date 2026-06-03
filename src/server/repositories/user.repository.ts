import { prisma } from "@/server/db";

type UpsertLineUserInput = {
  lineUserId: string;
  displayName?: string | null;
  pictureUrl?: string | null;
  friendFlag: boolean;
};

export async function upsertLineUser(input: UpsertLineUserInput) {
  return prisma.user.upsert({
    where: { lineUserId: input.lineUserId },
    create: {
      lineUserId: input.lineUserId,
      displayName: input.displayName,
      pictureUrl: input.pictureUrl,
      friendFlag: input.friendFlag,
      lastLoginAt: new Date()
    },
    update: {
      displayName: input.displayName,
      pictureUrl: input.pictureUrl,
      friendFlag: input.friendFlag,
      lastLoginAt: new Date()
    }
  });
}
