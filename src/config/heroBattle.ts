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

/** Hướng mà vũ khí (nửa trước) vẽ TRƯỚC thân dù tay phải khuất — cung ở w / nw: đoạn bị che đã tách sang nửa sau */
export const BATTLE_FRONT_OVERRIDE: Record<string, Partial<Record<string, boolean>>> = {
  wp_bow: { w: true, nw: true },
};

export const battleWeaponKey = (weaponId: string, tier: number): string => `bw_${weaponId}_${tier}`;
export const fistKey = (hand: 'near' | 'far', tier: number): string => `bf_${hand}_${tier}`;
