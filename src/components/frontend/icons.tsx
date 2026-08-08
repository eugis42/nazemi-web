export function CalendarIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect height="15" rx="2" stroke="currentColor" strokeWidth="2" width="16" x="4" y="5" />
      <path d="M4 10h16" stroke="currentColor" strokeWidth="2" />
      <path d="M8 3.5v3.5M16 3.5v3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

export function ClockIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 8v4.5l2.5 1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export function PinIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export function FileTextIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
      <path d="M9 9l1 0" />
      <path d="M9 13l6 0" />
      <path d="M9 17l6 0" />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M16.625 17.5L13.1812 13.875M15.0417 9.16667C15.0417 12.8486 12.2061 15.8333 8.70833 15.8333C5.21053 15.8333 2.375 12.8486 2.375 9.16667C2.375 5.48477 5.21053 2.5 8.70833 2.5C12.2061 2.5 15.0417 5.48477 15.0417 9.16667Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export function CaretDownIcon() {
  return (
    <svg
      aria-hidden="true"
      className="nav-item-caret hidden lg:block"
      fill="none"
      height="6"
      viewBox="0 0 10 6"
      width="10"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 1.25 5 4.75 9 1.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function CaretRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="nav-item-caret lg:hidden"
      fill="none"
      height="10"
      viewBox="0 0 6 10"
      width="6"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.25 1 4.75 5 1.25 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}
