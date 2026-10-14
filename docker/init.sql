-- ====================================================================
-- CITS Indonesia - Database Initialization & Seed Script
-- PostgreSQL 16
-- ====================================================================

-- 1. Table: admin_users
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Super Admin',
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default admin user: username: maswahyuganteng, email: maswahyuganteng@cits.id, password: admin
INSERT INTO admin_users (id, name, email, password_hash, role, avatar_url)
VALUES ('admin-1', 'maswahyuganteng', 'maswahyuganteng@cits.id', '$argon2id$v=19$m=65536,t=2,p=1$dgwxxgPXwplUocfnROG8JUUBNMCPPqLAJxbxDsUhMmw$MsIkx1tRVoIM+c2HUcQcfZmkGeCDqZtaziAOuKtNAuw', 'Super Admin', '/avatars/admin.webp')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash;

-- 2. Table: products
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    features JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    icon VARCHAR(50) DEFAULT 'Package',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed products
INSERT INTO products (id, name, category, description, features, tags, icon, is_active, updated_at)
VALUES 
(
    'sms-gateway',
    'SMS Gateway Enterprise',
    'Communication',
    'Platform pengiriman SMS massal dan transaksional yang andal untuk kebutuhan notifikasi, OTP, promosi, dan komunikasi bisnis instansi.',
    '["Pengiriman massal (Bulk SMS)", "Integrasi REST API", "Laporan pengiriman real-time", "Template pesan dinamis", "High throughput gateway"]'::jsonb,
    '["Bulk SMS", "OTP", "API Ready", "SMPP Protocol"]'::jsonb,
    'MessageSquare',
    TRUE,
    CURRENT_TIMESTAMP
),
(
    'j2me-data-collector',
    'J2ME & Mobile Data Collector',
    'Mobile',
    'Aplikasi pengumpulan data lapangan berbasis mobile untuk survei statistik, sensus daerah, dan pendataan lapangan terverifikasi GPS.',
    '["Mode offline storage", "Pelacakan koordinat GPS", "Form builder dinamis", "Sinkronisasi otomatis saat online", "Validasi data instan"]'::jsonb,
    '["Survey Field", "GPS Tracking", "Offline First", "Android & Cross-platform"]'::jsonb,
    'Smartphone',
    TRUE,
    CURRENT_TIMESTAMP
),
(
    'dokumen-manajemen',
    'Dokumen Manajemen (EDMS)',
    'Enterprise',
    'Sistem pengelolaan dokumen digital terpadu untuk mengorganisir, menyimpan, mengindeks, dan berbagi berkas kedinasan secara aman.',
    '["Kontrol versi dokumen (Versioning)", "Manajemen hak akses bertingkat", "Pencarian teks lengkap (Full-text)", "Audit trail riwayat akses", "Enkripsi arsip digital"]'::jsonb,
    '["EDMS", "Paperless Office", "ISO 27001", "Digital Archive"]'::jsonb,
    'FileText',
    TRUE,
    CURRENT_TIMESTAMP
),
(
    'situng-pilkada',
    'Situng Pilkada & Pemilu',
    'Government',
    'Sistem informasi hitung cepat dan rekapitulasi data perolehan suara terdistribusi dengan verifikasi berjenjang dan audit keamanan siber.',
    '["Tabulasi suara real-time", "Pemindaian formulir C1 digital", "Dashboard publik transparan", "Audit integritas enkripsi kriptografi", "High availability server"]'::jsonb,
    '["E-Voting", "Tabulasi Suara", "KPU Ready", "High Security"]'::jsonb,
    'Vote',
    TRUE,
    CURRENT_TIMESTAMP
),
(
    'cms-ecommerce',
    'Website CMS & Portal Enterprise',
    'Web',
    'Portal terpadu dan sistem manajemen konten kustom berkinerja tinggi yang dirancang adaptif untuk kebutuhan branding korporasi dan pelayanan publik.',
    '["Manajemen konten WYSIWYG intuitif", "Desain responsif multi-device", "Optimasi SEO & performa CWV", "Integrasi payment gateway nasional", "Modul analitik kunjungan"]'::jsonb,
    '["Portal Web", "GovTech", "E-Commerce", "CMS Kustom"]'::jsonb,
    'Globe',
    TRUE,
    CURRENT_TIMESTAMP
),
(
    'e-filing',
    'E-Filing & Arsip Pajak',
    'Enterprise',
    'Sistem pelaporan berkas dan pengarsipan kepatuhan elektronik yang terintegrasi dengan validasi tanda tangan digital dan jejak rekam terpercaya.',
    '["Pelaporan berkas digital mandiri", "Tanda tangan digital tersertifikasi", "Validasi format data otomatis", "Arsip berbasis cloud terenkripsi", "Notifikasi tenggat waktu"]'::jsonb,
    '["E-Tax", "Tanda Tangan Digital", "Compliance", "Arsip Elektronik"]'::jsonb,
    'Archive',
    TRUE,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

-- 3. Table: contact_info
CREATE TABLE IF NOT EXISTS contact_info (
    id VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL,
    working_hours VARCHAR(100) NOT NULL,
    emergency_phone VARCHAR(50),
    maps_url TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO contact_info (id, company_name, address, phone, email, working_hours, emergency_phone, maps_url)
VALUES (
    'default',
    'PT Cipta Integrasi Teknologi Solusi (CITS)',
    'Gedung Wisma Mampang, Lt. 5, Jl. Mampang Prapatan No. 1, Jakarta Selatan 12790, Indonesia',
    '021 - 39719677',
    'info@citsindonesia.co.id',
    'Senin - Jumat: 08:30 - 17:30 WIB',
    '+62 811-1971-9677',
    'https://maps.google.com/?q=Wisma+Mampang+Jakarta+Selatan'
)
ON CONFLICT (id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    working_hours = EXCLUDED.working_hours,
    emergency_phone = EXCLUDED.emergency_phone,
    maps_url = EXCLUDED.maps_url;

-- 4. Table: contact_messages
CREATE TABLE IF NOT EXISTS contact_messages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    company VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    service_requested VARCHAR(150),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'unread', -- 'unread', 'read', 'replied'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO contact_messages (id, name, email, phone, company, service_requested, message, status, created_at)
VALUES 
(
    'msg-101',
    'Bambang Sudarmono',
    'bambang.s@dephub.go.id',
    '081288992211',
    'Kementerian Perhubungan RI',
    'Software House',
    'Kami bermaksud menjadwalkan audiensi teknis terkait rencana modernisasi aplikasi pemantauan pelabuhan logistik untuk anggaran 2027.',
    'unread',
    CURRENT_TIMESTAMP
),
(
    'msg-102',
    'Dian Permatasari',
    'dian.p@esdm.go.id',
    '081399887766',
    'Kementerian ESDM',
    'IT Consultant',
    'Mohon informasi ketersediaan jadwal tim ahli CITS untuk pendampingan penyelarasan arsitektur SPBE sektor ketenagalistrikan.',
    'read',
    CURRENT_TIMESTAMP
),
(
    'msg-103',
    'Ir. Hendra Gunawan',
    'hendra.g@indonesiapower.co.id',
    '081122334455',
    'PT Indonesia Power',
    'IT Supplier',
    'Klarifikasi spesifikasi pengadaan server rackmount enterprise dan perangkat firewall redundancy untuk DRC kantor pusat.',
    'replied',
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

-- 5. Table: about_data
CREATE TABLE IF NOT EXISTS about_data (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    subtitle TEXT NOT NULL,
    story TEXT NOT NULL,
    vision TEXT NOT NULL,
    mission JSONB DEFAULT '[]'::jsonb,
    core_values JSONB DEFAULT '[]'::jsonb,
    stats JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO about_data (id, title, subtitle, story, vision, mission, core_values, stats)
VALUES (
    'default',
    'Tentang CITS Indonesia',
    'Cipta Integrasi Teknologi Solusi — Mitra Strategis Rekayasa Sistem Sejak 2006',
    'Berdiri sejak tahun 2006, PT Cipta Integrasi Teknologi Solusi (CITS) telah mendedikasikan keahlian dan kapasitas teknisnya untuk menjadi mitra transformasi digital terpercaya bagi kementerian, instansi pemerintah, BUMN, dan korporasi terkemuka di Indonesia. Kami memadukan kepatuhan regulasi SPBE, standar rekayasa perangkat lunak enterprise, dan keamanan siber berstandar internasional.',
    'Menjadi mitra terdepan dan terpercaya dalam rekayasa teknologi informasi dan tata kelola digital terpadu yang memajukan efisiensi nasional.',
    '[
        "Menyediakan solusi perangkat lunak kustom berkinerja tinggi, aman, dan adaptif terhadap kebutuhan proses bisnis.",
        "Memberikan layanan konsultansi strategis TI dan SPBE yang akuntabel, efisien, dan selaras regulasi.",
        "Mendukung keandalan infrastruktur teknologi melalui pengadaan perangkat keras enterprise orisinal bergaransi resmi.",
        "Membangun kemitraan jangka panjang berlandaskan integritas, profesionalisme, dan alih pengetahuan berkelanjutan."
    ]'::jsonb,
    '[
        {"title": "Integritas & Akuntabilitas", "description": "Menjunjung transparansi pengadaan dan kepatuhan penuh terhadap standar hukum PBJ LKPP."},
        {"title": "Keunggulan Rekayasa", "description": "Penerapan clean code, arsitektur modern, dan pengujian kualitas yang ketat tanpa kompromi."},
        {"title": "Keamanan Siber Terpadu", "description": "Perlindungan data berlapis dan enkripsi end-to-end sesuai prinsip ISO 27001 dan UU PDP."},
        {"title": "Kemitraan Berkelanjutan", "description": "Pendampingan operasional purna jual dan SLA siap siaga menjamin kelancaran layanan."}
    ]'::jsonb,
    '[
        {"label": "Tahun Pengalaman", "value": "18+", "description": "Rekam jejak teruji sejak 2006 di berbagai sektor industri dan pemerintahan"},
        {"label": "Inisiatif Proyek Sukses", "value": "150+", "description": "Sistem enterprise, portal kementerian, dan implementasi infrastruktur"},
        {"label": "Kementerian & BUMN", "value": "40+", "description": "Institusi terpercaya yang menjadi mitra strategis CITS Indonesia"},
        {"label": "Komitmen SLA Ketersediaan", "value": "99.9%", "description": "Standar ketersediaan sistem dan respon penanganan teknis"}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 6. Table: clients
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    logo VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO clients (id, name, logo, category, is_active)
VALUES 
('c-1', 'Kementerian Perhubungan RI', '/clients/kemenhub.webp', 'Kementerian', TRUE),
('c-2', 'Kementerian ESDM', '/clients/esdm.webp', 'Kementerian', TRUE),
('c-3', 'Kementerian Ketenagakerjaan RI', '/clients/kemnaker.webp', 'Kementerian', TRUE),
('c-4', 'Kementerian Investasi / BKPM', '/clients/bkpm.webp', 'Kementerian', TRUE),
('c-5', 'Kementerian Kesehatan RI', '/clients/kemenkes.webp', 'Kementerian', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 7. Table: landing_page_data (Pengaturan Halaman Utama Web)
CREATE TABLE IF NOT EXISTS landing_page_data (
    id VARCHAR(50) PRIMARY KEY,
    hero JSONB DEFAULT '{}'::jsonb,
    highlights JSONB DEFAULT '[]'::jsonb,
    services_intro JSONB DEFAULT '{}'::jsonb,
    cta JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO landing_page_data (id, hero, highlights, services_intro, cta)
VALUES (
    'default',
    '{
        "badgeText": "Penyedia Solusi Teknologi Informasi Sejak 2006",
        "headlinePrefix": "Ciptakan Solusi",
        "typewriterWords": ["Sepenuh Hati", "Tingkat Enterprise", "Skala Nasional", "Berbasis Inovasi", "Terpercaya Sejak 2006"],
        "subheadline": "CITS Indonesia hadir sebagai mitra bisnis terpercaya dalam menyediakan solusi integral kesistemanan berbasis teknologi informasi untuk instansi pemerintah, BUMN, dan korporasi.",
        "primaryCtaText": "Konsultasi Sekarang",
        "primaryCtaLink": "/contact",
        "secondaryCtaText": "Eksplorasi Produk",
        "secondaryCtaLink": "/products",
        "trustBadges": ["Terdaftar LPSE & SIKaP LKPP", "Dukungan Tim Ahli 24/7"]
    }'::jsonb,
    '[
        {"label": "Tahun Berpengalaman", "value": "19+"},
        {"label": "Proyek Selesai", "value": "50+"},
        {"label": "Kementerian & Lembaga", "value": "15+"},
        {"label": "Tim Profesional", "value": "30+"}
    ]'::jsonb,
    '{
        "badge": "Pilar Layanan Utama",
        "title": "Layanan Unggulan Kami",
        "subtitle": "Kombinasi keahlian teknis tingkat enterprise dan tata kelola berstandar industri dengan prinsip FOCUS."
    }'::jsonb,
    '{
        "badge": "Mitra Transformasi Digital Terpercaya",
        "title": "Siap Mengakselerasi Sistem Informasi Perusahaan Anda?",
        "subtitle": "Konsultasikan kebutuhan IT, rekayasa software custom, atau pengadaan infrastruktur Anda dengan tim profesional CITS Indonesia.",
        "primaryText": "Mulai Konsultasi Gratis",
        "primaryLink": "/contact",
        "secondaryText": "Pelajari Profil Perusahaan",
        "secondaryLink": "/about"
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

