export interface TeamMember {
  id: string;
  name: string;
  position: string;
  teamName?: string;
  photoUrl: string | null;
  displayOrder?: number;
  isActive?: boolean;
  showOnHomepage?: boolean;
  isDemo?: boolean;
}

export type TeamMemberInput = Omit<TeamMember, "id">;

export function parseTeamMember(
  value: unknown,
): { ok: true; value: TeamMemberInput } | { ok: false; message: string } {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { ok: false, message: "Data anggota tim tidak valid." };
  const input = value as Record<string, unknown>;
  if (
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.trim().length > 120
  )
    return { ok: false, message: "Nama wajib diisi, maksimal 120 karakter." };
  if (
    typeof input.position !== "string" ||
    !input.position.trim() ||
    input.position.trim().length > 160
  )
    return {
      ok: false,
      message: "Jabatan wajib diisi, maksimal 160 karakter.",
    };
  const order = input.displayOrder ?? 0;
  if (input.teamName !== undefined && (typeof input.teamName !== "string" || input.teamName.trim().length > 100))
    return { ok: false, message: "Nama tim harus berupa teks, maksimal 100 karakter." };
  if (
    typeof order !== "number" ||
    !Number.isSafeInteger(order) ||
    order < 0 ||
    order > 9999
  )
    return {
      ok: false,
      message: "Urutan harus berupa angka bulat antara 0 dan 9999.",
    };
  for (const key of ["isActive", "showOnHomepage", "isDemo"])
    if (input[key] !== undefined && typeof input[key] !== "boolean")
      return {
        ok: false,
        message: "Status tampil harus berupa pilihan aktif atau nonaktif.",
      };
  const photo = input.photoUrl;
  if (photo !== undefined && photo !== null && typeof photo !== "string")
    return { ok: false, message: "Alamat foto tidak valid." };
  const photoUrl = typeof photo === "string" ? photo.trim() : "";
  if (photoUrl && !isTeamPhotoUrl(photoUrl))
    return {
      ok: false,
      message:
        "Gunakan URL foto HTTP/HTTPS, lokasi gambar lokal, atau unggah foto maksimal 5 MB.",
    };
  return {
    ok: true,
    value: {
      name: input.name.trim(),
      position: input.position.trim(),
      ...(typeof input.teamName === "string" ? { teamName: input.teamName.trim() } : {}),
      photoUrl: photoUrl || null,
      displayOrder: order,
      isActive: input.isActive !== false,
      showOnHomepage: input.showOnHomepage !== false,
      isDemo: input.isDemo === true,
    },
  };
}

export function isTeamPhotoUrl(value: string): boolean {
  if (value.length > 7_000_000 || /[\u0000-\u001f\\]/.test(value)) return false;
  if (
    /^data:image\/(png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/.test(
      value,
    )
  )
    return true;
  if (value.length > 2048) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function sortTeamMembers(members: readonly TeamMember[]): TeamMember[] {
  return [...members].sort(
    (a, b) =>
      (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
      a.name.localeCompare(b.name, "id") ||
      a.id.localeCompare(b.id),
  );
}
