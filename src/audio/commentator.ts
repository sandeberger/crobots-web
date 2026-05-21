type PhraseVars = Record<string, string | number>;

const PHRASES: Record<string, string[]> = {
  battleStart: [
    'And we are LIVE in the arena! {n} combatants enter the ring.',
    'Round one — {n} bots on the grid. Let the carnage begin.',
    'Strap in, folks. {n} robots, one survivor.',
    '{n} machines, no mercy. Battle on!',
    'Welcome back, fight fans. {n} contenders ready to brawl.',
    'The grid is live and so are {n} killing machines.',
    'Lights out, ignition on — {n} bots loose in the arena!',
    'Buckle up. {n} pieces of weaponised silicon, one trophy.',
    'It is showtime! {n} robots, no rules, no mercy.',
    'And here we go! {n} chassis, one will walk away.',
    'The countdown is over. {n} fighters — let them rip!',
    'Crowd is on its feet. {n} robots, may the best algorithm win.',
  ],
  duel: [
    'A classic duel! {a} versus {b}.',
    'Just two units left on the field — {a} and {b}.',
    'It comes down to one on one: {a} against {b}.',
    'Mano a mano! {a} squares off with {b}.',
    'A head-to-head showdown — {a} and {b}.',
    'Two bots, one arena: {a} faces {b}.',
    'Pure single combat between {a} and {b}.',
    'No backup, no reinforcements — {a} versus {b}.',
    'The dust settles into a duel: {a} against {b}.',
  ],
  firstBlood: [
    'First blood to {a}!',
    '{a} draws first blood!',
    'The opening shot connects — {a} on the scoreboard!',
    'And just like that, {a} opens the scoring!',
    '{a} gets there first — first blood on the board.',
    'First strike, first blood — that is {a}!',
    'Score one for {a} — that did not take long.',
    'The opening salvo lands. {a} is on the board.',
    'Right out of the gate, {a} connects.',
  ],
  heavyHit: [
    'Massive hit! {a} tears into {v}.',
    '{v} just took one to the chassis from {a}.',
    'Direct strike from {a}! {v} is reeling.',
    'Oh, {a} lands a heavy one on {v}.',
    'That is a thunderclap from {a} — {v} is staggered.',
    'Bullseye! {a} carves a chunk out of {v}.',
    '{a} unloads — {v} is in serious trouble.',
    'A devastating blow from {a} into the hull of {v}.',
    'Direct hit. {v} just lost a lot of plating to {a}.',
    'Oof. {a} hammers {v} with a heavy round.',
    '{v} is rocked! That came straight from {a}.',
    'You can see the sparks fly — {a} on {v}.',
  ],
  hit: [
    '{a} tags {v}.',
    'Clean shot from {a}.',
    '{v} takes a hit.',
    '{a} on target.',
  'Hit confirmed for {a}.',
    '{v} catches one from {a}.',
    'Glancing blow on {v} — courtesy of {a}.',
    'Round on target from {a}.',
    'Round connects on {v}.',
    '{a} chips away at {v}.',
    'Another shot lands — {a} working {v} down.',
    '{a} keeps the pressure on {v}.',
  ],
  critical: [
    '{v} is critical — smoke pouring out of that chassis.',
    'Warning lights all over {v}. One more will do it.',
    '{v} is barely holding together!',
    '{v} is hanging by a thread — and we can all see it.',
    'You can hear the systems failing on {v}.',
    'Black smoke from {v} — this is the home stretch.',
    '{v} is leaking everything. One nudge and it is over.',
    'Critical damage on {v} — that armour is finished.',
    'Damage report on {v}: catastrophic.',
  ],
  kill: [
    '{v} is OUT! Scratch one combatant.',
    'Destroyed. {v} is no more.',
    'Goodnight, {v}.',
    '{v} is scrap metal.',
    '{v} is finished. Lights out.',
    'And that is the end of {v}.',
    '{v} just became spare parts.',
    'Cross {v} off the board.',
    'No coming back from that — {v} is done.',
    '{v} goes silent.',
    'The chassis of {v} just gave up.',
    '{v} is gone. Just smoke and silence.',
  ],
  killBy: [
    '{a} eliminates {v}!',
    '{v} goes down to {a}!',
    '{a} finishes off {v}!',
    'Kill confirmed for {a} — {v} is gone.',
    '{a} puts {v} in the ground.',
    'And {a} closes the book on {v}.',
    '{v} dropped by {a}. Brutal.',
    'Clean kill for {a} on {v}.',
    'That is a frag for {a} — {v} is out.',
    '{a} writes {v} off the scoreboard.',
    'Goodbye {v}, courtesy of {a}.',
    '{a} delivers the finishing blow to {v}.',
  ],
  twoLeft: [
    'And then there were two — {a} versus {b}!',
    'Down to a duel: {a} and {b}.',
    'Two robots left standing. {a} versus {b}.',
    'The field is cleared — {a} and {b} for the title.',
    'It is a showdown now: {a} and {b}.',
    'Just two left in the arena — {a} and {b}.',
    'One on one for all the marbles: {a} against {b}.',
    'The semi-final is over. {a} versus {b}, winner takes all.',
    'And we are down to the final two — {a} and {b}.',
  ],
  threeLeft: [
    'Three robots remain.',
    'Field of three. Anyone could take this.',
    'Three contenders still in it.',
    'Down to three on the grid.',
    'Three left, and it is wide open.',
    'The pack has thinned — three to go.',
  ],
  winner: [
    'Winner! {a} takes the round.',
    '{a} is the last bot standing!',
    'It is over — {a} wins the arena!',
    'Champion! {a} survives.',
    'Match called! {a} is your winner.',
    'Lights up — {a} stands alone in the arena.',
    'The trophy goes to {a}!',
    '{a} walks out of the wreckage as the winner.',
    'And it is {a}! What a performance!',
    'Victory! Chalk this one up for {a}.',
    '{a} takes the round — undisputed.',
    'Final score: {a}, one. Everyone else, zero.',
  ],
  draw: [
    'Mutual annihilation. It is a draw.',
    'Everyone is dead. Call it a draw.',
    'No survivors. The arena claims them all.',
    'Total wipeout. No winners today.',
    'They all went down together — declare it a draw.',
    'Nobody walks away from this one.',
    'A stalemate written in scrap metal.',
    'The arena keeps them all. No winner.',
    'Pure mutual destruction. It is a tie.',
  ],
  quiet: [
    'Things have gone quiet out there.',
    'A cautious stand-off developing.',
    'Plenty of scanning, not much shooting.',
    'A real waiting game on the grid.',
    'Nobody wants to commit yet.',
    'Eerie silence — everyone is sizing up the field.',
    'Lots of position-finding, not much combat.',
    'A patient round, this one.',
    'The bots are dancing around each other.',
  ],
};

function pickPhrase(key: string, vars: PhraseVars = {}): string {
  const pool = PHRASES[key];
  if (!pool || pool.length === 0) return '';
  let s = pool[Math.floor(Math.random() * pool.length)];
  for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

export const PRIORITY = { LOW: 0, MID: 1, HIGH: 2, CRITICAL: 3 } as const;
export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

interface QueueItem {
  text: string;
  priority: Priority;
}

export class Commentator {
  enabled = false;
  lang = 'en-US';
  voiceName = '';
  voice: SpeechSynthesisVoice | null = null;
  rate = 1.05;
  pitch = 1.0;
  volume = 1.0;
  private queue: QueueItem[] = [];
  private speaking = false;
  private MAX_QUEUE = 2;

  private firstBloodSeen = false;
  private criticalAnnounced = new Set<number>();
  private lastAliveCount = 0;
  private lastSpeechTick = 0;
  private tick = 0;

  available(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  listVoices(): SpeechSynthesisVoice[] {
    if (!this.available()) return [];
    try {
      return speechSynthesis.getVoices() ?? [];
    } catch {
      return [];
    }
  }

  pickDefaultVoice(): SpeechSynthesisVoice | null {
    const voices = this.listVoices();
    if (voices.length === 0) return null;
    if (this.voiceName) {
      const named = voices.find((v) => v.name === this.voiceName);
      if (named) return named;
    }
    const en = voices.filter((v) => /^en[-_]/i.test(v.lang));
    if (en.length) {
      const us = en.find((v) => /US/i.test(v.lang));
      return us ?? en[0];
    }
    return voices[0];
  }

  refreshVoice(): void {
    this.voice = this.pickDefaultVoice();
    if (this.voice) this.lang = this.voice.lang || this.lang;
  }

  setEnabled(b: boolean): void {
    this.enabled = !!b;
    if (!this.enabled) this.cancel();
  }

  setVoiceByName(name: string): void {
    this.voiceName = name || '';
    this.refreshVoice();
  }

  cancel(): void {
    this.queue.length = 0;
    this.speaking = false;
    if (this.available()) {
      try {
        speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
  }

  resetBattleState(): void {
    this.firstBloodSeen = false;
    this.criticalAnnounced.clear();
    this.lastAliveCount = 0;
    this.lastSpeechTick = this.tick - 200;
  }

  private enqueue(text: string, priority: Priority = PRIORITY.LOW): void {
    if (!this.enabled || !text) return;
    if (!this.available()) return;
    if (priority === PRIORITY.LOW && this.tick - this.lastSpeechTick < 90) return;
    this.queue.push({ text, priority });
    while (this.queue.length > this.MAX_QUEUE) {
      let minIdx = 0;
      let minP: number = Infinity;
      for (let i = 0; i < this.queue.length; i++) {
        if (this.queue[i].priority < minP) {
          minP = this.queue[i].priority;
          minIdx = i;
        }
      }
      this.queue.splice(minIdx, 1);
    }
    this.process();
  }

  private process(): void {
    if (this.speaking) return;
    const item = this.queue.shift();
    if (!item) return;
    this.speaking = true;
    this.lastSpeechTick = this.tick;
    this.speak(item.text, () => {
      this.speaking = false;
      setTimeout(() => this.process(), 120);
    });
  }

  private speak(text: string, onDone: () => void): void {
    if (!this.available()) {
      setTimeout(onDone, 500 + text.length * 40);
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (!this.voice) this.refreshVoice();
      if (this.voice) {
        u.voice = this.voice;
        u.lang = this.voice.lang;
      } else {
        u.lang = this.lang;
      }
      u.rate = this.rate;
      u.pitch = this.pitch;
      u.volume = this.volume;
      let done = false;
      const fire = () => {
        if (done) return;
        done = true;
        onDone();
      };
      u.onend = fire;
      u.onerror = fire;
      const estimate = 700 + text.length * 60;
      setTimeout(fire, estimate);
      speechSynthesis.speak(u);
    } catch {
      onDone();
    }
  }

  onFrame(running: boolean, worldTick: number): void {
    this.tick++;
    if (!this.enabled || !running) return;
    if (this.tick - this.lastSpeechTick > 600 && worldTick > 60) {
      this.enqueue(pickPhrase('quiet'), PRIORITY.LOW);
    }
  }

  battleStart(speakableNames: string[]): void {
    if (!this.enabled) return;
    this.resetBattleState();
    this.lastAliveCount = speakableNames.length;
    if (speakableNames.length === 2) {
      this.enqueue(
        pickPhrase('duel', { a: speakableNames[0], b: speakableNames[1] }),
        PRIORITY.HIGH,
      );
    } else {
      this.enqueue(
        pickPhrase('battleStart', { n: speakableNames.length }),
        PRIORITY.HIGH,
      );
    }
  }

  hit(attacker: string, victim: string, amount: number): void {
    if (!this.enabled) return;
    if (!this.firstBloodSeen) {
      this.firstBloodSeen = true;
      this.enqueue(pickPhrase('firstBlood', { a: attacker }), PRIORITY.HIGH);
      return;
    }
    if (amount >= 8) {
      this.enqueue(pickPhrase('heavyHit', { a: attacker, v: victim }), PRIORITY.MID);
    } else if (Math.random() < 0.3) {
      this.enqueue(pickPhrase('hit', { a: attacker, v: victim }), PRIORITY.LOW);
    }
  }

  reportCritical(robotId: number, victim: string): void {
    if (!this.enabled) return;
    if (this.criticalAnnounced.has(robotId)) return;
    this.criticalAnnounced.add(robotId);
    this.enqueue(pickPhrase('critical', { v: victim }), PRIORITY.MID);
  }

  kill(attacker: string | null, victim: string, aliveAfter: number): void {
    if (!this.enabled) return;
    if (attacker && attacker !== victim) {
      this.enqueue(pickPhrase('killBy', { a: attacker, v: victim }), PRIORITY.HIGH);
    } else {
      this.enqueue(pickPhrase('kill', { v: victim }), PRIORITY.HIGH);
    }
    if (aliveAfter === 3 && this.lastAliveCount > 3) {
      this.enqueue(pickPhrase('threeLeft'), PRIORITY.MID);
    } else if (aliveAfter === 2 && this.lastAliveCount > 2) {
      this.enqueue(pickPhrase('twoLeft'), PRIORITY.HIGH);
    }
    this.lastAliveCount = aliveAfter;
  }

  battleEnd(winnerSpeakable: string | null): void {
    if (!this.enabled) return;
    if (winnerSpeakable) {
      this.enqueue(pickPhrase('winner', { a: winnerSpeakable }), PRIORITY.CRITICAL);
    } else {
      this.enqueue(pickPhrase('draw'), PRIORITY.CRITICAL);
    }
  }
}

export const commentator = new Commentator();
