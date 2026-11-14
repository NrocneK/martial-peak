// =====================================================================
// NẠP ẢNH HIỆU ỨNG KỸ NĂNG (dùng chung cho game + trang xem thử vfx-lab).
// Mỗi kỹ năng chỉ nạp ảnh của chính nó → vào màn chỉ tải hiệu ứng của vũ khí đang cầm + 3 kỹ năng cảnh giới mang theo.
// Ảnh đã có trong bộ nhớ (màn trước đã tải) thì bỏ qua.
// =====================================================================
import type Phaser from 'phaser';
import {
  QI_SWORD, BA_DAO_DIRS, BA_DAO_QI, SPEAR_TEX, FIST_TEX, ARROW_HEAD, TIGER_HEAD, SHOCK_T3, SHOCK_T6, FIRE_TEX, BURN_TEX, FIRE_SWIRL, DRAGON_TEX,
  QI_ARM, QI_AURA, FIRE_SLASH, BLACK_HOLE, BH_BLAST, PHAP_TUONG, QI_BLADE, SWORD_ARRAY, THUNDER, LOTUS, NGAN_HA, HOANG_CHUNG, LINH_VUC, DAI_DAO,
  SPIRIT_ORB, ORB_BOLT, baDaoWaveKey,
} from './skillFx';

type L = Phaser.Loader.LoaderPlugin;

function loaders(scene: Phaser.Scene) {
  const ld: L = scene.load;
  const has = (k: string) => scene.textures.exists(k);
  const img = (k: string, url: string) => { if (!has(k)) ld.image(k, url); };
  const sheet = (k: string, url: string, w: number, h: number) => { if (!has(k)) ld.spritesheet(k, url, { frameWidth: w, frameHeight: h }); };
  const fire = () => {
    img(FIRE_TEX.talisman, '/vfx/fire_talisman.png?v=1');
    img(FIRE_TEX.ring, '/vfx/fire_ring.png?v=1');
    img(FIRE_TEX.ring + '_blue', '/vfx/fire_ring_blue.png?v=1');
    sheet(FIRE_TEX.blast, '/vfx/fire_blast.png?v=1', 192, 192);
    sheet(FIRE_TEX.blast + '_purple', '/vfx/fire_blast_purple.png?v=1', 192, 192);
    sheet(FIRE_TEX.blast + '_blue', '/vfx/fire_blast_blue.png?v=1', 192, 192);
  };
  const shock = () => { sheet(SHOCK_T3, '/vfx/shock_t3.png?v=1', 256, 159); sheet(SHOCK_T6, '/vfx/shock_t6.png?v=1', 256, 159); };
  const by: Record<string, () => void> = {
    ngu_kiem: () => img(QI_SWORD, '/vfx/qi_sword_light.png'),
    ba_dao: () => {
      img(BA_DAO_QI.core, '/vfx/ba_dao_qi_core.png?v=2');
      img(BA_DAO_QI.rim, '/vfx/ba_dao_qi_rim.png?v=2');
      img(BA_DAO_QI.trail, '/vfx/ba_dao_trail.png?v=1');
      for (const d of BA_DAO_DIRS) img(baDaoWaveKey(d), `/vfx/ba_dao_wave_${d}.png?v=2`);
    },
    pha_thuong: () => { for (const [n, k] of Object.entries(SPEAR_TEX)) img(k, `/vfx/spear_${n}.png?v=1`); },
    bang_quyen: () => { for (const [n, k] of Object.entries(FIST_TEX)) img(k, `/vfx/fist_${n}.png?v=3`); },
    truy_tien: () => img(ARROW_HEAD, '/vfx/arrow_head.png?v=1'),
    thanh_phien: () => {},
    ho_khieu: () => { shock(); img(TIGER_HEAD, '/vfx/tiger_head.png?v=6'); },
    linh_dan: () => { img(ORB_BOLT, '/vfx/orb_bolt.png?v=1'); sheet(SPIRIT_ORB, '/vfx/spirit_orb.png?v=1', 96, 96); },
    hoa_phu: () => {
      fire();
      for (const [n, k] of Object.entries(BURN_TEX)) {
        sheet(k, `/vfx/burn_${n}.png?v=2`, 256, 201);
        sheet(k + '_blue', `/vfx/burn_${n}_blue.png?v=1`, 256, 201);
      }
      sheet(FIRE_SWIRL, '/vfx/fire_swirl_blue.png?v=1', 256, 200);
    },
    khi_long: () => {
      fire(); shock();
      for (const [n, k] of Object.entries(DRAGON_TEX)) for (const sf of ['', '_aw']) img(k + sf, `/vfx/dragon_${n}${sf}.png?v=5`);
    },
    than_thuc: () => { img(QI_ARM, '/vfx/qi_arm.png?v=9'); img(QI_AURA, '/vfx/qi_aura.png?v=8'); img(FIRE_SLASH.key, '/vfx/fire_slash.png?v=5'); },
    hu_khong: () => {
      sheet(BLACK_HOLE.key, '/vfx/black_hole.png?v=1', BLACK_HOLE.fw, BLACK_HOLE.fh);
      for (const k of ['glow', 'dark'] as const) sheet(BH_BLAST[k], `/vfx/bh_blast_${k}.png?v=1`, BH_BLAST.fw, BH_BLAST.fh);
    },
    phap_tuong: () => { sheet(PHAP_TUONG.avatar, '/vfx/phap_tuong_avatar.png?v=2', PHAP_TUONG.avW, PHAP_TUONG.avH); img(PHAP_TUONG.palm, '/vfx/phap_tuong_palm.png?v=5'); },
    van_kiem: () => {
      for (const [k, f] of Object.entries(QI_BLADE)) img(f, `/vfx/qi_blade_${k}.png?v=3`);
      img(SWORD_ARRAY.n, '/vfx/sword_array.png?v=2');
      img(SWORD_ARRAY.aw, '/vfx/sword_array_aw.png?v=2');
    },
    than_loi: () => {
      for (const sf of ['', '_aw']) {
        sheet(THUNDER.strike + sf, `/vfx/thunder_strike${sf}.png?v=1`, THUNDER.sw, THUNDER.sh);
        sheet(THUNDER.arc + sf, `/vfx/thunder_arc${sf}.png?v=1`, THUNDER.aw, THUNDER.ah);
        sheet(THUNDER.residue + sf, `/vfx/thunder_residue${sf}.png?v=1`, THUNDER.rw, THUNDER.rh);
      }
    },
    lien_hoa: () => { img(LOTUS.tex, '/vfx/lotus_top.png?v=2'); img(LOTUS.petal, '/vfx/lotus_petal.png?v=1'); },
    ngan_ha: () => {
      for (const k of ['core', 'strand', 'ring', 'hit'] as const) img(NGAN_HA[k], `/vfx/ngan_ha_${k}.png?v=5`);
      for (const [k, f] of [[NGAN_HA.ringS, 'ring_s'], [NGAN_HA.missile, 'missile'], [NGAN_HA.snow, 'snow']]) img(k, `/vfx/ngan_ha_${f}.png?v=2`);
      for (const k of NGAN_HA.ice) img(k, `/vfx/${k.slice(3)}.png?v=1`);
    },
    hoang_chung: () => {
      img(HOANG_CHUNG.bell, '/vfx/hoang_chung_energy.png?v=1');
      img(HOANG_CHUNG.array, '/vfx/hoang_chung_array.png?v=1');
      img(HOANG_CHUNG.ground, '/vfx/hoang_chung_ground.png?v=1');
    },
    linh_vuc: () => { for (const k of ['gold', 'red', 'ring'] as const) img(LINH_VUC[k], `/vfx/linh_vuc_${k}.png?v=1`); },
    dai_dao: () => sheet(DAI_DAO.layers, '/vfx/dai_dao_layers.png?v=1', DAI_DAO.cell, DAI_DAO.cell),
  };
  return by;
}

/** Nạp ảnh hiệu ứng của các kỹ năng `ids` (gọi trong preload() của scene) */
export function preloadSkillVfx(scene: Phaser.Scene, ids: readonly string[]): void {
  const by = loaders(scene);
  for (const id of ids) by[id]?.();
}

/** Mọi kỹ năng có hiệu ứng (trang xem thử nạp hết) */
export const ALL_SKILL_VFX = ['ngu_kiem', 'ba_dao', 'pha_thuong', 'bang_quyen', 'truy_tien', 'thanh_phien', 'ho_khieu', 'linh_dan', 'hoa_phu', 'khi_long',
  'than_thuc', 'hu_khong', 'phap_tuong', 'van_kiem', 'than_loi', 'lien_hoa', 'ngan_ha', 'hoang_chung', 'linh_vuc', 'dai_dao'] as const;
