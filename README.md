# Ayat — Al-Qur’an Offline

Pembaca Al-Qur’an berbentuk PWA untuk Android, iPhone, dan desktop. Situs statis ini bisa dipasang di layar utama tanpa akun.

- Teks 114 surah / 6.236 ayat, navigasi Juz, ejaan nama surah Indonesia, bacaan Latin, dan arti Indonesia.
- Per Ayat menampilkan Arab, Latin, dan arti. Per Halaman memakai 604 halaman vektor Mushaf Madinah 1441 H (Hafs), mempertahankan bentuk tulisan, posisi ayat, dan susunan baris sumber cetak. Bingkai dan navigasi milik aplikasi. Cubit/ketuk dua kali atau +/− untuk zoom; geser untuk pan. Saat Pas layar, usap jari ke kanan untuk membuka halaman berikutnya di sebelah kiri, dan ke kiri untuk kembali. Panah keyboard kiri menuju halaman berikutnya; panah kanan menuju halaman sebelumnya. Halaman tujuan dimuat sebelum beralih. Ketuk bagian kosong tepi kertas kiri untuk halaman berikutnya, kanan untuk sebelumnya. Area ketuk tepi nonaktif saat zoom agar pan tetap nyaman. Ketuk nomor di header untuk melompat. Ketuk ayat untuk audio atau penanda.
- Basmalah pembuka dipisahkan tanpa nomor, kecuali Al-Fatihah (ayat 1). At-Tawbah tidak diberi basmalah pembuka. Teks sumber tetap utuh; hanya tampilannya dipisah sesuai [panduan Tanzil](https://tanzil.net/docs/a_note_on_bismillah). Jumlah ayat surah, rentang ayat per halaman, dan jumlah ayat halaman ditampilkan; jumlah ayat tiap halaman memang berbeda.
- Beranda memiliki pintasan ringkas Qur’an Per Halaman, Qur’an Per Ayat, dan daftar Surah dengan tiga ikon khusus. Daftar Juz tetap langsung terlihat. Kolom pencarian ringkas di header langsung menampilkan semua 114 surah saat diketuk, lalu menyaringnya ketika pengguna mengetik; status offline dan tombol Tentang Ayat berada di footer paling bawah. Ikon Pasang Aplikasi dan Dengarkan Audio memiliki label di bawahnya.
- Daftar Surah memakai header hijau berukuran sama dengan layar baca, tombol Dengarkan Audio rata kiri untuk membuka panel audio, dan pencarian di bawah header.
- Deretan Juz tetap tersedia di Per Halaman/Per Ayat, deretan nama surah di Per Surah. Tidak ada tab mode atau tab Juz/Surah berulang di layar baca. Tombol Dengarkan Audio rata kiri di atas daftar, dengan ukuran dan posisi yang sama di ketiga tampilan.
- Tombol Dengarkan Audio memutar dari awal hingga akhir Juz atau Surah pilihan. Teks berubah menjadi Memuat Audio, Jeda Audio, atau Lanjutkan Audio sesuai keadaan pemutar. Tombol per ayat berubah menjadi jeda saat berjalan dan menampilkan indikator saat memuat. Sorotan ayat sementara muncul saat ayat diketuk atau audio diputar. Coretan stabilo buatan pengguna tersimpan terpisah.
- Kontrol − Pas Layar + rata kanan, berseberangan dengan Dengarkan Audio. Lembar menyesuaikan ruang layar portrait/landscape; header beradaptasi pada HP sempit tanpa kontrol yang menutupi bacaan.
- Mode Layar bersih tersedia melalui ikon empat sudut yang selalu berada di pojok kanan atas header hijau. Baris audio/zoom dan deretan Juz disembunyikan agar area mushaf lebih besar; header hijau, bingkai, nomor halaman, dan keterangan lembar tetap terlihat. Tombol tetap di posisi yang sama saat aktif atau nonaktif; ketuk lagi atau tekan Escape untuk mengembalikan kontrol. Cubit, geser, audio, dan penanda tetap berfungsi.
- Per Halaman memiliki tombol pensil di sebelah Dengarkan Audio. Aktifkan untuk menggambar stabilo dengan menyeret satu jari atau pena di atas ayat; matikan untuk kembali mengetuk audio, menggeser halaman, atau mencubit untuk zoom. Urungkan dan Hapus berlaku untuk coretan halaman yang dibuka. Coretan menggunakan koordinat kertas tetap sehingga mengikuti zoom, tersimpan lokal, dan ikut dalam cadangan penanda.
- Halaman Per Halaman terakhir yang berhasil dibuka disimpan otomatis, terpisah dari posisi ayat yang ditandai manual. Jika aplikasi ditutup saat Per Halaman terbuka, pembukaan berikutnya kembali ke halaman tersebut, termasuk offline jika halamannya sudah tersimpan. Tombol kembali ke beranda tetap membuka beranda; pintasan Per Halaman selalu mengingat halaman tersendiri. Tautan langsung ke ayat atau halaman lain tetap diikuti.
- Posisi baca, penanda, ukuran teks, dan mode malam disimpan lokal pada perangkat. Ketuk ikon jam untuk menyimpan posisi terakhir dibaca; ketuk kembali centangnya untuk membatalkan dan mengembalikan ikon jam. Penanda ayat terpisah tetap tersimpan.
- Beranda langsung menampilkan daftar Juz/Surah. Per Ayat memakai kartu Arab, Latin, dan arti. Kontrol tambahan ada di Pengaturan.
- Ikon headphone membuka panel audio; tidak ada pemutar yang menutupi bacaan. Pilih Mishary Rashid Alafasy (bawaan) atau Saad Al-Ghamdi. Putar langsung lewat internet, atau unduh per qari/surah untuk offline. Unduhan lama Mishary tetap dipertahankan.
- Tajwid warna di Per Ayat merupakan pratinjau, belum ditashih independen, dan hanya tersedia pada ayat yang cocok persis dengan teks sumber anotasi.

## Pasang

Buka alamat HTTPS GitHub Pages, lalu ketuk ikon Pasang aplikasi di kanan atas beranda. Panduan iPhone dan Android memakai screenshot dengan penanda lingkaran. Masing-masing terdiri dari 3 langkah yang dibaca dengan menggulir ke bawah. Judul dan tombol tutup tetap terlihat di atas saat panduan digulir. Android: Chrome → menu ⋮ → Instal dan buat pintasan → opsi aplikasi di bagian atas (jika sudah terpasang, ketuk untuk membuka aplikasi). iPhone: Safari → Bagikan → Tambahkan ke Layar Utama → Tambah; aktifkan Buka sebagai App Web jika tersedia. Tunggu “Teks siap offline”. Halaman mushaf yang dibuka tersimpan otomatis; untuk seluruh 604 halaman unduh paket sekitar 95 MB melalui Unduhan. Audio diunduh terpisah.

## Jalankan dan terbitkan

Sajikan direktori ini melalui server HTTP lokal atau hosting HTTPS. Seluruh aset menggunakan alamat relatif, sehingga mendukung subdirektori GitHub Pages. Aktifkan Pages dari cabang penerbitan, folder root (/). Berkas .nojekyll menonaktifkan pemrosesan Jekyll.

## Sumber dan ketentuan

- Artwork mushaf: King Fahd Quran Complex, edisi Hafs 1441 H, melalui [Quran.ws / quran-svg](https://github.com/quran-ws/quran-svg) commit b4155f07e4aea087d2c458069acff9f7c7e749f6. Izin penggunaan digital dan CC BY 4.0 untuk pemetaan disertakan: [NOTICE](licenses/Quran-SVG-NOTICE.txt), [LICENSE](licenses/Quran-SVG-LICENSE.txt), [asal berkas](licenses/Quran-SVG-PROVENANCE.txt). Path/transform SVG dipertahankan; paket gzip diverifikasi checksum.
- Teks Arab Per Ayat: Tanzil Uthmani 1.1, dipertahankan tanpa perubahan, CC BY 3.0 beserta ketentuan Tanzil. Lihat [pemberitahuan](licenses/Tanzil.txt).
- Arti Indonesia, bacaan latin dan nama surah: EQuran.id API v2, dengan Kemenag sebagai sumber menurut dokumentasi penyedia. Berbagi dengan atribusi dan penggunaan edukasi diizinkan; data tidak boleh dijual. Lihat [ketentuan](licenses/Indonesian.txt).
- Anotasi tajwid: Collin Fair / cpfair/quran-tajweed, CC BY 4.0; cakupan terbatas. Lihat [atribusi](licenses/Tajweed.txt).
- Audio/timing: MP3Quran.net, Alafasy rekaman 123 dan Saad Al-Ghamdi rekaman 30; masing-masing 114 surah dan 6.236 penanda ayat telah diperiksa secara struktural. Audio tidak disimpan dalam repositori. Lihat [catatan izin](licenses/Audio.txt).
- Scheherazade New (SIL), Amiri Quran dan Plus Jakarta Sans: SIL OFL 1.1, lisensi di folder licenses. Font disertakan offline. Teks ayat tidak diubah atau disisipi karakter penyambung; tajwid menggunakan CSS Custom Highlight dengan fallback teks polos.

Lisensi data dan font berlaku secara terpisah; repositori ini tidak memberikan lisensi baru atas konten pihak ketiga. Ini prototipe edukasi yang belum menjalani tashih independen. Bacaan latin membantu mengikuti ayat dan tidak menggantikan bimbingan pelafalan.

Penanda dan unduhan tidak dikirim ke server. Perpindahan domain membuat penyimpanan perangkat terpisah; gunakan ekspor/impor penanda untuk memindahkannya.
