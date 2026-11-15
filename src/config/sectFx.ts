/**
 * Hoạt ảnh nền tông môn (src/ui/sectFx.ts). Toạ độ theo điểm ảnh của ảnh nền; tư liệu (đảo tách rời, mặt nạ thác /
 * linh khí) sinh bằng tools/art/sect_fx.py — phần `islands / fall / qi` PHẢI khớp số script đó in ra.
 */
export interface SectRect { src: string; x: number; y: number; w: number; h: number }
export interface SectFxDef {
  /** cỡ ảnh nền + background-position (khớp .sect trong styles.css) */
  w: number; h: number; posX: number; posY: number;
  /** đảo bay tách rời: nhấp nhô lên xuống */
  islands: SectRect[];
  /** mặt nạ nước thác: vệt sáng chảy xuống */
  fall?: SectRect;
  /** mặt nạ dòng linh khí: sóng sáng trôi dọc dòng */
  qi?: SectRect;
  /** làn mây trôi: [y, x đầu, x cuối, bán kính] — cụm mây mờ trôi ngang chậm trên biển mây */
  clouds: [number, number, number, number][];
}

/** Bump khi đổi tư liệu public/ui/sect/* hoặc ảnh nền đã vá */
export const SECT_FX_V = 1;

export const SECT_FX: Record<string, SectFxDef> = {
  lobby_wide: { w: 2000, h: 1124, posX: 0.5, posY: 0.7,
    islands: [
      { src: 'bg_lobby_wide_i0', x: 1104, y: 0, w: 102, h: 112 },
      { src: 'bg_lobby_wide_i1', x: 1164, y: 136, w: 112, h: 134 },
      { src: 'bg_lobby_wide_i2', x: 1404, y: 186, w: 82, h: 94 },
      { src: 'bg_lobby_wide_i3', x: 414, y: 286, w: 122, h: 142 },
      { src: 'bg_lobby_wide_i4', x: 490, y: 450, w: 60, h: 54 },
    ],
    fall: { src: 'bg_lobby_wide_fall', x: 16, y: 348, w: 1536, h: 564 },
    qi: { src: 'bg_lobby_wide_qi', x: 153, y: 503, w: 1807, h: 621 },
    clouds: [[1075, -60, 760, 70], [1080, 1240, 2060, 70], [560, -40, 380, 45], [330, 1500, 2040, 50], [70, -60, 900, 55]],
  },
};
