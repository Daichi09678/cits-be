import { Elysia, t } from "elysia";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const UPLOADS_DIR = join(process.cwd(), "uploads");
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const uploadRoutes = new Elysia({ prefix: "/api/uploads" }).post(
  "/",
  async ({ body, set }) => {
    const file = body.file;
    if (!file) {
      set.status = 400;
      return { success: false, message: "Berkas tidak ditemukan." };
    }

    const extension = file.name ? file.name.split(".").pop() : "bin";
    const fileName = `upload-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}.${extension}`;
    const filePath = join(UPLOADS_DIR, fileName);

    await Bun.write(filePath, file);

    return {
      success: true,
      message: "Berkas berhasil diunggah",
      url: `/uploads/${fileName}`,
      fileName,
    };
  },
  {
    body: t.Object({
      file: t.File(),
    }),
    detail: {
      tags: ["Uploads"],
      summary: "Upload gambar / logo / dokumen",
    },
  }
);
