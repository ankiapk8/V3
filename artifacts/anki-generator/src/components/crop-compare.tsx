import { useState } from "react";
import { ZoomIn, Eye, EyeOff, AlertCircle } from "lucide-react";

export type Bbox = { x: number; y: number; w: number; h: number };

export function parseBbox(raw: string | null | undefined): Bbox | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (
      typeof obj?.x === "number" && typeof obj?.y === "number" &&
      typeof obj?.w === "number" && typeof obj?.h === "number"
    ) return obj as Bbox;
  } catch {
    /* ignore */
  }
  return null;
}

interface CropCompareProps {
  image: string;
  sourceImage?: string | null;
  bbox?: Bbox | null;
  onLightbox?: (src: string) => void;
  className?: string;
  defaultOpen?: boolean;
}

export function CropCompare({ image, sourceImage, bbox, onLightbox, className, defaultOpen = false }: CropCompareProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasSource = !!sourceImage && !!bbox;

  if (!hasSource) {
    return (
      <div
        className={`rounded-lg overflow-hidden border border-border/40 bg-background relative group/img ${onLightbox ? "cursor-zoom-in" : ""} ${className ?? ""}`}
        onClick={() => onLightbox?.(image)}
      >
        <img src={image} alt="Card visual" className="w-full h-auto max-h-72 object-contain" />
        {onLightbox && (
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/60 text-white rounded-full p-2">
              <ZoomIn className="h-5 w-5" />
            </div>
          </div>
        )}
      </div>
    );
  }

  const fullPage = bbox!.w >= 0.99 && bbox!.h >= 0.99 && bbox!.x <= 0.01 && bbox!.y <= 0.01;
  const tinyCrop = bbox!.w * bbox!.h < 0.04;
  const warning = tinyCrop ? "Crop is very small — may be missing context" : null;

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className={`grid gap-2 ${open ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        <div
          className={`rounded-lg overflow-hidden border border-border/40 bg-background relative group/img ${onLightbox ? "cursor-zoom-in" : ""}`}
          onClick={() => onLightbox?.(image)}
        >
          <div className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded bg-black/60 text-white pointer-events-none">
            Crop
          </div>
          <img src={image} alt="Card visual crop" className="w-full h-auto max-h-72 object-contain" />
          {onLightbox && (
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/60 text-white rounded-full p-2">
                <ZoomIn className="h-5 w-5" />
              </div>
            </div>
          )}
        </div>

        {open && (
          <div
            className={`rounded-lg overflow-hidden border border-border/40 bg-background relative group/img ${onLightbox ? "cursor-zoom-in" : ""}`}
            onClick={() => onLightbox?.(sourceImage!)}
          >
            <div className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded bg-black/60 text-white pointer-events-none">
              Source page
            </div>
            <div className="relative">
              <img src={sourceImage!} alt="Source page" className="w-full h-auto max-h-72 object-contain block" />
              {!fullPage && (
                <div
                  className="absolute border-2 border-red-500 bg-red-500/15 pointer-events-none shadow-[0_0_0_1px_rgba(0,0,0,0.4)_inset]"
                  style={{
                    left: `${bbox!.x * 100}%`,
                    top: `${bbox!.y * 100}%`,
                    width: `${bbox!.w * 100}%`,
                    height: `${bbox!.h * 100}%`,
                  }}
                />
              )}
            </div>
            {onLightbox && (
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                <div className="opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/60 text-white rounded-full p-2">
                  <ZoomIn className="h-5 w-5" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          {open ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {open ? "Hide source page" : "Compare to source page"}
        </button>
        {open && warning && (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-500">
            <AlertCircle className="h-3 w-3" /> {warning}
          </span>
        )}
      </div>
    </div>
  );
}
