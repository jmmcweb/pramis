'use client'

// In-app viewer for a saved ITR. Shows the printed template exactly as it
// appears on paper (adult sheet, or the same sheet with the EPI immunization
// table for children) and prints it through the browser dialog, so what is
// viewed is what gets printed / saved as PDF.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Printer, X, ZoomIn, ZoomOut } from 'lucide-react'
import type { MedicalRecord } from '@/src/data/records'
import { isChildRecord } from '@/src/data/itrChild'
import ItrSheet from '@/components/ui/ItrSheet'

// A4 portrait with no browser margins: the sheet brings its own 9mm padding.
const PRINT_CSS = `
@media print {
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  .itr-print-root, .itr-print-root * { visibility: visible !important; }
  .itr-print-root {
    position: absolute !important;
    inset: 0 auto auto 0;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .itr-no-print { display: none !important; }
  .itr-zoom { zoom: 1 !important; }
  .itr-sheet-page { box-shadow: none !important; break-after: page; }
  .itr-sheet-page:last-child { break-after: auto; }
  @page { size: A4 portrait; margin: 0; }
}
`

// 1mm ≈ 3.7795 CSS px.
const SHEET_WIDTH_PX = 210 * 3.7795

export default function ItrViewerModal({
  record,
  darkMode = false,
  onClose,
}: {
  record: MedicalRecord
  darkMode?: boolean
  onClose: () => void
}) {
  const isChild = isChildRecord(record)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [fit, setFit] = useState(true)

  // Fit the A4 sheet to the viewport width by default.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const compute = () => {
      if (!fit) return
      setScale(Math.min(1, (el.clientWidth - 32) / SHEET_WIDTH_PX))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit])

  // Escape closes, and the body must not scroll behind the overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const bump = (delta: number) => {
    setFit(false)
    setScale((s) => Math.min(2, Math.max(0.3, Number((s + delta).toFixed(2)))))
  }

  const btn =
    'px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer'
  const ghost = darkMode
    ? 'border border-[rgba(255,255,255,0.15)] hover:bg-[#0f1438]'
    : 'border border-gray-200 hover:bg-gray-50'

  return (
    <div
      className="fixed inset-0 z-[1300] overflow-y-auto bg-black/60"
      onClick={onClose}
    >
      <style>{PRINT_CSS}</style>

      <div
        className="itr-print-root mx-auto flex min-h-full w-fit flex-col items-center gap-3 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div
          className={`itr-no-print sticky top-0 z-10 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-2.5 shadow-lg ${
            darkMode
              ? 'bg-[#2d1b4e] text-[#F9FAFB]'
              : 'bg-white text-[#2A2E43]'
          }`}
        >
          <div className="flex flex-col">
            <span className="font-poppins text-[15px] font-bold">
              {isChild
                ? 'Individual Child Treatment Record'
                : 'Individual Adult Treatment Record'}
            </span>
            <span
              className={`text-[12px] ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Record {record.id} &middot; {record.date}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => bump(-0.1)}
              className={`${btn} ${ghost}`}
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setFit((f) => !f)}
              className={`${btn} ${ghost}`}
            >
              {fit ? 'Fit' : `${Math.round(scale * 100)}%`}
            </button>
            <button
              type="button"
              onClick={() => bump(0.1)}
              className={`${btn} ${ghost}`}
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={`${btn} bg-[#4E69D3] text-white hover:bg-[#4A6BC4]`}
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`${btn} ${
                darkMode
                  ? 'bg-[#0f1438] hover:bg-black/40'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <X className="w-4 h-4" aria-hidden="true" />
              Close
            </button>
          </div>
        </div>

        {/* The sheet itself */}
        <div
          ref={scrollRef}
          className="itr-zoom w-full"
          style={{ zoom: scale }}
        >
          <div className="mx-auto w-fit">
            <ItrSheet record={record} isChild={isChild} />
          </div>
        </div>
      </div>
    </div>
  )
}
