import { useState } from 'react';
import { Star } from 'lucide-react';
import cn from '../utils/cn';

const SIZES = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

export default function RatingStars({ value = 0, onChange, readOnly = false, size = 'md', className }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div
      className={cn('inline-flex items-center gap-1', className)}
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={cn(
            'rounded transition-transform',
            readOnly ? 'cursor-default' : 'hover:scale-110 focus-ring'
          )}
        >
          <Star
            className={cn(
              SIZES[size] || SIZES.md,
              n <= display ? 'fill-warning text-warning' : 'fill-transparent text-muted'
            )}
          />
        </button>
      ))}
    </div>
  );
}
