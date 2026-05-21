import { Arena } from './arena';
import { TRIG_SCALE } from './constants';
import { RNG } from './rng';
import { Robot } from './types';
import { IntrinsicHost } from './vm';

export function makeIntrinsicHost(arena: Arena, me: Robot, rng: RNG): IntrinsicHost {
  return {
    callIntrinsic(idx: number, args: number[]): number {
      switch (idx) {
        case 0:
          return arena.scan(me, args[0] | 0, args[1] | 0);
        case 1:
          return arena.cannon(me, args[0] | 0, args[1] | 0);
        case 2:
          arena.drive(me, args[0] | 0, args[1] | 0);
          return 0;
        case 3:
          return me.damage | 0;
        case 4:
          return Math.floor(me.speed);
        case 5:
          return Math.floor(me.x);
        case 6:
          return Math.floor(me.y);
        case 7:
          return rng.int(args[0] | 0);
        case 8: {
          const v = Math.abs(args[0] | 0);
          return Math.floor(Math.sqrt(v));
        }
        case 9: {
          const rad = ((args[0] | 0) * Math.PI) / 180;
          return Math.floor(Math.sin(rad) * TRIG_SCALE);
        }
        case 10: {
          const rad = ((args[0] | 0) * Math.PI) / 180;
          return Math.floor(Math.cos(rad) * TRIG_SCALE);
        }
        case 11: {
          const rad = ((args[0] | 0) * Math.PI) / 180;
          return Math.floor(Math.tan(rad) * TRIG_SCALE);
        }
        case 12: {
          const ratio = (args[0] | 0) / TRIG_SCALE;
          return Math.floor((Math.atan(ratio) * 180) / Math.PI);
        }
        default:
          return 0;
      }
    },
  };
}
