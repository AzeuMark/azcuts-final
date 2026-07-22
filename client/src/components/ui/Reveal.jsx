import { useInView } from '../../hooks/useInView';
import cn from '../../utils/cn';

// Detected once — users who prefer reduced motion get content with no animation.
const PREFERS_REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const HIDDEN = {
  up: 'translate-y-8 opacity-0',
  down: '-translate-y-8 opacity-0',
  left: '-translate-x-10 opacity-0', // enters from the left
  right: 'translate-x-10 opacity-0', // enters from the right
  fade: 'opacity-0',
};

/*
 * Scroll-reveal wrapper. Fades/slides its children into place when they enter
 * the viewport. direction: 'up' | 'down' | 'left' | 'right' | 'fade'.
 * Use `delay` (ms) to stagger items in a grid.
 */
export default function Reveal({
  as: Tag = 'div',
  direction = 'up',
  delay = 0,
  className,
  children,
  ...props
}) {
  const [ref, inView] = useInView();
  const hidden = HIDDEN[direction] || HIDDEN.up;

  return (
    <Tag
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'transition-all duration-700 ease-out will-change-transform motion-reduce:transform-none motion-reduce:transition-none',
        PREFERS_REDUCED ? '' : inView ? 'translate-x-0 translate-y-0 opacity-100' : hidden,
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
