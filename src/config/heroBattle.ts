// Vũ khí cầm tay của nhân vật TRONG TRẬN (góc nhìn top-down nghiêng) — giữ đúng cách cầm ở lobby,
// chỉ xoay theo hướng nhân vật (góc theo các đường mẫu người dùng kẻ).
// Hình: public/gear/wp_{loại}_b_{cấp}.png — dải 8 khung theo hướng (s, sw, w, nw, n, ne, e, se), điểm cầm nằm GIỮA khung;
// vẽ trong tools/art/gear.px.js (mục "VŨ KHÍ TRONG TRẬN"). Quyền sáo dùng găng wp_fist_near/far_{cấp}.png đeo hai tay.
// Vị trí bàn tay theo hướng + khung bước: HERO_HANDS (heroHands.ts, tự sinh bởi tools/art/walk_battle.py).

/** Cỡ một khung (vuông, điểm cầm ở giữa) */
export const BATTLE_WEAPON: Record<string, number> = {
  wp_sword: 64,
  wp_blade: 64,
  wp_spear: 80,
  wp_bow: 96,
  wp_fan: 32,
};

/**
 * Vũ khí dài (thương, cung) tách đôi tại chỗ cầm: wp_{loại}_bf_{cấp} = nửa phía mũi / đầu ngoài (vẽ TRƯỚC thân),
 * wp_{loại}_bk_{cấp} = nửa phía đốc / cánh còn lại (luôn SAU thân) — giống ở lobby: cán chạy ra sau lưng.
 */
export const BATTLE_SPLIT = new Set(['wp_spear', 'wp_bow']);

/** Hướng mà vũ khí vẽ trước / sau thân khác với mặc định theo bàn tay (HERO_HANDS.front) — hiện chưa có ngoại lệ */
export const BATTLE_FRONT_OVERRIDE: Record<string, Partial<Record<string, boolean>>> = {};

/**
 * Điểm đặt vũ khí khác bàn tay (điểm ảnh trên khung đứng 52x68), cho hướng mà tay phải KHUẤT sau lưng: vũ khí nằm sau thân,
 * đặt sao cho phần lộ ra đúng mẫu (cung w / nw: cánh trên ló ra phía trên-trái). Vẫn nhún / vung theo tay qua từng khung.
 */
export const BATTLE_ANCHOR_OVERRIDE: Record<string, Partial<Record<string, [number, number]>>> = {
  wp_bow: { w: [23, 28], nw: [15, 31] },
};
/** Vũ khí KHÔNG vẽ nắm tay đè lên (quyền sáo đã là găng) */
export const NO_HAND_COVER = new Set(['wp_fist']);

export const battleWeaponKey = (weaponId: string, tier: number): string => `bw_${weaponId}_${tier}`;
export const fistKey = (hand: 'near' | 'far', tier: number): string => `bf_${hand}_${tier}`;
