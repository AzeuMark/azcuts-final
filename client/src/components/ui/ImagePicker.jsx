import { useEffect, useRef, useState } from 'react';
import { UploadCloud, Link2, X, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import cn from '../../utils/cn';
import Input from './Input';
import Button from './Button';

const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — matches the server

const ASPECT = {
  video: 'aspect-video', // 16:9 — landscape (services)
  square: 'aspect-square', // avatars
};

function validateFile(file) {
  if (!ALLOWED.includes(file.type)) {
    toast.error('Only PNG, JPG, or JPEG images are allowed');
    return false;
  }
  if (file.size > MAX_BYTES) {
    toast.error('Image must be smaller than 5MB');
    return false;
  }
  return true;
}

/**
 * Reusable image input. Three ways to set an image:
 *   1. Click the drop zone to open the file picker
 *   2. Drag & drop a file (or drag an image from another tab → URL)
 *   3. Paste an image URL and press "Use link"
 *
 * Emits onChange({ file, url }): exactly one is set, or both null when cleared.
 * `preview` is the existing image to show before any new selection.
 */
export default function ImagePicker({
  preview = null,
  onChange,
  hint,
  aspect = 'video',
  rounded = 'lg',
  disabled = false,
  className,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  // { previewUrl, isObject } for the pending selection (null = show `preview`).
  const [chosen, setChosen] = useState(null);

  // Revoke object URLs to avoid leaks.
  useEffect(
    () => () => {
      if (chosen?.isObject && chosen.previewUrl) URL.revokeObjectURL(chosen.previewUrl);
    },
    [chosen]
  );

  const shown = chosen?.previewUrl || preview;

  const pickFile = (file) => {
    if (!file || !validateFile(file)) return;
    if (chosen?.isObject && chosen.previewUrl) URL.revokeObjectURL(chosen.previewUrl);
    const objectUrl = URL.createObjectURL(file);
    setChosen({ previewUrl: objectUrl, isObject: true });
    setUrlInput('');
    onChange?.({ file, url: null });
  };

  const applyUrlValue = (raw) => {
    const u = raw.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) {
      toast.error('Enter a valid image URL (must start with http:// or https://)');
      return;
    }
    if (chosen?.isObject && chosen.previewUrl) URL.revokeObjectURL(chosen.previewUrl);
    setChosen({ previewUrl: u, isObject: false });
    onChange?.({ file: null, url: u });
  };

  const clear = () => {
    if (chosen?.isObject && chosen.previewUrl) URL.revokeObjectURL(chosen.previewUrl);
    setChosen(null);
    setUrlInput('');
    onChange?.({ file: null, url: null });
  };

  const openDialog = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      pickFile(file);
      return;
    }
    // Dragged an image from another tab → arrives as a URL.
    const uri =
      e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (uri && /^https?:\/\//i.test(uri.trim())) applyUrlValue(uri);
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Drop zone / preview */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload an image — click, drag & drop, or use a link below"
        onClick={openDialog}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDialog();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'group relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors',
          ASPECT[aspect] || ASPECT.video,
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          dragOver ? 'border-brand bg-brand/5' : 'border-line bg-surface-2 hover:border-brand/60'
        )}
      >
        {shown ? (
          <>
            <img
              src={shown}
              alt="Preview"
              draggable="false"
              className={cn(
                'h-full w-full object-cover',
                rounded === 'full' ? 'rounded-full' : 'rounded-xl'
              )}
            />
            {/* Replace hint on hover */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <UploadCloud className="h-4 w-4" /> Click or drop to replace
              </span>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clear();
                }}
                aria-label="Remove image"
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center text-muted">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
              <ImageIcon className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-ink">Click to upload or drag & drop</p>
            <p className="text-xs">or use an image link below</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // allow re-selecting the same file
            if (file) pickFile(file);
          }}
        />
      </div>

      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}

      {/* URL input */}
      <div className="mt-2 flex items-end gap-2">
        <Input
          leftIcon={<Link2 className="h-4 w-4" />}
          placeholder="Paste an image URL (https://…)"
          value={urlInput}
          disabled={disabled}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyUrlValue(urlInput);
            }
          }}
          containerClassName="flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => applyUrlValue(urlInput)}
          disabled={disabled || !urlInput.trim()}
        >
          Use link
        </Button>
      </div>
    </div>
  );
}
