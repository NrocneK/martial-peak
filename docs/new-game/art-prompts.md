# Prompt tạo nhân vật + bộ chuyển động

## Cách làm
1. Tạo **ảnh nhân vật gốc** (prompt 0) trước, chọn 1 ảnh ưng nhất → lưu vào `art/style/`.
2. Mỗi bộ chuyển động: **đính kèm ảnh gốc**, dán **Phần chung + Dòng chung + khối của bộ đó**. Mỗi lần 1 bộ.
3. AI không vẽ các khung đều 100% — Claude sẽ cắt, căn chân cùng đường nền, đồng bộ cỡ và ghép sheet bằng script.

## Phần chung (dán đầu mọi prompt)
```
2D side-scrolling action game sprite, crisp pixel art (clearly visible pixels), xianxia ancient Chinese
fantasy. Character: young adult male cultivator, slim athletic build, light skin, long black hair tied
in a high ponytail, calm determined face. He wears ONLY plain dark grey-blue short shorts (mid-thigh),
barefoot, no shirt, no accessories, no weapons — this is the BASE BODY for a paper-doll layer system,
clothes will be added later as separate layers. Non-sexual, game base model.
Pure side view facing RIGHT. Clean dark outline, simple cel shading, consistent proportions
(about 6 heads tall). Plain flat solid white background, no shadow on the ground, no text,
no grid lines, no watermark.
```

## 0. Nhân vật gốc (làm trước)
```
Character reference sheet: 3 poses in one row, evenly spaced, same size, feet on the same baseline:
(1) front view standing relaxed, (2) side view facing right standing relaxed, (3) back view standing.
```

## Dòng chung cho mọi bộ chuyển động
```
Use the attached character exactly (same face, hair, body, shorts, colors, size). One single horizontal
row of frames, evenly spaced, identical character size in every frame, feet on the same baseline
(except airborne frames).
```

## 1. Idle — 6 khung
```
IDLE animation, 6 frames: standing relaxed, subtle breathing — chest rises and falls slightly,
ponytail sways gently. Loopable (frame 6 flows back to frame 1).
```
## 2. Walk — 8 khung
```
WALK cycle, 8 frames: calm walking pace, arms swing naturally opposite to legs, contact - down -
passing - up poses for each leg. Loopable.
```
## 3. Run — 8 khung
```
RUN cycle, 8 frames: fast martial-arts run, body leaning forward, arms pumping, one frame with both
feet off the ground, ponytail trailing behind. Loopable.
```
## 4. Jump — 6 khung
```
JUMP sequence, 6 frames: (1) crouch anticipation, (2) push off, (3) rising — knees tucked slightly,
(4) peak — body floating, (5) falling — legs extend down, (6) landing crouch.
```
## 5. Air jump (nhảy lần 2) — 6 khung
```
AIR JUMP (double jump) sequence, 6 frames, all airborne: a graceful forward somersault flip in mid-air —
tuck, rotate 90°, rotate 180°, rotate 270°, untuck, open to a floating pose. Ponytail follows the spin.
```
## 6. Attack — điều khiển phi kiếm — 8 khung (KHÔNG vẽ kiếm)
```
SWORD-CONTROL CASTING poses, 8 frames, NO sword drawn (the flying sword is added separately):
(1) ready stance, (2) right hand forms a two-finger sword seal in front of the chest, (3) seal raised
to forehead level, focusing, (4) arm thrusts forward pointing two fingers at the enemy (command strike),
(5) hold the pointing pose, slight lean, (6) sweeping the pointing hand in a wide horizontal arc,
(7) pulling the hand back toward the chest, (8) return to ready stance.
```
## 7. Dash — 4 khung
```
DASH sequence, 4 frames: (1) quick lean forward, (2) body almost horizontal low dash, arms back,
(3) same dash pose stretched (motion), (4) recover to upright stance. No speed lines.
```
## 8. Hit — 3 khung
```
HIT REACTION, 3 frames: (1) recoil — head and torso jerk backward (to the left), eyes squeezed,
(2) stagger back one step, (3) recovering to stance.
```
## 9. Die — 6 khung
```
DEATH sequence, 6 frames: (1) heavy hit recoil, (2) staggering backward, (3) knees buckling,
(4) falling to the knees, (5) collapsing forward, (6) lying face-down on the ground, still.
```
