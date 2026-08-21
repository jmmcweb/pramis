'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  IdCard,
  ImagePlus,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import { useSignup } from '@/store/useSignup'

const PHILIPPINE_IDS = [
  { name: 'National ID (PhilSys ID)', note: 'PhilSys' },
  { name: 'UMID / Unified Multi-Purpose ID', note: 'SSS · GSIS' },
  { name: "Driver's License", note: 'LTO' },
  { name: 'Passport', note: 'DFA' },
  { name: 'SSS ID', note: 'Social Security System' },
  { name: 'GSIS e-Card', note: 'Government Service Insurance System' },
  { name: 'PhilHealth ID', note: 'Philippine Health Insurance' },
  { name: 'PRC ID', note: 'Professional Regulation Commission' },
  { name: 'Postal ID', note: 'PhilPost' },
  { name: "Voter's ID", note: 'COMELEC' },
  { name: 'TIN ID', note: 'BIR' },
  { name: 'Senior Citizen ID', note: 'OSCA' },
  { name: 'PWD ID', note: 'Persons with Disability' },
  { name: 'NBI Clearance', note: 'National Bureau of Investigation' },
  { name: 'Police Clearance', note: 'Philippine National Police' },
  { name: 'Barangay ID', note: 'Barangay Clearance' },
  { name: 'School ID', note: 'Student identification' },
  { name: 'Company / Employee ID', note: 'Work identification' },
]

type PhotoStatus = 'ok' | 'blurry' | 'small' | 'error'

type Assessment = { ok: boolean; status: PhotoStatus; message: string }

const evaluateImage = (src: string) =>
  new Promise<Assessment>((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, 1000 / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve({ ok: false, status: 'error', message: 'We could not inspect this photo. Please try again.' })
        ctx.drawImage(img, 0, 0, w, h)
        const { data } = ctx.getImageData(0, 0, w, h)
        const gray = new Float32Array(w * h)
        for (let i = 0; i < gray.length; i++) {
          gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
        }

        if (Math.min(img.width, img.height) < 600) {
          return resolve({
            ok: false,
            status: 'small',
            message: 'Photo resolution is too low. Use a clearer, higher-quality photo (at least 600px).',
          })
        }

        let sum = 0
        let sumSq = 0
        let count = 0
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x
            const lap =
              gray[idx - w] + gray[idx + w] + gray[idx - 1] + gray[idx + 1] - 4 * gray[idx]
            sum += lap
            sumSq += lap * lap
            count++
          }
        }
        const mean = sum / count
        const variance = sumSq / count - mean * mean

        if (variance < 90) {
          return resolve({
            ok: false,
            status: 'blurry',
            message:
              'Photo is not clear. Please retake it in good lighting, keep the ID steady, and make sure all details are readable.',
          })
        }

        resolve({ ok: true, status: 'ok', message: 'Photo looks clear and readable.' })
      } catch {
        resolve({ ok: false, status: 'error', message: 'We could not inspect this photo. Please try again.' })
      }
    }
    img.onerror = () =>
      resolve({ ok: false, status: 'error', message: 'We could not read this file. Please use a valid image.' })
    img.src = src
  })

const StepHeading = ({ number, label, required }: { number: number; label: string; required?: boolean }) => (
  <div className="flex items-center gap-2.5">
    <span className="w-6 h-6 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center shrink-0">
      {number}
    </span>
    <span className="auth-label m-0">
      {label}
      {required && <span className="text-brand"> *</span>}
    </span>
  </div>
)

const Identification = () => {
  const setIdentification = useSignup((state) => state.setIdentification)
  const { push } = useRouter()

  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [idType, setIdType] = useState('')
  const [idTypeError, setIdTypeError] = useState('')
  const [idOpen, setIdOpen] = useState(false)

  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [assessing, setAssessing] = useState(false)

  const [pendingPhoto, setPendingPhoto] = useState('')
  const [pendingStatus, setPendingStatus] = useState<Assessment | null>(null)

  const [photo, setPhoto] = useState('')
  const [photoError, setPhotoError] = useState('')

  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  const startCamera = async () => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported on this device. You can still upload a photo.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      setCameraOn(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 50)
    } catch {
      setCameraError('Unable to access the camera. Please allow camera permission or upload a photo instead.')
    }
  }

  const captureFrame = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    stopCamera()
    void assessPhoto(canvas.toDataURL('image/jpeg', 0.92))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => void assessPhoto(String(reader.result))
    reader.readAsDataURL(file)
  }

  const assessPhoto = async (src: string) => {
    setAssessing(true)
    const result = await evaluateImage(src)
    setAssessing(false)
    setPendingPhoto(src)
    setPendingStatus(result)
    setPhotoError('')
    setSubmitError('')
    if (result.ok) {
      setPhoto(src)
      setPendingPhoto('')
      setPendingStatus(null)
    }
  }

  const retake = () => {
    setPendingPhoto('')
    setPendingStatus(null)
    setPhotoError('')
  }

  const replacePhoto = () => {
    retake()
    setPhoto('')
  }

  const handleContinue = () => {
    let hasError = false
    if (!idType) {
      setIdTypeError('Select the ID you will upload.')
      hasError = true
    } else {
      setIdTypeError('')
    }
    if (!photo) {
      setSubmitError('Please capture a clear photo of your ID.')
      hasError = true
    } else {
      setSubmitError('')
    }
    if (hasError) return

    setIdentification({ idType, idPhoto: photo })
    push('/verification')
  }

  const secondaryAction = (onClick: () => void, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-mist/60 text-[13px] font-semibold text-ink cursor-pointer hover:bg-mist transition-colors"
    >
      {icon}
      {label}
    </button>
  )

  return (
    <AuthShell
      step={4}
      animate={false}
      title="Identification"
      cardClassName="lg:max-w-2xl"
      subtitle="Select a valid Philippine ID and capture a clear photo of it."
      backHref="/confirmation"
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col gap-2.5 mb-6">
        <StepHeading number={1} label="Choose your valid ID" required />
        <div className="relative">
          <button
            type="button"
            onClick={() => setIdOpen((v) => !v)}
            className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-lg border bg-white text-left cursor-pointer transition-colors ${
              idTypeError
                ? 'border-rose-500'
                : idType
                  ? 'border-brand'
                  : 'border-line hover:border-brand/50'
            }`}
          >
            <IdCard size={16} className={`shrink-0 ${idType ? 'text-brand' : 'text-slate'}`} />
            <span
              className={`flex-1 min-w-0 text-[13.5px] truncate ${
                idType ? 'text-ink font-medium' : 'text-slate'
              }`}
            >
              {idType || 'Select your valid ID'}
            </span>
            <span className="text-[11px] text-slate truncate hidden sm:block">
              {idType ? PHILIPPINE_IDS.find((id) => id.name === idType)?.note : '18 options'}
            </span>
            <ChevronDown
              size={16}
              className={`text-slate shrink-0 transition-transform duration-200 ${idOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {idOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIdOpen(false)} />
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-line rounded-xl shadow-xl overflow-hidden animate-[auth-rise_150ms_ease-out]">
                <div className="max-h-[264px] overflow-y-auto py-1.5">
                  {PHILIPPINE_IDS.map((id) => {
                    const selected = idType === id.name
                    return (
                      <button
                        key={id.name}
                        type="button"
                        onClick={() => {
                          setIdType(id.name)
                          setIdTypeError('')
                          setIdOpen(false)
                        }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left cursor-pointer transition-colors ${
                          selected ? 'bg-brand/5' : 'hover:bg-mist/60'
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-[13px] leading-snug truncate ${
                              selected ? 'text-brand font-semibold' : 'text-ink'
                            }`}
                          >
                            {id.name}
                          </span>
                          <span className="block text-[11px] text-slate truncate">{id.note}</span>
                        </span>
                        {selected && (
                          <Check size={15} strokeWidth={3} className="text-brand shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
        {idTypeError && <p className="error">{idTypeError}</p>}
      </div>

      <div className="flex flex-col gap-2.5 mb-1">
        <StepHeading number={2} label="Capture a clear photo of your ID" required />

        <div className="flex flex-col gap-2.5">
          {assessing && (
            <div className="flex items-center justify-center gap-2.5 py-9 rounded-2xl bg-mist/50">
              <Loader2 size={19} className="text-brand animate-spin" />
              <span className="text-[13px] text-slate">Checking photo clarity…</span>
            </div>
          )}

          {!assessing && photo && (
            <div className="flex flex-col gap-2.5">
              <div className="rounded-xl overflow-hidden border border-line bg-black/5 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt="Preview of your ID"
                  className="w-full max-h-[240px] object-contain rounded-lg"
                />
              </div>
              <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[12px] font-semibold">
                <CheckCircle2 size={13} />
                {pendingStatus?.message ?? 'Photo looks clear and readable.'}
              </span>
              <div className="flex gap-2.5">
                {secondaryAction(() => fileRef.current?.click(), 'Upload another', <ImagePlus size={15} />)}
                {secondaryAction(
                  () => {
                    replacePhoto()
                    void startCamera()
                  },
                  'Retake',
                  <RefreshCw size={15} />,
                )}
              </div>
            </div>
          )}

          {!assessing && !photo && pendingPhoto && pendingStatus && !pendingStatus.ok && (
            <div className="flex flex-col gap-2.5">
              <div className="rounded-xl overflow-hidden border border-line bg-black/5 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingPhoto}
                  alt="Review of your ID capture"
                  className="w-full max-h-[240px] object-contain rounded-lg"
                />
              </div>
              <span className="inline-flex items-start gap-1.5 self-start px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-[12px] font-medium leading-snug max-w-full">
                <AlertTriangle size={13} className="shrink-0 mt-px" />
                {pendingStatus.message}
              </span>
              <div className="flex gap-2.5">
                {secondaryAction(() => fileRef.current?.click(), 'Upload another', <ImagePlus size={15} />)}
                {secondaryAction(
                  () => {
                    retake()
                    void startCamera()
                  },
                  'Retake',
                  <RefreshCw size={15} />,
                )}
              </div>
            </div>
          )}

          {!assessing && !photo && !pendingPhoto && cameraOn && (
            <div className="flex flex-col gap-2.5">
              <div className="relative rounded-xl overflow-hidden border border-line bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full max-h-[260px] object-contain"
                />
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={captureFrame}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-white text-[13px] font-semibold cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <Camera size={15} />
                  Capture photo
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-mist/60 text-[13px] font-semibold text-ink cursor-pointer hover:bg-mist transition-colors"
                >
                  <X size={15} />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!assessing && !photo && !pendingPhoto && !cameraOn && (
            <>
              <button
                type="button"
                onClick={() => void startCamera()}
                className="group w-full flex flex-col items-center gap-2.5 px-6 py-8 rounded-2xl border-2 border-dashed border-brand/30 bg-brand/5 cursor-pointer hover:border-brand/60 hover:bg-brand/10 transition-colors"
              >
                <span className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-brand group-hover:scale-105 transition-transform duration-200">
                  <Camera size={21} />
                </span>
                <span className="text-[14px] font-semibold text-ink">Take a photo of your ID</span>
                <span className="text-[12px] text-slate">Uses your device camera</span>
              </button>

              <div className="flex items-center gap-3">
                <span className="flex-1 h-px bg-line" />
                <span className="text-[11px] uppercase tracking-[0.12em] text-slate">or</span>
                <span className="flex-1 h-px bg-line" />
              </div>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-line bg-white text-[13px] font-semibold text-ink cursor-pointer hover:border-brand hover:text-brand transition-colors"
              >
                <ImagePlus size={15} />
                Upload from device
              </button>

              {cameraError && (
                <span className="inline-flex items-start gap-1.5 self-start px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-[12px] font-medium leading-snug max-w-full">
                  <AlertTriangle size={13} className="shrink-0 mt-px" />
                  {cameraError}
                </span>
              )}

              <div className="rounded-xl bg-mist/40 px-4 py-3 flex flex-col gap-1.5">
                {[
                  'Place your ID on a flat surface with good lighting.',
                  'Keep the whole ID inside the frame with all details readable.',
                  'Avoid glare, shadows, blur, and covering the ID with your fingers.',
                ].map((tip) => (
                  <p key={tip} className="flex items-start gap-2 text-[12px] text-slate m-0">
                    <Check size={12} className="text-brand shrink-0 mt-0.5" strokeWidth={3} />
                    {tip}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
        {photoError && <p className="error">{photoError}</p>}
      </div>

      {submitError && (
        <p className="flex items-start gap-1.5 text-[12.5px] text-rose-600 m-0 -mt-2">
          <AlertTriangle size={15} className="shrink-0 mt-px" />
          {submitError}
        </p>
      )}

      <button type="button" onClick={handleContinue} className="btn btn--primary mt-5">
        Continue to verification
      </button>
    </AuthShell>
  )
}

export default Identification
