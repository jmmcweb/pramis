const LeftPanel = () => {
  return (
    <div
      className="relative w-full lg:w-1/2 lg:h-dvh flex flex-col items-center justify-center pt-4 pb-3 md:pt-6 md:pb-4 lg:py-0 bg-cover bg-no-repeat overflow-hidden"
      style={{ backgroundImage: "url('/bg1.png')", backgroundPosition: 'center 25%' }}
    >
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="relative -mt-8 md:-mt-14 lg:-mt-16 ml-6 md:ml-12 lg:ml-20">
          <div
            aria-hidden
            className="absolute -inset-16 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0.2)_55%,rgba(255,255,255,0)_78%)] pointer-events-none"
          />
          <div className="relative flex items-center justify-center">
            <img src="/logo.png" alt="MediTrack Logo" className="w-20 sm:w-24 md:w-40 lg:w-48 xl:w-52 2xl:w-56 mr-1 md:mr-2" />

            <div className="relative -left-2 md:-left-6 lg:-left-8 grid grid-cols-1 text-left mr-2 md:mr-6 lg:mr-10 min-w-0">
              <h1
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl 2xl:text-9xl font-bold text-[#0F588B] leading-none"
                style={{ fontFamily: "Bebas Neue" }}
              >
                MEDITRACK
              </h1>

              <p
                className="text-lg sm:text-xl md:text-2xl lg:text-3xl 2xl:text-4xl text-[#0F588B] tracking-[0.129em] lg:tracking-[0.164em] 2xl:tracking-[0.225em] -mt-4 leading-none whitespace-nowrap"
                style={{ fontFamily: "Asap Condensed" }}
              >
                Stay On Track With Us
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
          Ⓒ Meditrack Developers
        </span>
      </div>
    </div>
  )
}

export default LeftPanel
