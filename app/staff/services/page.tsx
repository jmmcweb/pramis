'use client'
import { useDarkMode } from '@/app/staff/DarkModeContext'

const services = [
  { title: 'Basic Consultation', subtitle: 'Monday to Friday', time: '8:00am - 5:00pm', icon: '👩‍⚕️', desc: 'General medical consultation for patients of all ages. Includes check-ups, diagnosis, and treatment recommendations.' },
  { title: 'Pre-natal Care', subtitle: 'Tuesday', time: '8:00am - 5:00pm', icon: '🤰', desc: 'Comprehensive care for pregnant women including check-ups, nutritional counseling, and monitoring of fetal development.' },
  { title: 'National Immunization Program (NIP)', subtitle: 'Wednesday to Friday', time: '8:00am - 5:00pm', icon: '💉', desc: 'Routine immunization for infants, children, and adults following the national vaccination schedule.' },
  { title: 'Hypertension Detection and Management (HDM)', subtitle: 'Monday to Friday', time: '8:00am - 5:00pm', icon: '🩸', desc: 'Blood pressure screening, monitoring, and treatment for hypertensive patients.' },
  { title: 'Visual Inspection with Acetic Acid (VIA)', subtitle: 'Thursday', time: '8:00am - 5:00pm', icon: '🔬', desc: 'Cervical cancer screening procedure for early detection of abnormalities.' },
  { title: 'Family Planning', subtitle: 'Thursday', time: '8:00am - 5:00pm', icon: '🧬', desc: 'Counseling and services for various family planning methods, reproductive health education, and informed choice.' },
  { title: 'Pills and Condoms', subtitle: 'Monday to Friday', time: '8:00am - 5:00pm', icon: '💊', desc: 'Distribution and counseling on oral contraceptive pills and condoms for safe and responsible family planning.' },
  { title: 'Adolescent Health and Development Program', subtitle: 'Saturday', time: '8:00am - 12:00pm', icon: '🧑', desc: 'Health services and education tailored for adolescents including reproductive health, mental health, and life skills.' },
]

const majorServices = [
  { title: 'Diabetes Management', icon: '🩺', desc: 'Blood sugar screening, monitoring, medication, and lifestyle counseling for diabetic patients.' },
  { title: 'Hypertension Control', icon: '❤️', desc: 'Regular blood pressure monitoring, maintenance medication, and dietary guidance for hypertensive patients.' },
  { title: 'TB Control Program', icon: '🔬', desc: 'Tuberculosis screening, diagnosis, directly observed therapy (DOTS), and patient support.' },
  { title: 'Cancer Screening', icon: '🎗️', desc: 'Early detection services including breast examination, cervical cancer screening, and health education.' },
  { title: 'Nutrition Program', icon: '🥗', desc: 'Nutritional assessment, supplementation, and counseling for children, pregnant women, and malnourished patients.' },
  { title: 'Mental Health Services', icon: '🧠', desc: 'Counseling, psychological support, and referral for patients experiencing mental health concerns.' },
  { title: 'Dental Care', icon: '🦷', desc: 'Basic dental services including check-ups, extractions, cleaning, and oral health education.' },
  { title: 'Wound Care & Minor Surgery', icon: '🏥', desc: 'Treatment of minor wounds, suturing, abscess drainage, and basic surgical procedures.' },
]

export default function ServicesPage() {
  const { darkMode } = useDarkMode()
  return (
    <div>
      <h1 className={`text-[30px] sm:text-[38px] lg:text-[45px] my-[14px] text-left ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'}`}>Services</h1>

      <div className={`p-4 rounded-[24px] ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.08)]'} shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]`}>
        <div className="grid grid-cols-3 gap-[22px] max-[1100px]:grid-cols-2 max-[768px]:grid-cols-1">
          {services.map((s, i) => (
            <div key={i} className={`flex flex-col p-[22px] rounded-[18px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] ${darkMode ? 'bg-[#2d1b4e] border border-[rgba(255,255,255,0.10)]' : 'bg-white border border-[rgba(15,60,95,0.10)]'}`}>
              <div className="flex gap-4 items-start">
                <div className="text-2xl mt-1">{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-[20px] font-bold leading-tight m-0 line-clamp-2 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#111]'}`}>{s.title}</h3>
                </div>
              </div>
              <p className={`text-[13px] leading-relaxed m-0 mt-[16px] line-clamp-2 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#555]'}`}>{s.desc}</p>
              <div className={`flex flex-col gap-1 text-[16px] font-semibold mt-[16px] pt-[14px] border-t ${darkMode ? 'text-[#F9FAFB] border-[rgba(255,255,255,0.10)]' : 'text-[#111] border-[rgba(15,60,95,0.08)]'}`}>
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[16px] h-[16px] flex-shrink-0"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  {s.subtitle}
                </div>
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[16px] h-[16px] flex-shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  {s.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 className={`text-[35px] my-[28px] text-left ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'}`}>Major Services</h2>

      <div className={`mb-5 pt-2.5 px-4 pb-4 rounded-[14px] flex items-start gap-3 shadow-sm ${darkMode ? 'bg-[#1a1a4e] border-l-4 border-[#4E69D3]' : 'bg-gradient-to-r from-[#EEF0FB] to-white border-l-4 border-[#4E69D3]'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${darkMode ? 'bg-[#4E69D3]' : 'bg-[#4E69D3]'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        </div>
        <div className="pt-0.5">
          <p className={`text-[20px] font-semibold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'}`}>RHU-Exclusive Services</p>
          <p className={`text-[17px] m-0 mt-1 leading-relaxed ${darkMode ? 'text-[#cbd5e1]' : 'text-[#4a5568]'}`}>These major services are exclusively available at Rural Health Units (RHUs) and are not offered here in our Barangay Sumapang Matanda Health Center.</p>
        </div>
      </div>

      <div className={`p-4 rounded-[24px] ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.08)]'} shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]`}>
        <div className="grid grid-cols-3 gap-[22px] max-[1100px]:grid-cols-2 max-[768px]:grid-cols-1">
          {majorServices.map((s, i) => (
            <div key={i} className={`flex flex-col p-[22px] rounded-[18px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] ${darkMode ? 'bg-[#2d1b4e] border border-[rgba(255,255,255,0.10)]' : 'bg-white border border-[rgba(15,60,95,0.10)]'}`}>
              <div className="flex gap-4 items-start">
                <div className="text-2xl mt-1">{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-[20px] font-bold leading-tight m-0 line-clamp-2 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#111]'}`}>{s.title}</h3>
                </div>
              </div>
              <p className={`text-[13px] leading-relaxed m-0 mt-[16px] line-clamp-2 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#555]'}`}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
