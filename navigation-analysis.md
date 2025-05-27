# Analisis Tombol Navigasi HOME

## Lokasi Tombol HOME yang Ditemukan:

1. **Line 266**: Submenu level - `🏠 HOME` (back_to_main_from_submenu)
2. **Line 310**: Response level - `🏠 HOME` (back_to_main_from_response) 
3. **Line 418**: Final response level - `🏠 HOME` (back_to_main_from_final_response)
4. **Line 542**: All show menu - `🏠 HOME` (main_menu_from_all_show)

## Masalah:
- Ada 4 tombol HOME berbeda dengan ID berbeda
- Semua menggunakan callback yang sama: 'back_to_main'
- Bisa menyebabkan konflik dan duplikasi

## Solusi:
- Buat 1 fungsi helper untuk membuat tombol HOME
- Pastikan ID unik tapi callback konsisten
- Hapus duplikasi yang tidak perlu