import { useEffect } from "react";

export default function Lightbox({
  isOpen,
  src,
  title,
  onClose,
  onPrev,
  onNext,
  children,

  // ✅ нові пропси (щоб як у тебе в ClientPage)
  canLike = false,
  liked = false,
  onToggleLike,
  canDownload = false,
  onDownload,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };

    window.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose, onPrev, onNext]);

  if (!isOpen) return null;

  return (
    <div className="lb-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lb-card" onClick={(e) => e.stopPropagation()}>
        <button className="lb-x" type="button" onClick={onClose} aria-label="Закрити">
          ✕
        </button>

        <div className="lb-imgWrap">
          <img
            src={src}
            alt={title || "photo"}
            className="lb-img"
            draggable={false}
          />

          {/* overlay nav buttons */}
          <button className="lb-nav lb-prev" type="button" onClick={onPrev} aria-label="Попереднє">
            ←
          </button>
          <button className="lb-nav lb-next" type="button" onClick={onNext} aria-label="Наступне">
            →
          </button>

          {/* ✅ actions справа зверху */}
          {(children || canLike || canDownload) ? (
            <div className="lb-actions" onClick={(e) => e.stopPropagation()}>
              {canLike ? (
                <button
                  type="button"
                  onClick={onToggleLike}
                  title={liked ? "Прибрати лайк" : "Лайкнути"}
                  className="icon-btn"
                  style={{ width: 45, height: 44 }}
                >
                  {liked ? "❤️" : "🤍"}
                </button>
              ) : null}

              {canDownload ? (
                <button
                  type="button"
                  onClick={onDownload}
                  title="Завантажити"
                  className="icon-btn"
                  style={{ width: 45, height: 44 }}
                >
                  ⬇️
                </button>
              ) : null}

              {children}
            </div>
          ) : null}
        </div>

        <div className="lb-titleBar">
          <div className="lb-title" title={title || ""}>
            {title || ""}
          </div>
        </div>
      </div>
    </div>
  );
}
