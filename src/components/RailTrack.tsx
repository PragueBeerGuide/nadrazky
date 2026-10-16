/** Rails and sleepers: the divider under blue sign-coloured sections. */
export function RailTrack({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`track ${className}`} />;
}
