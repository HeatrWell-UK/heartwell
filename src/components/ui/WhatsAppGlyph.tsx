/** The recognisable green WhatsApp mark, used inside outline buttons. Decorative. */
export function WhatsAppGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#25D366" d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5z" />
      <path
        fill="#FFFFFF"
        d="M9.1 7.6c-.2-.5-.4-.5-.6-.5h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.9 4.5 4 2.2.9 2.7.7 3.2.7s1.6-.7 1.8-1.3c.2-.6.2-1.2.2-1.3l-.4-.3-1.9-.9c-.3-.1-.5-.1-.6.1l-.9 1.1c-.2.2-.3.2-.6.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.9-2.1z"
      />
    </svg>
  )
}
