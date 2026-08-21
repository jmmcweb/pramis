// Shared MediTrack brand — single source of truth for the logo + wordmark
// used on Login, Signup, Forgot Password, every onboarding step, and the
// Patient UI header. The `compact` variant keeps the identical structure,
// fonts, colors, and alignment rules at header-bar size.
export default function MediTrackBrand({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-center">
        <img
          src="/logo.png"
          alt="MediTrack Logo"
          className="w-10 h-10 md:w-11 md:h-11 object-contain -mr-1"
        />
        <div className="flex flex-col items-start text-left mr-1.5 md:mr-3">
          <h1
            className="text-[1.5rem] md:text-[1.75rem] font-bold text-[#0F588B] leading-none"
            style={{ fontFamily: 'Bebas Neue' }}
          >
            MEDITRACK
          </h1>
          <p
            className="text-[0.6875rem] md:text-[0.75rem] text-[#0F588B] tracking-normal mt-[0.5px] leading-none whitespace-nowrap"
            style={{ fontFamily: 'Asap Condensed' }}
          >
            Stay On Track With Us
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <img src="/logo.png" alt="MediTrack Logo" className="w-19 md:w-38 lg:w-38 -mr-1" />
      <div className="flex flex-col items-start text-left mr-2 md:mr-6 lg:mr-10">
        <h1
          className="text-[3.75rem] font-bold text-[#0F588B] leading-none"
          style={{ fontFamily: 'Bebas Neue' }}
        >
          MEDITRACK
        </h1>
        <p
          className="text-[1.125rem] text-[#0F588B] tracking-[0.18em] leading-none whitespace-nowrap"
          style={{ fontFamily: 'Asap Condensed' }}
        >
          Stay On Track With Us
        </p>
      </div>
    </div>
  )
}