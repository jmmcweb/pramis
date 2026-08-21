'use client'
import { useFontSize, FontSize, FONT_SCALES } from './FontSizeContext'

const OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

export default function FontSizeSetting({ darkMode }: { darkMode: boolean }) {
  const { fontSize, setFontSize } = useFontSize()

  return (
    <div
      className={`flex flex-col py-3 border-b ${
        darkMode ? 'border-[rgba(255,255,255,0.08)]' : 'border-[rgba(15,60,95,0.08)]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className={`text-[16px] font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Font Size</span>
          <span className={`text-[13px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Adjust the size of text across the app</span>
        </div>
        <div
          className={`flex items-center gap-1 rounded-[10px] p-1 ${
            darkMode ? 'bg-[#0f1438] border border-[rgba(255,255,255,0.10)]' : 'bg-gray-100 border border-gray-200'
          }`}
        >
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setFontSize(o.value)}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold border-none cursor-pointer transition-colors whitespace-nowrap ${
                fontSize === o.value
                  ? 'bg-[#4E69D3] text-white shadow-[0_2px_6px_rgba(78,105,211,0.35)]'
                  : darkMode
                    ? 'bg-transparent text-[#F9FAFB] hover:bg-[rgba(255,255,255,0.08)]'
                    : 'bg-transparent text-[#2A2E43] hover:bg-white'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`mt-3 px-4 py-3 rounded-[10px] border ${
          darkMode ? 'bg-[#0f1438] border-[rgba(255,255,255,0.10)]' : 'bg-[#f8fbff] border-[rgba(15,60,95,0.10)]'
        }`}
        style={{ zoom: parseFloat(FONT_SCALES[fontSize]) }}
      >
        <span className={`block text-[15px] font-medium m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
          Aa — This is how the app text will look.
        </span>
      </div>
    </div>
  )
}
