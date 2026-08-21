// Shared sidebar footer for the Admin, Staff, and User (patient) sidebars.
// Pinned to the bottom of its flex-column parent via `mt-auto`.
export default function SidebarFooter({
  darkMode = false,
  className = '',
}: {
  darkMode?: boolean
  className?: string
}) {
  return (
    <div className={`border-t pt-3 mt-auto ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${className}`}>
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-gray-400 text-base font-medium">&copy;</span>
        <p className="font-poppins text-[15px] text-center text-gray-400">
          Meditrack Developers
        </p>
      </div>
    </div>
  )
}
