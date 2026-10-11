// Shared PRAMIS brand — single source of truth for the logo + wordmark
// used on the Patient UI header and sidebar. The `compact` variant keeps
// the identical structure, fonts, colors, and alignment rules at
// header-bar size. Layout: logo mark on the left, PRAMIS wordmark to its
// right with the tagline justified to exactly match the wordmark width.
export default function MediTrackBrand({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-center">
        <img
          src="/logo.png"
          alt="PRAMIS Logo"
          className="w-10 h-10 md:w-11 md:h-11 object-contain shrink-0"
        />
        <div className="flex flex-col items-end ml-1 md:ml-1.5 w-fit">
          <h1
            className="text-[1.5rem] md:text-[1.75rem] font-bold text-[#0F588B] leading-none tracking-[0.05em]"
            style={{ fontFamily: 'Bebas Neue' }}
          >
            PRAMIS
          </h1>
          <p
            className="w-full flex justify-between text-[0.5rem] md:text-[0.5625rem] text-[#0F588B] tracking-normal leading-none whitespace-nowrap mt-[2px]"
            style={{ fontFamily: 'Asap Condensed' }}
          >
            <span>Stay</span>
            <span>On</span>
            <span>Track</span>
            <span>With</span>
            <span>Us</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <img
        src="/logo.png"
        alt="PRAMIS Logo"
        className="w-19 md:w-38 object-contain shrink-0"
      />
      <div className="flex flex-col items-end ml-1.5 md:ml-3 w-fit">
        <h1
          className="text-[3.75rem] font-bold text-[#0F588B] leading-none tracking-[0.04em]"
          style={{ fontFamily: 'Bebas Neue' }}
        >
          PRAMIS
        </h1>
        <p
          className="w-full flex justify-between text-[1.125rem] text-[#0F588B] tracking-normal leading-none whitespace-nowrap mt-1"
          style={{ fontFamily: 'Asap Condensed' }}
        >
          <span>Stay</span>
          <span>On</span>
          <span>Track</span>
          <span>With</span>
          <span>Us</span>
        </p>
      </div>
    </div>
  )
}