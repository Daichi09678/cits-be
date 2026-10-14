import { Elysia, t } from "elysia";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../db";
import { checkRateLimit } from "../redis";

// SSE Client Subscribers for Realtime Admin Inbox
type SseClient = (chunk: string) => void;
const sseClients = new Set<SseClient>();

export function broadcastNewMessage(message: any) {
  const payload = `data: ${JSON.stringify({ type: "new_message", message })}\n\n`;
  for (const client of sseClients) {
    try {
      client(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

export const messageRoutes = new Elysia({ prefix: "/api/messages" })
  // GET /api/messages/stream (Server-Sent Events for Realtime Admin Inbox)
  .get(
    "/stream",
    () => {
      let clientFn: SseClient;
      const stream = new ReadableStream({
        start(controller) {
          clientFn = (chunk: string) => {
            try {
              controller.enqueue(new TextEncoder().encode(chunk));
            } catch {
              sseClients.delete(clientFn);
            }
          };
          sseClients.add(clientFn);

          // Initial connection event
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: "connected", time: new Date().toISOString() })}\n\n`
            )
          );

          // Keepalive heartbeats
          const pingInterval = setInterval(() => {
            try {
              controller.enqueue(new TextEncoder().encode(`: ping\n\n`));
            } catch {
              clearInterval(pingInterval);
              sseClients.delete(clientFn);
            }
          }, 20000);
        },
        cancel() {
          if (clientFn) sseClients.delete(clientFn);
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    },
    {
      detail: {
        tags: ["Messages"],
        summary: "Stream SSE pesan masuk secara realtime (Admin Back Office)",
      },
    }
  )

  // POST /api/messages (Formulir kontak publik dari website)
  .post(
    "/",
    async ({ body, set, request }) => {
      // 1. IP / Rate Limiter Check (maksimal 10 pesan per 10 menit)
      const clientIp =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("cf-connecting-ip") ||
        "anonymous";
      const rateLimitKey = `ratelimit:contact:${clientIp}`;
      const { allowed, remaining } = await checkRateLimit(rateLimitKey, 10, 600);

      if (!allowed) {
        set.status = 429;
        return {
          success: false,
          message: "Terlalu banyak permintaan pesan. Silakan coba kembali beberapa menit lagi.",
        };
      }

      const id = `msg-${Date.now()}`;
      const inserted = await db
        .insert(schema.contactMessages)
        .values({
          id,
          name: body.name.trim(),
          email: body.email.trim(),
          phone: body.phone.trim(),
          company: body.company.trim(),
          serviceRequested: body.serviceRequested || "General Inquiry",
          message: body.message.trim(),
          status: "unread",
          createdAt: new Date(),
        })
        .returning();

      // Siarkan pesan baru secara realtime ke seluruh admin yang sedang online
      if (inserted && inserted[0]) {
        broadcastNewMessage(inserted[0]);
      }

      set.status = 201;
      return {
        success: true,
        message: "Pesan Anda berhasil terkirim. Tim CITS akan segera menghubungi Anda.",
        data: inserted[0],
        remainingLimit: remaining,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        email: t.String(),
        phone: t.String({ minLength: 6 }),
        company: t.String({ minLength: 2 }),
        serviceRequested: t.Optional(t.String()),
        message: t.String({ minLength: 5 }),
      }),
      detail: {
        tags: ["Messages"],
        summary: "Kirim pesan / formulir konsultasi (Publik)",
      },
    }
  )

  // GET /api/messages (Inbox pesan admin)
  .get(
    "/",
    async () => {
      const list = await db
        .select()
        .from(schema.contactMessages)
        .orderBy(desc(schema.contactMessages.createdAt));

      return { success: true, data: list };
    },
    {
      detail: {
        tags: ["Messages"],
        summary: "Daftar kotak masuk pesan konsultasi (Admin)",
      },
    }
  )

  // PATCH /api/messages/:id/status (Ubah status pesan: unread -> read -> replied)
  .patch(
    "/:id/status",
    async ({ params, body, set }) => {
      const updated = await db
        .update(schema.contactMessages)
        .set({ status: body.status })
        .where(eq(schema.contactMessages.id, params.id))
        .returning();

      if (!updated || updated.length === 0) {
        set.status = 404;
        return { success: false, message: "Pesan tidak ditemukan." };
      }

      return {
        success: true,
        message: `Status pesan berhasil diperbarui menjadi ${body.status}`,
        data: updated[0],
      };
    },
    {
      body: t.Object({
        status: t.Union([t.Literal("unread"), t.Literal("read"), t.Literal("replied")]),
      }),
      detail: {
        tags: ["Messages"],
        summary: "Perbarui status pesan konsultasi (Admin)",
      },
    }
  )

  // DELETE /api/messages/:id
  .delete(
    "/:id",
    async ({ params, set }) => {
      const deleted = await db
        .delete(schema.contactMessages)
        .where(eq(schema.contactMessages.id, params.id))
        .returning();

      if (!deleted || deleted.length === 0) {
        set.status = 404;
        return { success: false, message: "Pesan tidak ditemukan." };
      }

      return { success: true, message: "Pesan berhasil dihapus." };
    },
    {
      detail: {
        tags: ["Messages"],
        summary: "Hapus pesan masuk (Admin)",
      },
    }
  );
