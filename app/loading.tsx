export default function Loading() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 bg-background">
      {/* Brand lockup — mirrors the landing page header */}
      <div className="flex items-center gap-1.5">
        <img
          src="/logo.png"
          alt="PRAMIS"
          className="w-12 h-12 md:w-14 md:h-14 object-contain"
        />
        <div className="flex flex-col items-end justify-center leading-none w-fit">
          <span className="font-bebas text-3xl md:text-[38px] text-brand tracking-wide">
            PRAMIS
          </span>
          <span className="w-full flex justify-between font-asap text-[10px] md:text-[11px] text-brand/70 tracking-normal whitespace-nowrap mt-1">
            <span>Stay</span>
            <span>On</span>
            <span>Track</span>
            <span>With</span>
            <span>Us</span>
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