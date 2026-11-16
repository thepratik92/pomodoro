import { useRef } from 'react';

/**
 * Turns an angle that wraps (a clock hand: 354° then 0°) into one that only
 * ever takes the short way round, so the spring never unwinds a full turn.
 */
export function useShortestAngle(target) {
  const ref = useRef(target);
  const prev = ref.current;
  const delta = ((((target - prev) % 360) + 540) % 360) - 180;
  // A clock hand that is asked for "the same place" stays; one asked to move
  // on by a tick moves forward even when that crosses 360°.
  const next = prev + delta;
  ref.current = next;
  return next;
}
