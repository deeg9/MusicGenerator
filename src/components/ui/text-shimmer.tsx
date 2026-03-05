'use client';
import { motion } from 'framer-motion';

interface TextShimmerProps {
  children: string;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

export function TextShimmer({
  children,
  as: Component = 'p',
  className,
  duration = 2,
}: TextShimmerProps) {
  return (
    <Component className={`relative inline-block ${className ?? ''}`}>
      <motion.span
        className="bg-clip-text text-transparent bg-[length:250%_100%]"
        style={{
          backgroundImage:
            'linear-gradient(90deg, currentColor 40%, var(--color-violet-400, #a78bfa) 50%, currentColor 60%)',
        }}
        animate={{ backgroundPosition: ['100% center', '0% center'] }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
      >
        {children}
      </motion.span>
    </Component>
  );
}
