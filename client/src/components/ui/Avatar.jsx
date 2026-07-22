import cn from '../../utils/cn';
import { serverAsset } from '../../utils/serverAsset';

function initialsOf(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'
  );
}

/*
 * Round avatar that shows the user's uploaded photo (resolved from a server path)
 * and gracefully falls back to their initials. Size it via className (height/width).
 */
export default function Avatar({ src, name, className, alt }) {
  const url = serverAsset(src);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/10 font-semibold text-brand',
        className
      )}
    >
      {url ? (
        <img src={url} alt={alt || name || 'Avatar'} className="h-full w-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
