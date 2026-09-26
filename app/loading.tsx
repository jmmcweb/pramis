export default function Loading() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 bg-background">
      {/* Brand lockup — mirrors the landing page header */}
      <div className="flex items-center gap-3">
        <img
          src="/meditrack-logo.png"
          alt="PRAMIS"
          className="w-12 h-12 md:w-14 md:h-14 object-contain"
        />
        <div className="flex flex-col leading-none">
          <span className="font-bebas text-3xl md:text-[38px] text-brand tracking-wide">
            PRAMIS
          </span>
          <span className="font-asap text-[11px] md:text-xs text-brand/70 tracking-[0.14em] whitespace-nowrap -mt-3">
            Stay On Track With Us
          </span>
        </div>
      </div>

      {/* Spinner */}
      <div className="flex flex-col items-center gap-2.5" role="status" aria-live="polite">
        <div className="w-9 h-9 rounded-full border-4 border-brand/25 border-t-brand animate-spin" />
        <span className="font-inter text-[13px] text-body/60">Loading…</span>
      </div>
    </main>
  )
}