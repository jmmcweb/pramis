const LeftPanel = () => {
  return (
    <div
      className="relative w-full lg:w-1/2 lg:h-dvh flex flex-col items-center justify-center pt-4 pb-3 md:pt-6 md:pb-4 lg:py-0 bg-cover bg-no-repeat overflow-hidden"
      style={{ backgroundImage: "url('/bg1.png')", backgroundPosition: 'center 25%' }}
    >
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-12 md:-inset-16 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0.2)_55%,rgba(255,255,255,0)_78%)] pointer-events-none"
          />
          <div className="relative flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2">
            <img
              src="/logo.png"
              alt="PRAMIS Logo"
              className="w-16 sm:w-20 md:w-36 lg:w-44 xl:w-48 2xl:w-56 shrink-0"
            />

            {/* Wordmark block: tagline justified to exactly match the PRAMIS width */}
            <div className="flex flex-col items-end min-w-0 w-fit">
              <h1
                className="text-[clamp(2.5rem,8.5vw,6rem)] font-bold text-[#0F588B] leading-none tracking-[0.04em]"
                style={{ fontFamily: "Bebas Neue" }}
              >
                PRAMIS
              </h1>

              <p
                className="w-full flex justify-between text-[clamp(0.75rem,2.7vw,1.5rem)] text-[#0F588B] tracking-normal leading-none whitespace-nowrap mt-[0.15em]"
                style={{ fontFamily: "Asap Condensed" }}
              >
                <span>Stay</span>
                <span>On</span>
                <span>Track</span>
                <span>With</span>
                <span>Us</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-5 lg:pb-6 text-center">
        <span
          className="text-sm text-[#0F588B]/70 tracking-[0.2em] uppercase"
          style={{ fontFamily: "Asap Condensed" }}
        >
          Ⓒ PRAMIS Developers
        </span>
      </div>
    </div>
  )
}

export default LeftPanel
