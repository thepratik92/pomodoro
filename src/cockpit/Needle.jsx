import { useEffect } from 'react';
import { motion, useReducedMotion, useSpring } from 'motion/react';

// A needle has mass. Slightly under-damped, so it arrives a touch late and
// settles with one small overshoot — the difference between a pointer that is
// drawn at a value and one that is driven to it.
const NEEDLE_SPRING = { stiffness: 90, damping: 16, mass: 1 };
// Clock hands are geared, not sprung on a hairspring: quicker and nearly dead-beat.
const HAND_SPRING = { stiffness: 260, damping: 24, mass: 1 };

/**
 * A rotating layer the size of its dial, with whatever is drawn inside it
 * pointing straight up at rest. `angle` is degrees clockwise; changes spring.
 * `from` is where it rests before the first reading — the cluster wakes with
 * its needles on the stop, then sweeps up to the value.
 */
export function Rotor({ angle, from, hand = false, className, children }) {
  const reduced = useReducedMotion();
  const mv = useSpring(reduced || from === undefined ? angle : from, hand ? HAND_SPRING : NEEDLE_SPRING);

  useEffect(() => {
    if (reduced) mv.jump(angle);
    else mv.set(angle);
  }, [angle, reduced, mv]);

  return (
    <motion.span className={'ck-rotor' + (className ? ' ' + className : '')} style={{ rotate: mv }}>
      {children}
    </motion.span>
  );
}

/**
 * The cluster needle: a tapered blade from the hub to `length`, with a short
 * counterweight behind it. The shadow is cast by the wrapper, not the blade,
 * so it stays under the same light as the needle turns.
 */
export default function Needle({ angle, from, length = 168, tail = 26, width = 5, hub = 15 }) {
  const w = width / 2;
  return (
    <span className="ck-needle" aria-hidden="true">
      <Rotor angle={angle} from={from}>
        <svg viewBox="-200 -200 400 400">
          <polygon className="ck-needle-blade" points={`${-w},0 ${-w * 0.36},${-length} ${w * 0.36},${-length} ${w},0`} />
          {tail > 0 && <rect className="ck-needle-tail" x={-w * 1.5} y={0} width={w * 3} height={tail} rx={w * 1.2} />}
        </svg>
      </Rotor>
      {hub > 0 && (
        <svg viewBox="-200 -200 400 400" className="ck-hub">
          <circle r={hub} className="ck-hub-cap" />
          <circle r={hub * 0.34} className="ck-hub-pin" />
        </svg>
      )}
    </span>
  );
}
