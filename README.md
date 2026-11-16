# Ayat — Al-Qur’an Offline

Pembaca Al-Qur’an berbentuk PWA untuk Android, iPhone, dan desktop. Situs statis ini bisa dipasang di layar utama tanpa akun.

- Teks 114 surah / 6.236 ayat, navigasi Juz, ejaan nama surah Indonesia, bacaan Latin, dan arti Indonesia.
- Per Ayat menampilkan Arab, Latin, dan arti. Per Lembar menampilkan satu halaman utuh dari pembagian 604 halaman. Cubit/ketuk dua kali atau +/− untuk zoom; geser untuk pan. Saat Pas layar, geser kiri/kanan untuk pindah lembar. Ketuk nomor di header untuk melompat. Ketuk ayat untuk audio atau penanda.
- Posisi baca, penanda, ukuran teks, dan mode malam disimpan lokal pada perangkat.
- Audio Mishary Rashid Alafasy bisa diputar langsung lewat internet. Unduh per surah jika ingin mendengarkan offline.
- Tajwid warna merupakan pratinjau, belum ditashih independen, dan hanya tersedia pada ayat yang cocok persis dengan teks sumber anotasi.

## Pasang

Buka alamat HTTPS GitHub Pages. Android: Chrome → menu ⋮ → Instal/Tambahkan ke layar utama. iPhone: Safari → Bagikan → Tambahkan ke Layar Utama. Tunggu “Teks siap offline”; audio perlu diunduh terpisah.

## Jalankan dan terbitkan

Sajikan direktori ini melalui server HTTP lokal atau hosting HTTPS. Seluruh aset menggunakan alamat relatif, sehingga mendukung subdirektori GitHub Pages. Aktifkan Pages dari cabang penerbitan, folder root (/). Berkas .nojekyll menonaktifkan pemrosesan Jekyll.

## Sumber dan ketentuan

- Teks Arab: Tanzil Uthmani 1.1, dipertahankan tanpa perubahan, CC BY 3.0 beserta ketentuan Tanzil. Lihat [pemberitahuan](licenses/Tanzil.txt).
- Arti Indonesia, bacaan latin dan nama surah: EQuran.id API v2, dengan Kemenag sebagai sumber menurut dokumentasi penyedia. Berbagi dengan atribusi dan penggunaan edukasi diizinkan; data tidak boleh dijual. Lihat [ketentuan](licenses/Indonesian.txt).
- Anotasi tajwid: Collin Fair / cpfair/quran-tajweed, CC BY 4.0; cakupan terbatas. Lihat [atribusi](licenses/Tajweed.txt).
- Audio/timing: MP3Quran.net, Alafasy rekaman 123. Audio tidak disimpan dalam repositori. Lihat [catatan izin](licenses/Audio.txt).
- Scheherazade New (SIL), Amiri Quran dan Plus Jakarta Sans: SIL OFL 1.1, lisensi di folder licenses. Font disertakan offline. Teks ayat tidak diubah atau disisipi karakter penyambung; tajwid menggunakan CSS Custom Highlight dengan fallback teks polos.

Lisensi data dan font berlaku secara terpisah; repositori ini tidak memberikan lisensi baru atas konten pihak ketiga. Ini prototipe edukasi yang belum menjalani tashih independen. Bacaan latin membantu mengikuti ayat dan tidak menggantikan bimbingan pelafalan.

Penanda dan unduhan tidak dikirim ke server. Perpindahan domain membuat penyimpanan perangkat terpisah; gunakan ekspor/impor penanda untuk memindahkannya.
