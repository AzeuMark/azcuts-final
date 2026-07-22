import clsx from 'clsx';

// Thin class-name combiner. clsx handles conditional/array/object class inputs;
// keeping it behind one helper lets us swap in tailwind-merge later if needed.
export function cn(...inputs) {
  return clsx(inputs);
}

export default cn;
