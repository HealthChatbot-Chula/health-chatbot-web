import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const isDevelopment = process.env.NODE_ENV === "development";
const recycledConnectionMessage = "kind: Closed, cause: None";

function createPrismaClient() {
  if (!isDevelopment) {
    return new PrismaClient({ log: ["error"] });
  }

  const client = new PrismaClient({
    log: [
      { emit: "stdout", level: "query" },
      { emit: "stdout", level: "warn" },
      { emit: "event", level: "error" }
    ]
  });

  client.$on("error", (event) => {
    if (event.message.includes(recycledConnectionMessage)) {
      console.info(
        "prisma:info PostgreSQL pooled connection was recycled; Prisma will reconnect on demand."
      );
      return;
    }

    console.error(`prisma:error ${event.message}`);
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
