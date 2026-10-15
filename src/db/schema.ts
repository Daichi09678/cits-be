import { pgTable, varchar, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

// 1. Admin Users
export const adminUsers = pgTable("admin_users", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).default("Super Admin"),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. Products
export const products = pgTable("products", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description").notNull(),
  features: jsonb("features").$type<string[]>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),
  icon: varchar("icon", { length: 50 }).default("Package"),
  image: text("image"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 3. Contact Info
export const contactInfo = pgTable("contact_info", {
  id: varchar("id", { length: 50 }).primaryKey(),
  companyName: varchar("company_name", { length: 150 }).notNull(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 150 }).notNull(),
  workingHours: varchar("working_hours", { length: 100 }).notNull(),
  emergencyPhone: varchar("emergency_phone", { length: 50 }),
  mapsUrl: text("maps_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 4. Contact Messages (Formulir Pengunjung)
export const contactMessages = pgTable("contact_messages", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  company: varchar("company", { length: 150 }).notNull(),
  email: varchar("email", { length: 150 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  serviceRequested: varchar("service_requested", { length: 150 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 50 }).default("unread"), // 'unread', 'read', 'replied'
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. About Data (Profil Perusahaan)
export const aboutData = pgTable("about_data", {
  id: varchar("id", { length: 50 }).primaryKey(),
  title: varchar("title", { length: 150 }).notNull(),
  subtitle: text("subtitle").notNull(),
  story: text("story").notNull(),
  vision: text("vision").notNull(),
  mission: jsonb("mission").$type<string[]>().default([]),
  coreValues: jsonb("core_values")
    .$type<{ title: string; description: string }[]>()
    .default([]),
  stats: jsonb("stats")
    .$type<{ label: string; value: string; description: string }[]>()
    .default([]),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 6. Clients & Mitra
export const clients = pgTable("clients", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  logo: varchar("logo", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// 7. Landing Page Data (Pengaturan Konten Halaman Utama)
export const landingPageData = pgTable("landing_page_data", {
  id: varchar("id", { length: 50 }).primaryKey(),
  hero: jsonb("hero").$type<{
    badgeText: string;
    headlinePrefix: string;
    typewriterWords: string[];
    subheadline: string;
    primaryCtaText: string;
    primaryCtaLink: string;
    secondaryCtaText: string;
    secondaryCtaLink: string;
    trustBadges: string[];
  }>(),
  highlights: jsonb("highlights").$type<{ label: string; value: string }[]>(),
  servicesIntro: jsonb("services_intro").$type<{
    badge: string;
    title: string;
    subtitle: string;
  }>(),
  cta: jsonb("cta").$type<{
    badge: string;
    title: string;
    subtitle: string;
    primaryText: string;
    primaryLink: string;
    secondaryText: string;
    secondaryLink: string;
  }>(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

