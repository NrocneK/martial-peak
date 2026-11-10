import Phaser from 'phaser';
import { BASE_PLAYER_STATS, PLAYER_RADIUS, type PlayerStats } from '../config/game';
import { RUN } from '../config/balance';
import { PLAYER_DIRS, PLAYER_FRAME, PLAYER_SHEET_COLS, PLAYER_WALK_FRAMES, TEX, playerWalkAnim, type PlayerDir } from '../config/assets';
import { BATTLE_ANCHOR_OVERRIDE, BATTLE_FRONT_OVERRIDE, BATTLE_SPLIT, BATTLE_WEAPON, NO_HAND_COVER, WEAPON_ATTACK, WEAPON_REST_ANG, battleWeaponKey, fistKey, type AttackType } from '../config/heroBattle';
import { HERO_HANDS, HERO_HANDS_FAN } from '../config/heroHands';
import { HERO_SLASH } from '../config/heroSlash';
/** hero_b_draw.png: 12 cột (cấp 0..5 × [kéo, buông]), khung nhân vật 52x68 nằm ở (ox, oy) trong khung 84x72 */
const DRAW_SHEET = { cols: 12, ox: 16, oy: 4 };

/**
 * Nhân vật chính (Cố Trường Ca).
 * Di chuyển và va chạm được tính thủ công (không dùng Arcade Physics) để logic chạy ổn định
 * theo từng bước thời gian, dễ kiểm thử, và nhẹ khi có hàng trăm quái.
 */
export class Player extends Phaser.GameObjects.Sprite {
  stats: PlayerStats = { ...BASE_PLAYER_STATS };
  hp = this.stats.maxHp;
  /** Thời gian bất tử còn lại sau khi bị đánh (giây) */
  invuln = 0;
  dead = false;
  /** Chế độ bất tử khi gỡ lỗi */
  god = false;
  readonly r = PLAYER_RADIUS;
  /** Hướng đang nhìn / di chuyển (radian), dùng để chĩa vũ khí khi không có mục tiêu */
  heading = 0;
  /** Số lần bị đánh trong màn (thống kê) */
  hurtCount = 0;
  /** Lá chắn hấp thụ sát thương (bí bảo Hư Tịch Chi Tâm) và thời gian còn lại */
  shield = 0;
  shieldT = 0;
  /** Gọi mỗi khi thật sự nhận sát thương (cho bí bảo) */
  onHit: (() => void) | null = null;

  /** Hướng sprite đang quay (8 hướng) */
  private face: PlayerDir = 's';
  /** Tư thế cầm quạt (tay phải trước ngực) — đổi bộ hình nhân vật + bảng vị trí tay */
  private fanPose = false;

  /** Vũ khí cầm tay phải (chỉ là ngoại hình, không ảnh hưởng chỉ số) + găng quyền sáo hai tay */
  private weaponImg: Phaser.GameObjects.Image | null = null;
  /** nửa sau (phía đốc) của vũ khí dài — luôn vẽ sau thân */
  private weaponBack: Phaser.GameObjects.Image | null = null;
  private weaponId = '';
  /** Nắm tay phải cắt từ chính khung nhân vật, vẽ ĐÈ lên chuôi vũ khí → nhìn ra tay đang nắm */
  private handCover: Phaser.GameObjects.Image | null = null;
  private fists: Phaser.GameObjects.Image[] = [];
  /** Hoạt ảnh ra đòn đang chạy: thời gian đã qua / thời lượng / góc đòn (radian) / kiểu */
  private atk: { t: number; dur: number; ang: number; type: AttackType | '' } = { t: 0, dur: 0, ang: 0, type: '' };
  private static readonly ORIGIN = { x: 0.5, y: 0.62 };
  /** Cung lúc kéo dây (quay đúng hướng bắn) + dây cung / mũi tên vẽ lúc chạy */
  /** Kéo cung theo mẫu: khung 84x72 (cung + tên vươn ra ngoài khung nhân vật) vẽ đè, ẩn thân + vũ khí thường */
  private drawImg: Phaser.GameObjects.Image | null = null;
  private bowTier = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.PLAYER, PLAYER_WALK_FRAMES);
    scene.add.existing(this);
    // Sprite 52x68 vẽ 1:1 (chân ở hàng 64); gốc hơi thấp để thân (vùng va chạm) nằm giữa, chân chạm "đất"
    this.setDepth(10).setOrigin(0.5, 0.62);
  }

  /** Đặt ngoại hình vũ khí theo loại + cấp (quyền sáo: găng hai tay) */
  setWeaponLook(weaponId: string, tier: number): void {
    this.weaponId = weaponId;
    this.fanPose = weaponId === 'wp_fan';
    if (this.fanPose) this.setTexture(TEX.PLAYER_FAN, PLAYER_WALK_FRAMES);
    if (weaponId === 'wp_fist') {
      this.fists = (['near', 'far'] as const).map((hand) => this.scene.add.image(this.x, this.y, fistKey(hand, tier)));
      return;
    }
    if (!BATTLE_WEAPON[weaponId]) return;
    const key = battleWeaponKey(weaponId, tier);
    if (BATTLE_SPLIT.has(weaponId)) {
      if (!this.scene.textures.exists(key + '_f')) return;
      this.weaponImg = this.scene.add.image(this.x, this.y, key + '_f', 0);
      this.weaponBack = this.scene.add.image(this.x, this.y, key + '_k', 0);
    } else if (this.scene.textures.exists(key)) this.weaponImg = this.scene.add.image(this.x, this.y, key, 0);
    if (weaponId === 'wp_bow') {
      this.drawImg = this.scene.add.image(this.x, this.y, TEX.PLAYER_DRAW, 0).setOrigin(0, 0).setVisible(false);
      this.bowTier = tier;
    }
    if (this.weaponImg) this.handCover = this.scene.add.image(this.x, this.y, this.fanPose ? TEX.PLAYER_FAN : TEX.PLAYER, PLAYER_WALK_FRAMES);
  }

  /** Bắt đầu hoạt ảnh ra đòn của vũ khí đang cầm, hướng về góc `ang` (radian; null = hướng đang nhìn) */
  playAttack(ang: number | null): void {
    const a = WEAPON_ATTACK[this.weaponId];
    if (!a || this.dead) return;
    this.atk = { t: 0, dur: a.dur, ang: ang ?? this.heading, type: a.type };
  }

  private get attacking(): boolean {
    return this.atk.type !== '' && this.atk.t < this.atk.dur;
  }

  /** Ra đòn dùng sheet tư thế riêng (cánh tay vẽ lại): vung kiếm / đao, kéo cung — không áp cho tư thế cầm quạt */
  private get sheetAttack(): 'swing' | 'draw' | null {
    if (!this.attacking || this.fanPose) return null;
    return this.atk.type === 'swing' ? 'swing' : this.atk.type === 'draw' ? 'draw' : null;
  }

  /** Góc màn hình → 1 trong 8 hướng */
  private static faceOf(ang: number): PlayerDir {
    const sector = (Math.round(ang / (Math.PI / 4)) + 8) % 8;
    return (['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'] as const)[sector];
  }

  /** Đặt vũ khí / găng vào đúng bàn tay theo hướng và khung bước hiện tại (gọi mỗi khung hình) */
  syncWeapon(): void {
    const hands = (this.fanPose ? HERO_HANDS_FAN : HERO_HANDS)[this.face];
    const col = this.anims.isPlaying ? Math.max(0, (this.anims.currentFrame?.index ?? 1) - 1) : PLAYER_WALK_FRAMES;
    // ---- hoạt ảnh ra đòn: k = 0..1; thân nhào theo hướng đòn (dời gốc vẽ, không đổi vị trí va chạm)
    const atk = this.attacking, k = atk ? this.atk.t / this.atk.dur : 0, type = atk ? this.atk.type : '';
    const ca = Math.cos(this.atk.ang), sa = Math.sin(this.atk.ang);
    const lungeAmt = { swing: 3, thrust: 3, punch: 4, draw: -1.5, throw: 2, '': 0 }[type] * Math.sin(Math.PI * k);
    this.setOrigin(Player.ORIGIN.x - (ca * lungeAmt) / PLAYER_FRAME.w, Player.ORIGIN.y - (sa * lungeAmt) / PLAYER_FRAME.h);
    // trọng số "đưa vũ khí về hướng đòn": vào nhanh, giữ, thả về cuối
    const w = !atk ? 0 : k < 0.22 ? k / 0.22 : k < 0.68 ? 1 : (1 - k) / 0.32;
    const restDeg = WEAPON_REST_ANG[this.weaponId]?.[this.face] ?? 0;
    const aimDeg = (this.atk.ang * 180) / Math.PI;
    const off = Phaser.Math.Angle.WrapDegrees(aimDeg - restDeg);
    let rotDeg = 0, push = 0;
    if (type === 'swing') {
      // lấy đà ra sau (−65°) → chém qua hướng đòn (+65°) → thu về
      const sw = k < 0.25 ? -65 * (k / 0.25) : k < 0.62 ? -65 + 130 * ((k - 0.25) / 0.37) : 65 * (1 - (k - 0.62) / 0.38);
      rotDeg = w * off + sw;
    } else if (type === 'thrust') {
      rotDeg = w * off;
      push = k < 0.4 ? 16 * (k / 0.4) : 16 * (1 - (k - 0.4) / 0.6);           // đâm tới rồi rút về
    } else if (type === 'draw') {
      rotDeg = w * Phaser.Math.Angle.WrapDegrees(aimDeg + 90 - restDeg);       // dây cung vuông góc hướng bắn
      push = k > 0.45 && k < 0.7 ? -3 : 0;                                   // giật nhẹ khi buông tên
    } else if (type === 'throw') {
      rotDeg = -50 * Math.sin(Math.PI * Math.min(1, k / 0.35));             // hất tay
    }
    const pdx = ca * push, pdy = sa * push;
    // ---- ra đòn theo mẫu vẽ tay: chém (đổi khung sang hero_b_slash), kéo cung (khung hero_b_draw vẽ đè)
    const sheet = this.sheetAttack;
    const row = PLAYER_DIRS.indexOf(this.face);
    let swingHand: number[] | null = null, drawFrame = -1;
    if (sheet === 'swing') {
      // chém theo mẫu: lấy đà (kiếm giơ cao) → chém ra → giữ thế chém rồi về dáng đứng
      const c = k < 0.34 ? 0 : 1;
      this.setTexture(TEX.PLAYER_SLASH, row * 2 + c);
      swingHand = HERO_SLASH[this.face][c];
    } else if (sheet === 'draw') {
      drawFrame = row * DRAW_SHEET.cols + this.bowTier * 2 + (k < 0.55 ? 0 : 1);   // kéo căng → buông dây
    } else if (this.texture.key === TEX.PLAYER_SLASH) {
      this.setTexture(TEX.PLAYER, row * PLAYER_SHEET_COLS + PLAYER_WALK_FRAMES);
    }
    const left = this.x - this.originX * PLAYER_FRAME.w;
    const top = this.y - this.originY * PLAYER_FRAME.h;
    const alpha = this.dead ? 0 : this.alpha;
    const drawing = drawFrame >= 0 && !!this.drawImg;
    this.setVisible(!drawing);
    if (this.drawImg) {
      this.drawImg.setVisible(drawing);
      if (drawing) this.drawImg.setFrame(drawFrame).setPosition(Math.round(left) - DRAW_SHEET.ox, Math.round(top) - DRAW_SHEET.oy).setDepth(this.depth).setAlpha(alpha);
    }
    if (this.weaponImg) {
      // khung = hướng (cùng thứ tự PLAYER_DIRS); điểm cầm ở giữa khung → gốc 0.5, 0.5 đặt vào bàn tay
      const [hx, hy] = hands.R[col];
      const fi = PLAYER_DIRS.indexOf(this.face);
      // điểm đặt: bàn tay, hoặc điểm riêng (tay khuất) + độ lệch nhún / vung của tay ở khung này
      const anc = BATTLE_ANCHOR_OVERRIDE[this.weaponId]?.[this.face];
      const rest = hands.R[PLAYER_WALK_FRAMES];
      const ax = anc ? anc[0] + hx - rest[0] : hx, ay = anc ? anc[1] + hy - rest[1] : hy;
      const front = BATTLE_FRONT_OVERRIDE[this.weaponId]?.[this.face] ?? hands.front;
      let rot = (rotDeg * Math.PI) / 180;
      let wx = left + ax + 0.5 + pdx, wy = top + ay + 0.5 + pdy, wFront = front || (atk && type !== 'throw');
      if (swingHand) {
        // kiếm / đao đặt đúng điểm cầm + góc lưỡi đo từ mẫu (f = 0: kiếm khuất sau thân)
        const [sx, sy, bladeDeg, f] = swingHand;
        wx = left + sx + pdx; wy = top + sy + pdy;
        rot = (Phaser.Math.Angle.WrapDegrees(bladeDeg - restDeg) * Math.PI) / 180;
        wFront = f === 1;
      }
      const thrown = type === 'throw' && k > 0.3;                             // quạt đã rời tay (đang bay)
      this.weaponImg.setFrame(fi).setOrigin(0.5, 0.5).setRotation(rot).setVisible(!thrown && !drawing)
        .setPosition(wx, wy).setDepth(this.depth + (wFront ? 1 : -1)).setAlpha(alpha);
      this.weaponBack?.setFrame(fi).setOrigin(0.5, 0.5).setRotation(rot).setVisible(!drawing).setPosition(wx, wy).setDepth(this.depth - 1).setAlpha(alpha);
      // nắm tay đè lên chuôi (chỉ khi vũ khí ở trước thân và đặt đúng bàn tay)
      if (this.handCover) {
        const show = !drawing && (swingHand ? swingHand[3] === 1 : front && !anc) && !NO_HAND_COVER.has(this.weaponId);
        this.handCover.setVisible(show);
        if (show) {
          const [cx, cy] = swingHand ? [Math.round(swingHand[0] - 0.5), Math.round(swingHand[1] - 0.5)] : [hx, hy];
          this.handCover.setTexture(this.texture.key, this.frame.name).setOrigin(this.originX, this.originY).setPosition(this.x + pdx, this.y + pdy)
            .setCrop(cx - 3, cy - 3, 7, 7).setDepth(this.depth + 2).setAlpha(alpha);
        }
      }
    }
    if (this.fists.length) {
      // tay phải luôn đeo (khuất sau thân khi ở phía xa); tay trái ẩn khi khuất hẳn
      const [nr, fr] = this.fists;
      const [rx, ry] = hands.R[col];
      const punch = type === 'punch' ? Math.sin(Math.PI * k) * 10 : 0;          // tay phải đấm tới theo hướng đòn
      nr.setPosition(left + rx + 0.5 + ca * punch, top + ry + 0.5 + sa * punch).setDepth(this.depth + (hands.front || punch > 0 ? 1 : -1)).setAlpha(alpha);
      if (hands.L) {
        const [lx, ly] = hands.L[col];
        fr.setVisible(true).setPosition(left + lx + 0.5, top + ly + 0.5).setDepth(this.depth + 1).setAlpha(alpha);
      } else fr.setVisible(false);
    }
  }

  destroy(fromScene?: boolean): void {
    this.weaponImg?.destroy();
    this.weaponImg = null;
    this.weaponBack?.destroy();
    this.weaponBack = null;
    this.handCover?.destroy();
    this.handCover = null;
    this.drawImg?.destroy();
    this.drawImg = null;
    for (const f of this.fists) f.destroy();
    this.fists = [];
    super.destroy(fromScene);
  }

  /** Gán bộ chỉ số mới. Giữ nguyên tỉ lệ máu hiện tại (không hồi đầy / không mất máu khi nhặt thẻ). */
  applyStats(s: PlayerStats): void {
    const ratio = this.stats.maxHp > 0 ? this.hp / this.stats.maxHp : 1;
    this.stats = { ...s };
    this.hp = Math.min(s.maxHp, Math.max(1, ratio * s.maxHp));
  }

  /** Di chuyển theo hướng `dir` (độ dài 0..1) trong `dt` giây. */
  move(dir: Phaser.Math.Vector2, dt: number): void {
    const sp = this.stats.moveSpeed;
    this.x += dir.x * sp * dt;
    this.y += dir.y * sp * dt;
    // Đi: quay về 1 trong 8 hướng theo đường đi và chạy hoạt ảnh bước của hướng đó; đứng yên: khung đứng của hướng cuối
    const moving = dir.lengthSq() > 0.0001;
    if (moving) this.heading = Phaser.Math.Angle.RotateTo(this.heading, dir.angle(), 0.3);
    // đang ra đòn: quay mặt về hướng đòn; còn lại quay theo đường đi (góc màn hình: 0 = phải, y hướng xuống)
    const face = this.attacking ? Player.faceOf(this.atk.ang) : moving ? Player.faceOf(dir.angle()) : this.face;
    if (this.sheetAttack) {
      this.face = face;                                                      // khung do syncWeapon đặt (sheet ra đòn)
      if (this.anims.isPlaying) this.stop();
    } else if (moving) {
      if (face !== this.face || !this.anims.isPlaying || this.texture.key === TEX.PLAYER_SLASH) {
        this.face = face;
        this.play(playerWalkAnim(face, this.fanPose), true);
      }
    } else if (this.anims.isPlaying || face !== this.face) {
      this.face = face;
      this.stop();
      this.setFrame(PLAYER_DIRS.indexOf(this.face) * PLAYER_SHEET_COLS + PLAYER_WALK_FRAMES);
    }
  }

  tick(dt: number): void {
    if (this.dead) return;
    if (this.atk.type) this.atk.t += dt;
    if (this.shieldT > 0 && (this.shieldT -= dt) <= 0) this.shield = 0;
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.setAlpha(Math.floor(this.invuln * 20) % 2 === 0 ? 0.45 : 1);
      if (this.invuln <= 0) this.setAlpha(1);
    }
    if (this.stats.regen > 0 && this.hp < this.stats.maxHp) this.heal(this.stats.maxHp * this.stats.regen * dt);
  }

  /** Nhận sát thương. Trả về lượng máu thực sự bị trừ (0 nếu đang bất tử). */
  takeDamage(raw: number): number {
    if (this.dead || this.invuln > 0 || this.god) return 0;
    const a = this.stats.armor;
    let dmg = Math.max(1, raw * (1 - a / (a + 100)));
    if (this.shield > 0) {
      const absorb = Math.min(this.shield, dmg);
      this.shield -= absorb;
      dmg -= absorb;
    }
    this.hp -= dmg;
    this.invuln = RUN.hitInvuln;
    this.hurtCount++;
    this.setTint(0xff6060);
    this.scene.time.delayedCall(90, () => this.clearTint());
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
    this.onHit?.();
    return dmg;
  }

  heal(n: number): void {
    this.hp = Math.min(this.stats.maxHp, this.hp + n);
  }
}
