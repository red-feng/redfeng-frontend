-- Normalisasi katalog fasilitas agar fokus ke inclusion standar operator tour besar.

-- Pastikan fasilitas pengganti tersedia lebih dulu.
insert into public.facilities (name, category)
select name, category
from (
  values
    ('Sarapan harian', 'Makan & Minum'),
    ('Makan siang', 'Makan & Minum'),
    ('Makan malam', 'Makan & Minum'),
    ('Air mineral', 'Makan & Minum'),
    ('Transportasi selama tour', 'Transportasi'),
    ('Antar-jemput bandara / meeting point', 'Transportasi'),
    ('Driver berpengalaman & BBM', 'Transportasi'),
    ('Tiket transportasi antarkota', 'Transportasi'),
    ('Guide lokal / berlisensi', 'Pemandu & Operasional'),
    ('Tour leader', 'Pemandu & Operasional'),
    ('Tiket masuk objek wisata', 'Tiket & Akses'),
    ('Parkir & tol', 'Tiket & Akses'),
    ('Hotel Bintang 3', 'Akomodasi'),
    ('Hotel Bintang 4', 'Akomodasi'),
    ('Hotel Bintang 5', 'Akomodasi'),
    ('Asuransi perjalanan', 'Proteksi'),
    ('Dokumentasi foto/video', 'Layanan Tambahan'),
    ('Pilihan makanan halal', 'Layanan Tambahan'),
    ('Bantuan pengurusan visa', 'Layanan Tambahan')
) as seed(name, category)
where not exists (
  select 1
  from public.facilities existing
  where existing.name = seed.name
);

-- Rename fasilitas yang masih cocok, supaya relasi paket tetap terjaga.
update public.facilities set name = 'Sarapan harian', category = 'Makan & Minum' where name = 'Termasuk Sarapan';
update public.facilities set name = 'Transportasi selama tour', category = 'Transportasi' where name = 'Kendaraan selama tour';
update public.facilities set name = 'Pilihan makanan halal', category = 'Layanan Tambahan' where name = 'Restoran Halal';
update public.facilities set name = 'Tiket transportasi antarkota', category = 'Transportasi' where name = 'Tiket pesawat / kereta / kapal';
update public.facilities set name = 'Bantuan pengurusan visa', category = 'Layanan Tambahan' where name = 'Bantuan visa';

-- Gabungkan varian asuransi lama ke satu fasilitas standar.
insert into public.package_facilities (package_id, facility_id)
select distinct old_pf.package_id, new_facility.id
from public.package_facilities old_pf
join public.facilities old_facility on old_facility.id = old_pf.facility_id
join public.facilities new_facility on new_facility.name = 'Asuransi perjalanan'
where old_facility.name in ('Asuransi wisata domestik', 'Asuransi wisata internasional', 'Perlindungan kecelakaan')
  and not exists (
    select 1
    from public.package_facilities existing
    where existing.package_id = old_pf.package_id
      and existing.facility_id = new_facility.id
  );

-- Hapus relasi fasilitas yang tidak lagi dianggap inclusion standar.
delete from public.package_facilities
where facility_id in (
  select id
  from public.facilities
  where name in (
    'Hotel Bintang 2',
    'Kamar Double',
    'Kamar Twin',
    'Kamar Triple',
    'Tiket wahana',
    'Rafting',
    'Jeep tour',
    'City tour',
    'Snorkeling',
    'Honeymoon',
    'Asuransi wisata domestik',
    'Asuransi wisata internasional',
    'Perlindungan kecelakaan'
  )
);

-- Hapus entri fasilitas lama yang tidak dipakai lagi.
delete from public.facilities
where name in (
  'Hotel Bintang 2',
  'Kamar Double',
  'Kamar Twin',
  'Kamar Triple',
  'Tiket wahana',
  'Rafting',
  'Jeep tour',
  'City tour',
  'Snorkeling',
  'Honeymoon',
  'Asuransi wisata domestik',
  'Asuransi wisata internasional',
  'Perlindungan kecelakaan'
);
