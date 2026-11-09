/**
 * Chế độ gỡ lỗi: bật khi chạy `npm run dev`, hoặc khi địa chỉ có `?debug` (kể cả bản build thật).
 * Khi bật: có API `window.__vls` trong console và nút "Chế độ TEST" ở menu chính.
 */
export function isDebugMode(): boolean {
  return import.meta.env.DEV || new URLSearchParams(location.search).has('debug');
}
