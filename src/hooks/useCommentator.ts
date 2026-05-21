import { useEffect, useRef } from 'react';
import { commentator } from '../audio/commentator';
import { MatchState } from '../engine/match';
import { Robot } from '../engine/types';
import { computeSpeakable } from '../robots';

const HIT_FLOOR = 3;

export interface UseCommentatorOptions {
  match: MatchState | null;
  running: boolean;
  enabled: boolean;
  voiceName: string;
  speakableByName?: Record<string, string>;
}

export function useCommentator({
  match,
  running,
  enabled,
  voiceName,
  speakableByName,
}: UseCommentatorOptions) {
  const lastEventSeq = useRef(0);
  const lastBattleId = useRef<MatchState | null>(null);
  const battleEndAnnounced = useRef(false);
  const finishedDeclared = useRef(false);

  const speakNameOf = (r: Robot | undefined): string => {
    if (!r) return '';
    return speakableByName?.[r.name] ?? computeSpeakable(r.name);
  };

  useEffect(() => {
    commentator.setEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    if (voiceName) commentator.setVoiceByName(voiceName);
    else commentator.refreshVoice();
  }, [voiceName]);

  useEffect(() => {
    if (!commentator.available()) return;
    const handler = () => commentator.refreshVoice();
    try {
      speechSynthesis.onvoiceschanged = handler;
    } catch {
      /* ignore */
    }
    commentator.refreshVoice();
    return () => {
      try {
        speechSynthesis.onvoiceschanged = null;
      } catch {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    if (!match) {
      lastEventSeq.current = 0;
      battleEndAnnounced.current = false;
      finishedDeclared.current = false;
      lastBattleId.current = null;
      return;
    }
    if (lastBattleId.current !== match) {
      lastEventSeq.current = match.arena.totalEvents;
      battleEndAnnounced.current = false;
      finishedDeclared.current = false;
      lastBattleId.current = match;
      const names = match.arena.robots.map((r) => speakNameOf(r));
      commentator.battleStart(names);
    }
  }, [match]);

  useEffect(() => {
    if (!match) return;
    const arena = match.arena;

    commentator.onFrame(running, arena.tick);

    const delta = arena.totalEvents - lastEventSeq.current;
    if (delta > 0) {
      const slice = arena.events.slice(-Math.min(delta, arena.events.length));
      for (const ev of slice) {
        switch (ev.kind) {
          case 'damage': {
            if (ev.amount < HIT_FLOOR) break;
            const victim = arena.robots.find((r) => r.id === ev.robotId);
            const attacker =
              ev.attackerId !== undefined
                ? arena.robots.find((r) => r.id === ev.attackerId)
                : undefined;
            const v = speakNameOf(victim);
            const a = attacker ? speakNameOf(attacker) : v;
            commentator.hit(a, v, ev.amount);
            if (victim && victim.alive && victim.damage >= 80) {
              commentator.reportCritical(victim.id, v);
            }
            break;
          }
          case 'death': {
            const victim = arena.robots.find((r) => r.id === ev.robotId);
            const attacker =
              ev.attackerId !== undefined
                ? arena.robots.find((r) => r.id === ev.attackerId)
                : undefined;
            const v = speakNameOf(victim);
            const a = attacker ? speakNameOf(attacker) : null;
            const aliveAfter = arena.robots.filter((r) => r.alive).length;
            commentator.kill(a, v, aliveAfter);
            break;
          }
          default:
            break;
        }
      }
      lastEventSeq.current = arena.totalEvents;
    }

    if (match.finished && !battleEndAnnounced.current) {
      battleEndAnnounced.current = true;
      const winner = match.winner ? speakNameOf(match.winner) : null;
      commentator.battleEnd(winner);
    }
  }, [match, match?.arena.tick, match?.finished, running]);

  useEffect(
    () => () => {
      commentator.cancel();
    },
    [],
  );
}
