type MotorVoice = {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  stopping: boolean;
};

const MASTER_GAIN = 0.32;

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private motors = new Map<number, MotorVoice>();
  private lastCannonAt = 0;
  private lastBoomAt = 0;
  private lastScanAt = 0;
  private lastServoAt = 0;
  private lastCrashAt = 0;

  unlock(): void {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : MASTER_GAIN, this.ctx.currentTime, 0.04);
    }
    if (m) this.stopAllMotors();
  }

  isMuted(): boolean {
    return this.muted;
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      return null;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_GAIN;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  cannon(): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    if (now - this.lastCannonAt < 0.04) return;
    this.lastCannonAt = now;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.85, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.25);

    this.noiseBurst(0.06, 'highpass', 600, 0.55, now);
    this.servoSweep(now, 280, 540, 0.04, 0.06);
  }

  boom(): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    if (now - this.lastBoomAt < 0.05) return;
    this.lastBoomAt = now;

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(200, now);
    sub.frequency.exponentialRampToValueAtTime(32, now + 0.45);
    const subG = ctx.createGain();
    subG.gain.setValueAtTime(0, now);
    subG.gain.linearRampToValueAtTime(1.0, now + 0.012);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    sub.connect(subG);
    subG.connect(this.master);
    sub.start(now);
    sub.stop(now + 0.65);

    this.noiseBurst(0.42, 'lowpass', 700, 0.7, now);
    this.noiseBurst(0.18, 'bandpass', 2400, 0.4, now);
  }

  scan(): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    if (now - this.lastScanAt < 0.05) return;
    this.lastScanAt = now;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.14, now + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  crash(): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    if (now - this.lastCrashAt < 0.08) return;
    this.lastCrashAt = now;

    const zap = ctx.createOscillator();
    zap.type = 'sawtooth';
    zap.frequency.setValueAtTime(820, now);
    zap.frequency.exponentialRampToValueAtTime(55, now + 0.42);
    const zapFilter = ctx.createBiquadFilter();
    zapFilter.type = 'lowpass';
    zapFilter.frequency.setValueAtTime(3200, now);
    zapFilter.frequency.exponentialRampToValueAtTime(400, now + 0.42);
    const zapG = ctx.createGain();
    zapG.gain.setValueAtTime(0, now);
    zapG.gain.linearRampToValueAtTime(0.5, now + 0.008);
    zapG.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    zap.connect(zapFilter);
    zapFilter.connect(zapG);
    zapG.connect(this.master);
    zap.start(now);
    zap.stop(now + 0.5);

    const clangFreqs = [310, 487, 743];
    for (const f of clangFreqs) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.65, now + 0.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.18, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.connect(g);
      g.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.35);
    }

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(110, now);
    thump.frequency.exponentialRampToValueAtTime(34, now + 0.28);
    const thumpG = ctx.createGain();
    thumpG.gain.setValueAtTime(0, now);
    thumpG.gain.linearRampToValueAtTime(0.9, now + 0.01);
    thumpG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    thump.connect(thumpG);
    thumpG.connect(this.master);
    thump.start(now);
    thump.stop(now + 0.45);

    this.noiseBurst(0.4, 'highpass', 1800, 0.45, now);
    this.noiseBurst(0.5, 'bandpass', 800, 0.35, now + 0.05);
  }

  servo(): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    if (now - this.lastServoAt < 0.035) return;
    this.lastServoAt = now;
    this.servoSweep(now, 360 + Math.random() * 80, 500 + Math.random() * 100, 0.07, 0.05);
  }

  motor(id: number, speedPct: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;

    let voice = this.motors.get(id);
    if (this.muted || speedPct < 1) {
      if (voice) this.stopMotor(id);
      return;
    }

    if (!voice) {
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 55;
      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.value = 58;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 250;
      filter.Q.value = 2.5;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      osc1.start();
      osc2.start();
      voice = { osc1, osc2, filter, gain, stopping: false };
      this.motors.set(id, voice);
    }

    const now = ctx.currentTime;
    const norm = Math.min(1, speedPct / 100);
    const target = 0.018 + norm * 0.07;
    voice.gain.gain.setTargetAtTime(target, now, 0.08);
    const baseFreq = 48 + norm * 32;
    voice.osc1.frequency.setTargetAtTime(baseFreq, now, 0.1);
    voice.osc2.frequency.setTargetAtTime(baseFreq + 3, now, 0.1);
    voice.filter.frequency.setTargetAtTime(220 + norm * 480, now, 0.1);
  }

  private stopMotor(id: number): void {
    const voice = this.motors.get(id);
    if (!voice || !this.ctx) return;
    if (voice.stopping) return;
    voice.stopping = true;
    const now = this.ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    try {
      voice.osc1.stop(now + 0.22);
      voice.osc2.stop(now + 0.22);
    } catch {}
    setTimeout(() => {
      try {
        voice.filter.disconnect();
        voice.gain.disconnect();
      } catch {}
      this.motors.delete(id);
    }, 260);
  }

  stopAllMotors(): void {
    for (const id of [...this.motors.keys()]) {
      this.stopMotor(id);
    }
  }

  private noiseBurst(
    duration: number,
    filterType: BiquadFilterType,
    freq: number,
    gainVal: number,
    when: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const bufSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainVal, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(when);
    src.stop(when + duration + 0.05);
  }

  private servoSweep(
    when: number,
    fromHz: number,
    toHz: number,
    duration: number,
    gainVal: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(fromHz, when);
    osc.frequency.linearRampToValueAtTime(toHz, when + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 3.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gainVal, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, when + duration + 0.02);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    osc.start(when);
    osc.stop(when + duration + 0.05);
  }
}

export const sfx = new Sfx();
