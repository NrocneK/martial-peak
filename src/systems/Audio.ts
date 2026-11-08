// =====================================================================
// ÂM THANH: tạo hiệu ứng bằng WebAudio (không cần file âm thanh), dùng tạm cho đến khi có asset thật.
// Muốn thay bằng file âm thanh thật: nạp file trong BootScene rồi gọi trong hàm play() tương ứng.
// Trình duyệt chỉ cho phát âm sau lần chạm / bấm đầu tiên, nên AudioContext tạo lười (lazy).
// =====================================================================

export type Sfx = 'hit' | 'kill' | 'pickup' | 'levelup' | 'hurt' | 'cast' | 'boss' | 'win' | 'lose' | 'click' | 'explode';

class AudioManager {
  private ctx: AudioContext | null = null;
  enabled = true;
  private last: Partial<Record<Sfx, number>> = {};

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Giới hạn tần suất để không bị "rè" khi có hàng chục sự kiện mỗi giây */
  private gate(name: Sfx, minGapMs: number): boolean {
    const now = performance.now();
    if (now - (this.last[name] ?? 0) < minGapMs) return false;
    this.last[name] = now;
    return true;
  }

  play(name: Sfx): void {
    if (!this.enabled) return;
    switch (name) {
      case 'hit':
        if (this.gate(name, 70)) this.tone(240, 0.05, 'square', 0.03, 120);
        break;
      case 'kill':
        if (this.gate(name, 60)) this.tone(160, 0.08, 'triangle', 0.05, 60);
        break;
      case 'pickup':
        if (this.gate(name, 50)) this.tone(900, 0.06, 'sine', 0.04, 1300);
        break;
      case 'cast':
        if (this.gate(name, 90)) this.tone(420, 0.07, 'sawtooth', 0.02, 700);
        break;
      case 'explode':
        if (this.gate(name, 80)) this.tone(110, 0.2, 'sawtooth', 0.06, 40);
        break;
      case 'hurt':
        if (this.gate(name, 150)) this.tone(150, 0.18, 'sawtooth', 0.09, 70);
        break;
      case 'levelup':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.07, undefined, i * 0.08));
        break;
      case 'boss':
        this.tone(90, 0.7, 'sawtooth', 0.12, 50);
        this.tone(135, 0.7, 'square', 0.06, 70);
        break;
      case 'win':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.08, undefined, i * 0.12));
        break;
      case 'lose':
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.07, undefined, i * 0.18));
        break;
      case 'click':
        this.tone(600, 0.04, 'square', 0.04, 400);
        break;
    }
  }
}

export const audio = new AudioManager();
