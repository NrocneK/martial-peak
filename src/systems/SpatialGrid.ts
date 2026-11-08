/**
 * Lưới không gian: chia thế giới thành các ô vuông để tìm nhanh "các đối tượng ở gần một điểm"
 * mà không phải duyệt qua toàn bộ quái (quan trọng khi có hàng trăm quái + hàng chục đạn).
 * Dựng lại mỗi khung hình (clear → insert hết → query).
 */
export class SpatialGrid<T extends { x: number; y: number }> {
  private cells = new Map<number, T[]>();
  private pool: T[][] = [];

  constructor(private readonly cell = 96) {}

  private key(cx: number, cy: number): number {
    // Mặt nạ 16 bit để tọa độ âm cũng hợp lệ
    return ((cx & 0xffff) << 16) | (cy & 0xffff);
  }

  clear(): void {
    for (const arr of this.cells.values()) {
      arr.length = 0;
      this.pool.push(arr);
    }
    this.cells.clear();
  }

  insert(o: T): void {
    const k = this.key(Math.floor(o.x / this.cell), Math.floor(o.y / this.cell));
    let a = this.cells.get(k);
    if (!a) {
      a = this.pool.pop() ?? [];
      this.cells.set(k, a);
    }
    a.push(o);
  }

  /** Gom mọi đối tượng nằm trong các ô chạm vào hình vuông (x±r, y±r). Người gọi tự kiểm tra khoảng cách chính xác. */
  query(x: number, y: number, r: number, out: T[]): T[] {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor((x - r) / c);
    const x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c);
    const y1 = Math.floor((y + r) / c);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const a = this.cells.get(this.key(cx, cy));
        if (a) for (let i = 0; i < a.length; i++) out.push(a[i]);
      }
    }
    return out;
  }
}
