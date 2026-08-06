import { motion, useReducedMotion } from 'framer-motion';

export default function HeroBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Animated grid */}
      <div className="hero-grid absolute inset-0" />

      {/* Aurora blobs */}
      <motion.div
        className="aurora"
        style={{
          width: '42vw',
          height: '42vw',
          top: '-12%',
          left: '-8%',
          background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
        }}
        animate={
          reduceMotion
            ? {}
            : { x: [0, 40, 0], y: [0, 24, 0] }
        }
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="aurora"
        style={{
          width: '36vw',
          height: '36vw',
          top: '4%',
          right: '-10%',
          background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)',
        }}
        animate={
          reduceMotion
            ? {}
            : { x: [0, -36, 0], y: [0, 32, 0] }
        }
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="aurora"
        style={{
          width: '30vw',
          height: '30vw',
          bottom: '-14%',
          left: '30%',
          background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
          opacity: 0.18,
        }}
        animate={
          reduceMotion
            ? {}
            : { x: [0, 24, 0], y: [0, -20, 0] }
        }
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Fade to background at bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{ background: 'linear-gradient(to bottom, transparent, #050507)' }}
      />
    </div>
  );
}
