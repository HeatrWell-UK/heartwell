/**
 * The alcove from the photos with nothing in it, in gold line: for pages that
 * have lost what they were looking for (page not found, something went wrong).
 */
export function EmptyAlcove({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" width="120" height="96" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path d="M24 88V44a36 36 0 0 1 72 0v44z" fill="#4A0D17" fillOpacity="0.07" />
      <path d="M24 88V44a36 36 0 0 1 72 0v44" stroke="#B58A2F" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M31 88V45a29 29 0 0 1 58 0v43" stroke="#B58A2F" strokeOpacity="0.45" strokeWidth="1.25" />
      <path d="M6 88h108" stroke="#CDBFC1" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
