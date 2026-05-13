do $$
declare
  role_data_type text;
  role_udt_name text;
  account_roles_constraint text;
begin
  select data_type, udt_name
  into role_data_type, role_udt_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = 'role';

  if role_data_type = 'USER-DEFINED' then
    execute format('alter type public.%I add value if not exists ''marketing''', role_udt_name);
    execute format('alter type public.%I add value if not exists ''marketing_manager''', role_udt_name);
  end if;

  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_role_check'
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('customer', 'merchant', 'admin', 'operations_manager', 'finance', 'finance_manager', 'marketing', 'marketing_manager', 'superadmin'));

  select conname
  into account_roles_constraint
  from pg_constraint
  where conrelid = 'public.account_roles'::regclass
    and conname = 'account_roles_role_check';

  if account_roles_constraint is not null then
    alter table public.account_roles drop constraint account_roles_role_check;
  end if;

  alter table public.account_roles
    add constraint account_roles_role_check
    check (role in ('customer', 'merchant', 'admin', 'operations_manager', 'finance', 'finance_manager', 'marketing', 'marketing_manager', 'superadmin'));
end $$;

create table if not exists public.marketing_promos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_id text not null,
  title_en text not null,
  title_zh text not null,
  badge_id text,
  badge_en text,
  badge_zh text,
  eyebrow_id text not null,
  eyebrow_en text not null,
  eyebrow_zh text not null,
  price_id text not null,
  price_en text not null,
  price_zh text not null,
  cta_id text not null,
  cta_en text not null,
  cta_zh text not null,
  image text not null,
  gradient text not null,
  image_class text not null,
  overlay_class text not null,
  glow_class text not null,
  target_href text not null default '/promo',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_promos_active_sort_idx
  on public.marketing_promos (is_active, sort_order asc, created_at asc);

alter table public.marketing_promos enable row level security;

create table if not exists public.marketing_inspiration_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category_id text not null,
  category_en text not null,
  category_zh text not null,
  title_id text not null,
  title_en text not null,
  title_zh text not null,
  read_time_id text not null,
  read_time_en text not null,
  read_time_zh text not null,
  body_intro_id text not null,
  body_intro_en text not null,
  body_intro_zh text not null,
  section_one_id text not null,
  section_one_en text not null,
  section_one_zh text not null,
  section_two_id text not null,
  section_two_en text not null,
  section_two_zh text not null,
  section_three_id text not null,
  section_three_en text not null,
  section_three_zh text not null,
  image text not null,
  href text not null default '/packages',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_inspiration_articles_active_sort_idx
  on public.marketing_inspiration_articles (is_active, sort_order asc, created_at asc);

alter table public.marketing_inspiration_articles enable row level security;

insert into public.marketing_promos (
  slug, title_id, title_en, title_zh, badge_id, badge_en, badge_zh, eyebrow_id, eyebrow_en, eyebrow_zh, price_id, price_en, price_zh, cta_id, cta_en, cta_zh, image, gradient, image_class, overlay_class, glow_class, target_href, is_active, sort_order
) values
  (
    'terbang-hemat-ke-banyak-destinasi',
    'Terbang Hemat
ke Banyak Destinasi',
    'Save More on Flights
to Many Destinations',
    '超值机票优惠
飞往更多目的地',
    'Promo Terbatas',
    'Limited Promo',
    '限时优惠',
    'Diskon hingga',
    'Discount up to',
    '最高优惠',
    'Rp 500.000*',
    'IDR 500,000*',
    'Rp 500.000*',
    'Pesan Sekarang',
    'Book Now',
    '立即预订',
    '/home-assets/promo-flight.png',
    'from-[#ad718b] via-[#a76681] to-[#f1a38d]',
    'bg-[length:162%] bg-[position:8%_65%] opacity-36',
    'bg-[linear-gradient(90deg,rgba(133,72,104,0.9)_0%,rgba(167,101,129,0.68)_26%,rgba(208,132,145,0.28)_52%,rgba(239,165,144,0.06)_76%,rgba(239,165,144,0)_100%)]',
    'bg-[radial-gradient(circle_at_78%_22%,rgba(255,224,212,0.24)_0%,rgba(255,224,212,0.12)_18%,rgba(255,224,212,0)_42%)]',
    '/pesawat',
    true,
    0
  ),
  (
    'hotel-pilihan-harga-terbaik',
    'Hotel Pilihan
Harga Terbaik',
    'Selected Hotels
Best Rates',
    '精选酒店
超值好价',
    null,
    null,
    null,
    'Diskon hingga',
    'Discount up to',
    '最高优惠',
    '40%*',
    '40%*',
    '40%*',
    'Booking Sekarang',
    'Book Now',
    '立即预订',
    '/home-assets/promo-hotel.png',
    'from-[#2874d8] via-[#327ee1] to-[#175ec3]',
    'bg-cover bg-[position:66%_center] opacity-34',
    'bg-[linear-gradient(90deg,rgba(25,88,192,0.88)_0%,rgba(39,108,211,0.66)_26%,rgba(59,133,233,0.26)_52%,rgba(28,92,191,0.06)_76%,rgba(28,92,191,0)_100%)]',
    'bg-[radial-gradient(circle_at_24%_18%,rgba(151,202,255,0.22)_0%,rgba(151,202,255,0.11)_16%,rgba(151,202,255,0)_38%)]',
    '/hotel',
    true,
    1
  ),
  (
    'paket-wisata-domestik-internasional',
    'Paket Wisata
Domestik & Internasional',
    'Tour Packages
Domestic & International',
    '旅游套餐
国内与国际精选',
    null,
    null,
    null,
    'Mulai dari',
    'Starting from',
    '起价',
    'Rp 1,9 Juta*',
    'From IDR 1.9 Million*',
    'Rp 1,9 Juta*',
    'Lihat Paket',
    'View Packages',
    '查看套餐',
    '/home-assets/promo-package.png',
    'from-[#1799aa] via-[#1a96a9] to-[#256f87]',
    'bg-cover bg-[position:61%_center] opacity-34',
    'bg-[linear-gradient(90deg,rgba(18,140,154,0.86)_0%,rgba(25,156,166,0.62)_26%,rgba(82,192,173,0.24)_52%,rgba(28,109,121,0.06)_76%,rgba(28,109,121,0)_100%)]',
    'bg-[radial-gradient(circle_at_28%_22%,rgba(191,255,234,0.18)_0%,rgba(191,255,234,0.09)_18%,rgba(191,255,234,0)_40%)]',
    '/packages',
    true,
    2
  ),
  (
    'promo-kereta-antarkota-favorit',
    'Promo Kereta
Antarkota Favorit',
    'Train Promo
Favorite Intercity Routes',
    '火车优惠
热门城际路线',
    null,
    null,
    null,
    'Mulai dari',
    'Starting from',
    '起价',
    'Rp 150.000*',
    'From IDR 150,000*',
    'Rp 150.000*',
    'Pesan Kereta',
    'Book Train',
    '预订火车',
    '/home-assets/card-train.png',
    'from-[#5a63d8] via-[#5d71e6] to-[#8b74f7]',
    'bg-cover bg-[position:center_center] opacity-32',
    'bg-[linear-gradient(90deg,rgba(62,74,180,0.9)_0%,rgba(84,97,214,0.68)_26%,rgba(128,120,238,0.24)_54%,rgba(91,98,197,0.06)_76%,rgba(91,98,197,0)_100%)]',
    'bg-[radial-gradient(circle_at_24%_18%,rgba(214,220,255,0.18)_0%,rgba(214,220,255,0.09)_18%,rgba(214,220,255,0)_40%)]',
    '/kereta',
    true,
    3
  )
on conflict (slug) do nothing;

insert into public.marketing_inspiration_articles (
  slug, category_id, category_en, category_zh, title_id, title_en, title_zh, read_time_id, read_time_en, read_time_zh, body_intro_id, body_intro_en, body_intro_zh, section_one_id, section_one_en, section_one_zh, section_two_id, section_two_en, section_two_zh, section_three_id, section_three_en, section_three_zh, image, href, is_active, sort_order
) values
  (
    'panduan-liburan-hemat-ke-bali-untuk-first-timer',
    'Travel Guide',
    'Travel Guide',
    '旅行指南',
    'Panduan Liburan Hemat ke Bali untuk First Timer',
    'Budget Bali Guide for First-Time Travelers',
    '巴厘岛新手省钱旅行指南',
    'Baca 4 menit',
    '4 min read',
    '阅读 4 分钟',
    'Artikel ini dirancang sebagai panduan cepat untuk traveler yang ingin mulai dari langkah paling aman dan paling hemat.',
    'This article is designed as a quick guide for travelers who want to start with the safest and most cost-efficient steps.',
    '这篇文章适合作为旅行者用最稳妥、最省钱方式开始规划旅程的快速指南。',
    'Ringkasan ide utama yang paling relevan untuk traveler pertama kali.',
    'A summary of the key ideas most relevant for first-time travelers.',
    '适合首次出行旅客的核心建议摘要。',
    'Saran langkah lanjutan yang bisa diterapkan sebelum booking.',
    'Suggested next steps you can apply before booking.',
    '预订前可以立刻采取的下一步建议。',
    'Arahkan pembaca ke pencarian, promo, atau paket yang paling cocok setelah membaca artikel.',
    'Guide the reader toward the most relevant search, promo, or package after reading.',
    '阅读后引导用户前往最相关的搜索、优惠或套餐。',
    '/home-assets/dest-bali.png',
    '/packages',
    true,
    0
  ),
  (
    'tips-booking-hotel-saat-musim-liburan-biar-tetap-untung',
    'Hotel Insight',
    'Hotel Insight',
    '酒店洞察',
    'Tips Booking Hotel Saat Musim Liburan Biar Tetap Untung',
    'Smart Hotel Booking Tips for Holiday Season',
    '假期旺季酒店预订小技巧',
    'Baca 3 menit',
    '3 min read',
    '阅读 3 分钟',
    'Konten ini membantu user memahami cara memilih akomodasi dengan lebih cermat sebelum check-out.',
    'This content helps users understand how to choose accommodation more carefully before checkout.',
    '这篇内容帮助用户在结账前更谨慎地选择住宿。',
    'Bandingkan opsi hotel berdasarkan kebutuhan dan momentum perjalanan.',
    'Compare hotel options based on trip needs and timing.',
    '根据行程需求和时机比较酒店选项。',
    'Perhatikan ritme promo, kebijakan refund, dan lokasi.',
    'Watch promo timing, refund policy, and location.',
    '关注优惠节奏、退款政策和位置。',
    'Arahkan pembaca ke promo hotel atau pencarian properti yang paling relevan.',
    'Direct readers to the most relevant hotel promo or property search.',
    '将读者引导到最相关的酒店优惠或房源搜索。',
    '/home-assets/card-hotel-1.png',
    '/hotel',
    true,
    1
  ),
  (
    'rute-wisata-populer-di-labuan-bajo-yang-wajib-dicoba',
    'Destinasi Favorit',
    'Favorite Destinations',
    '热门目的地',
    'Rute Wisata Populer di Labuan Bajo yang Wajib Dicoba',
    'Popular Labuan Bajo Routes You Should Try',
    '拉布安巴焦值得体验的人气路线',
    'Baca 5 menit',
    '5 min read',
    '阅读 5 分钟',
    'Artikel ini memberi gambaran destinasi dan alasan kenapa tempat tersebut layak masuk rencana perjalanan berikutnya.',
    'This article gives a destination overview and explains why it deserves a place in your next itinerary.',
    '这篇文章介绍目的地亮点，并说明它为何值得加入你的下一次行程。',
    'Pilih rute yang paling cocok dengan gaya perjalanan Anda.',
    'Choose the route that best matches your travel style.',
    '选择最适合你旅行风格的路线。',
    'Lihat kapan waktu terbaik untuk masuk ke penawaran aktif.',
    'See when the best timing is to move into active offers.',
    '了解何时最适合进入当前优惠。',
    'Hubungkan minat pembaca ke promo paket atau katalog tujuan terkait.',
    'Connect reader intent to the relevant package promo or destination catalog.',
    '把读者兴趣连接到相关套餐优惠或目的地目录。',
    '/home-assets/dest-labuanbajo.png',
    '/packages',
    true,
    2
  ),
  (
    'checklist-perjalanan-keluarga-supaya-liburan-makin-nyaman',
    'Travel Tips',
    'Travel Tips',
    '旅行建议',
    'Checklist Perjalanan Keluarga Supaya Liburan Makin Nyaman',
    'Family Travel Checklist for a More Comfortable Trip',
    '家庭出游更舒适的行前清单',
    'Baca 3 menit',
    '3 min read',
    '阅读 3 分钟',
    'Artikel ini menjadi pintu masuk ringan untuk ide dan inspirasi perjalanan di ekosistem RedFeng.',
    'This article serves as a light entry point for travel ideas and inspiration within the RedFeng ecosystem.',
    '这篇文章是进入 RedFeng 旅行灵感生态的轻量入口。',
    'Siapkan kebutuhan dasar keluarga sejak awal agar perjalanan lebih tenang.',
    'Prepare core family essentials early for a calmer trip.',
    '尽早准备家庭出行基础物品，让旅程更从容。',
    'Gunakan checklist ini untuk menyaring pilihan hotel, transport, dan paket.',
    'Use this checklist to narrow down hotel, transport, and package choices.',
    '用这份清单筛选酒店、交通和套餐选项。',
    'Arahkan pembaca ke katalog paket atau promo yang paling cocok untuk keluarga.',
    'Direct readers to the package catalog or promo most suitable for families.',
    '将读者引导至最适合家庭的套餐目录或优惠。',
    '/home-assets/promo-package.png',
    '/packages',
    true,
    3
  )
on conflict (slug) do nothing;
