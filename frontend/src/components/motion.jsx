// components/motion.jsx — small Framer Motion building blocks used across the site.
//   <Reveal>           fades/slides a section in when it scrolls into view
//   <StaggerGrid>      a grid whose children animate in one after another
//   <StaggerItem>      a child of StaggerGrid
// All of them respect the user's "reduce motion" OS setting.
import { motion, useReducedMotion } from 'framer-motion';

const EASE = [0.2, 0.8, 0.2, 1];

export function Reveal({ children, delay = 0, y = 24, className = '', as = 'div' }) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: EASE } },
};

export function StaggerGrid({ children, className = '' }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} variants={gridVariants} initial={reduce ? false : 'hidden'} animate="show">
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
