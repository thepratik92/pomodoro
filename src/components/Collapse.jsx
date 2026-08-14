import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const SPRING = { type: 'spring', stiffness: 440, damping: 42 };

/** Springs a block open/closed by height, clipping its content while it moves. */
export default function Collapse({ show, children }) {
  const reduced = useReducedMotion();
  const transition = reduced ? { duration: 0.01 } : SPRING;
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          style={{ overflow: 'hidden', width: '100%', flex: 'none' }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={transition}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
