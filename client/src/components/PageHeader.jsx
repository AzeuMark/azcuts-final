import cn from '../utils/cn';

/*
 * Page header with an optional uppercase eyebrow/breadcrumb and a Fraunces serif
 * title, mirroring the dashboard design language. `eyebrow` is optional so every
 * existing usage (title/description/actions) keeps working unchanged.
 */
export default function PageHeader({ title, description, actions, eyebrow, className }) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {description && <p className="mt-2 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
