'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { useDarkMode } from '@/app/staff/DarkModeContext'
import { useProfilePhoto } from '@/app/staff/ProfilePhotoContext'

const profileData = {
  initials: 'EA',
  name: 'Elaine Arceo',
  id: 'MS-0001',
  role: 'Nurse',
  email: 'elaine@meditrack.com',
  phone: '+63 912 345 6789',
  address: '123 Health Street, Barangay San Isidro, Manila',
  department: 'Nursing Services',
  joinDate: 'January 15, 2022',
  education: 'BS in Nursing — University of Santo Tomas',
  license: 'RN-123456',
  emergencyContact: 'Juan Hernandez — +63 917 654 3210',
}

export default function ProfilePage() {
  const { darkMode } = useDarkMode()
  const { photo, setPhoto } = useProfilePhoto()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...profileData })
  const [cropModal, setCropModal] = useState<{ src: string | null } | null>(null)

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleCropSave = (croppedDataUrl: string) => {
    setPhoto(croppedDataUrl)
    setCropModal(null)
    toast.success('Profile photo updated')
  }

  const handleCropCancel = () => {
    setCropModal(null)
  }

  const handleCropRemove = () => {
    setPhoto(null)
    setCropModal(null)
    toast.success('Profile photo removed')
  }

  const handleSave = () => {
    setEditing(false)
    toast.success('Profile updated successfully')
  }

  const handleCancel = () => {
    setForm({ ...profileData })
    setPhoto(null)
    setEditing(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between my-[18px]">
        <h1 className={`text-[30px] sm:text-[38px] lg:text-[45px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'} text-left m-0`}>My Profile</h1>
        {!editing ? (
          <button
            className="flex items-center gap-2 bg-[#4E69D3] text-white px-5 py-2.5 rounded-md text-sm font-semibold border-none cursor-pointer hover:bg-[#3D56B8] transition-colors"
            onClick={() => setEditing(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              className="bg-transparent text-[#4E69D3] border border-[#4E69D3] px-5 py-2.5 rounded-md text-sm font-semibold cursor-pointer hover:bg-[#EEF0FB] transition-colors"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className="bg-[#4E69D3] text-white px-5 py-2.5 rounded-md text-sm font-semibold border-none cursor-pointer hover:bg-[#3D56B8] transition-colors"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-[22px] max-[1100px]:grid-cols-1">
        <div className={`col-span-1 flex flex-col items-center ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-[30px] rounded-[18px] border`}>
          <div className="relative mb-6">
            <div className="w-[200px] h-[200px] rounded-full bg-[#4E69D3] flex items-center justify-center text-white font-bold text-[64px] overflow-hidden">
              {photo ? (
                <img src={photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                form.initials
              )}
            </div>
            <button
              className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-white border-2 border-[#4E69D3] flex items-center justify-center cursor-pointer hover:bg-[#EEF0FB] transition-colors shadow-md"
              onClick={() => setCropModal({ src: photo })}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#4E69D3" strokeWidth="2" className="w-5 h-5">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
          <h2 className={`text-[28px] font-bold mt-3 m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#111]'}`}>{form.name}</h2>
          <span className="text-[15px] font-bold text-[#4E69D3] uppercase tracking-[0.5px] mt-1">{form.id}</span>
          <span className={`text-[17px] mt-1 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#555]'}`}>{form.role}</span>
          <div className={`flex items-center gap-2 mt-4 px-4 py-2 rounded-lg ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4E69D3" strokeWidth="2" className="w-4 h-4">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><path d="M8 21h8" /><path d="M12 17v4" />
            </svg>
            <span className="text-sm font-semibold text-[#4E69D3]">{form.department}</span>
          </div>
        </div>

        <div className="col-span-2 flex flex-col gap-[22px]">
          <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-[22px] rounded-[18px] border`}>
            <h3 className={`text-[22px] font-bold m-0 mb-4 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'}`}>Personal Information</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 max-[700px]:grid-cols-1">
              {editing ? (
                <>
                  <EditField label="Full Name" value={form.name} onChange={v => handleChange('name', v)} darkMode={darkMode} />
                  <EditField label="Employee ID" value={form.id} onChange={v => handleChange('id', v)} darkMode={darkMode} />
                  <EditField label="Email Address" value={form.email} onChange={v => handleChange('email', v)} darkMode={darkMode} />
                  <EditField label="Phone Number" value={form.phone} onChange={v => handleChange('phone', v)} darkMode={darkMode} />
                  <EditField label="Address" value={form.address} onChange={v => handleChange('address', v)} darkMode={darkMode} />
                  <EditField label="Department" value={form.department} onChange={v => handleChange('department', v)} darkMode={darkMode} />
                </>
              ) : (
                <>
                  <InfoField label="Full Name" value={form.name} darkMode={darkMode} />
                  <InfoField label="Employee ID" value={form.id} darkMode={darkMode} />
                  <InfoField label="Email Address" value={form.email} darkMode={darkMode} />
                  <InfoField label="Phone Number" value={form.phone} darkMode={darkMode} />
                  <InfoField label="Address" value={form.address} darkMode={darkMode} />
                  <InfoField label="Department" value={form.department} darkMode={darkMode} />
                </>
              )}
            </div>
          </div>

          <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-[22px] rounded-[18px] border`}>
            <h3 className={`text-[22px] font-bold m-0 mb-4 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'}`}>Professional Details</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 max-[700px]:grid-cols-1">
              {editing ? (
                <>
                  <EditField label="License Number" value={form.license} onChange={v => handleChange('license', v)} darkMode={darkMode} />
                  <EditField label="Education" value={form.education} onChange={v => handleChange('education', v)} darkMode={darkMode} />
                  <EditField label="Date Joined" value={form.joinDate} onChange={v => handleChange('joinDate', v)} darkMode={darkMode} />
                  <EditField label="Emergency Contact" value={form.emergencyContact} onChange={v => handleChange('emergencyContact', v)} darkMode={darkMode} />
                </>
              ) : (
                <>
                  <InfoField label="License Number" value={form.license} darkMode={darkMode} />
                  <InfoField label="Education" value={form.education} darkMode={darkMode} />
                  <InfoField label="Date Joined" value={form.joinDate} darkMode={darkMode} />
                  <InfoField label="Emergency Contact" value={form.emergencyContact} darkMode={darkMode} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {cropModal && (
        <CropModal
          src={cropModal.src}
          darkMode={darkMode}
          onSave={handleCropSave}
          onCancel={handleCropCancel}
          onRemove={handleCropRemove}
        />
      )}
    </div>
  )
}

function CropModal({ src, darkMode, onSave, onCancel, onRemove }: { src: string | null; darkMode: boolean; onSave: (dataUrl: string) => void; onCancel: () => void; onRemove: () => void }) {
  const SIZE = 280
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState<string | null>(src)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const previewRef = useRef<HTMLCanvasElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setImgLoaded(false)
  }, [currentSrc])

  const getScale = () => {
    const img = imgRef.current
    if (!img) return 1
    return Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight) * zoom
  }

  const drawPreview = () => {
    const img = imgRef.current
    const canvas = previewRef.current
    if (!img || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = SIZE
    canvas.height = SIZE
    ctx.clearRect(0, 0, SIZE, SIZE)

    const scale = getScale()
    const drawW = img.naturalWidth * scale
    const drawH = img.naturalHeight * scale
    const drawX = (SIZE - drawW) / 2 + pan.x
    const drawY = (SIZE - drawH) / 2 + pan.y

    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, drawX, drawY, drawW, drawH)
  }

  useEffect(() => {
    if (imgLoaded) drawPreview()
  }, [zoom, pan, imgLoaded])

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    const newPan = {
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    }
    setPan(newPan)
  }

  const handleMouseUp = () => setDragging(false)

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setCurrentSrc(URL.createObjectURL(file))
    if (e.target) e.target.value = ''
  }

  const handleSave = () => {
    const img = imgRef.current
    if (!img) return

    const scale = getScale()
    const drawW = img.naturalWidth * scale
    const drawH = img.naturalHeight * scale
    const drawX = (SIZE - drawW) / 2 + pan.x
    const drawY = (SIZE - drawH) / 2 + pan.y

    const natLeft = (0 - drawX) / scale
    const natTop = (0 - drawY) / scale
    const natSize = SIZE / scale

    const outCanvas = document.createElement('canvas')
    outCanvas.width = 200
    outCanvas.height = 200
    const outCtx = outCanvas.getContext('2d')
    if (!outCtx) return

    outCtx.beginPath()
    outCtx.arc(100, 100, 100, 0, Math.PI * 2)
    outCtx.clip()
    outCtx.drawImage(img, natLeft, natTop, natSize, natSize, 0, 0, 200, 200)

    onSave(outCanvas.toDataURL('image/jpeg', 0.9))
  }

  return (
    <>
      <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4" onClick={onCancel}>
        <div
          className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-[18px] p-4 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] w-full max-w-[400px]`}
          onClick={e => e.stopPropagation()}
        >
          <h3 className={`text-[20px] font-bold m-0 mb-4 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
            {currentSrc ? 'Adjust Photo' : 'Add Photo'}
          </h3>

          {currentSrc ? (
            <>
              <canvas
                ref={previewRef}
                width={SIZE}
                height={SIZE}
                className="block mx-auto mb-4 rounded-full cursor-grab active:cursor-grabbing"
                style={{ width: SIZE, height: SIZE }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              <div className="flex items-center gap-3 px-2 mb-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}>
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={e => { setZoom(Number(e.target.value)) }}
                  className="flex-1 accent-[#4E69D3]"
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}>
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="11" y1="8" x2="11" y2="14" />
                </svg>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`w-16 h-16 ${darkMode ? 'text-gray-500' : 'text-gray-300'}`}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />

          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 bg-[#4E69D3] text-white px-5 py-2.5 rounded-md text-sm font-semibold border-none cursor-pointer hover:bg-[#3D56B8] transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
              {currentSrc ? 'New Photo' : 'Add Photo'}
            </button>
            <button
              className="bg-transparent text-[#4E69D3] border border-[#4E69D3] px-5 py-2.5 rounded-md text-sm font-semibold cursor-pointer hover:bg-[#EEF0FB] transition-colors"
              onClick={onCancel}
            >
              Cancel
            </button>
            {currentSrc && (
              <button
                className="bg-[#4E69D3] text-white px-5 py-2.5 rounded-md text-sm font-semibold border-none cursor-pointer hover:bg-[#3D56B8] transition-colors ml-auto"
                onClick={handleSave}
              >
                Save
              </button>
            )}
          </div>

          {src && (
            <div className={`mt-4 pt-3 border-t flex justify-center ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}>
              <button
                className="flex items-center gap-2 bg-transparent text-red-500 px-4 py-2 rounded-md text-sm font-semibold cursor-pointer hover:bg-red-50 transition-colors"
                onClick={onRemove}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                Remove Photo
              </button>
            </div>
          )}
        </div>
      </div>

      {currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt=""
          className="hidden"
          onLoad={() => setImgLoaded(true)}
        />
      )}
    </>
  )
}

function InfoField({ label, value, darkMode }: { label: string; value: string; darkMode: boolean }) {
  return (
    <div>
      <p className={`text-[12px] font-bold uppercase tracking-[0.5px] m-0 mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-[16px] font-semibold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{value}</p>
    </div>
  )
}

function EditField({ label, value, onChange, darkMode }: { label: string; value: string; onChange: (v: string) => void; darkMode: boolean }) {
  return (
    <div>
      <label className={`text-[12px] font-bold uppercase tracking-[0.5px] m-0 mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-3 py-2 rounded-lg text-[16px] font-semibold outline-none border ${
          darkMode
            ? 'bg-[#0f1438] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] focus:border-[#4E69D3]'
            : 'bg-white text-[#2A2E43] border-gray-200 focus:border-[#4E69D3]'
        } transition-colors`}
      />
    </div>
  )
}
