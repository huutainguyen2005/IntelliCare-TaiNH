import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true: nút xác nhận màu đỏ (hành động hủy/xóa). */
  danger?: boolean;
  /** true: đang xử lý - khóa nút, không cho đóng bằng Esc / bấm nền. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Giữ lại",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  // Mở: khóa cuộn nền, focus vào nút an toàn ("Giữ lại"). Đóng: trả focus về chỗ cũ.
  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelBtnRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      lastFocusedRef.current?.focus?.();
    };
  }, [open]);

  // Esc để đóng + giữ Tab quay vòng trong hộp thoại
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!loading) {
          e.stopPropagation();
          onCancel();
        }
        return;
      }

      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled])",
      );
      if (!focusables || focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (!panelRef.current?.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {/* Nền mờ - bấm vào để đóng */}
      <div
        aria-hidden="true"
        onClick={() => {
          if (!loading) onCancel();
        }}
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] motion-safe:animate-fade-in"
      />

      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative w-full rounded-t-2xl border border-hairline bg-paper-raised p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl motion-safe:animate-sheet-in sm:max-w-[420px] sm:rounded-2xl sm:p-6 sm:motion-safe:animate-pop-in"
      >
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              danger ? "bg-risk/10 text-risk" : "bg-safe/10 text-safe"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {title}
            </h2>
            {description && (
              <div
                id={descId}
                className="mt-1.5 break-words text-[15px] leading-6 text-muted"
              >
                {description}
              </div>
            )}
          </div>
        </div>

        {/* Mobile: nút xác nhận ở trên, "Giữ lại" ở dưới (gần ngón cái, tránh bấm nhầm) */}
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-11 rounded-lg border border-hairline bg-paper-raised px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-paper focus:outline-none focus:ring-2 focus:ring-safe/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${
              danger
                ? "bg-risk focus:ring-risk/30"
                : "bg-safe focus:ring-safe/30"
            }`}
          >
            {loading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-[spin_0.8s_linear_infinite]"
              />
            )}
            {loading ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
