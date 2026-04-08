import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { CommunicationRealtimeEvent } from "@/lib/communication-realtime";
import { COMMUNICATION_REALTIME_CHANNEL } from "@/lib/communication-realtime";
import { logServerError } from "@/lib/runtime-guards";
import { Client } from "pg";

export type RealtimeDbClient = Pick<Prisma.TransactionClient, "$executeRaw">;

function createEventEnvelope(
  event: Omit<CommunicationRealtimeEvent, "id" | "createdAt">,
): CommunicationRealtimeEvent {
  return {
    ...event,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}

function getRealtimeDatabaseUrl() {
  return (
    process.env.REALTIME_DATABASE_URL ??
    process.env.DIRECT_URL ??
    process.env.DATABASE_URL ??
    null
  );
}

export async function publishCommunicationRealtimeEvent(
  client: RealtimeDbClient,
  event: Omit<CommunicationRealtimeEvent, "id" | "createdAt">,
) {
  const envelope = createEventEnvelope(event);
  const payload = JSON.stringify(envelope);

  await client.$executeRaw(
    Prisma.sql`SELECT pg_notify(${COMMUNICATION_REALTIME_CHANNEL}, ${payload})`,
  );

  return envelope;
}

export async function subscribeToCommunicationRealtimeEvents(
  userId: string,
  onEvent: (event: CommunicationRealtimeEvent) => void,
) {
  const connectionString = getRealtimeDatabaseUrl();

  if (!connectionString) {
    throw new Error("Realtime communication is not configured.");
  }

  const client = new Client({
    connectionString,
    keepAlive: true,
  });

  await client.connect();
  await client.query(`LISTEN ${COMMUNICATION_REALTIME_CHANNEL}`);

  const handleNotification = (
    message: { payload?: string | null } | undefined,
  ) => {
    if (!message?.payload) {
      return;
    }

    try {
      const parsed = JSON.parse(message.payload) as CommunicationRealtimeEvent;

      if (
        parsed.recipients.length === 0 ||
        parsed.recipients.includes(userId)
      ) {
        onEvent(parsed);
      }
    } catch (error) {
      logServerError("subscribeToCommunicationRealtimeEvents:parse", error, {
        userId,
      });
    }
  };

  client.on("notification", handleNotification);

  return async () => {
    client.off("notification", handleNotification);

    try {
      await client.query(`UNLISTEN ${COMMUNICATION_REALTIME_CHANNEL}`);
    } finally {
      await client.end().catch((error) => {
        logServerError("subscribeToCommunicationRealtimeEvents:end", error, {
          userId,
        });
      });
    }
  };
}
