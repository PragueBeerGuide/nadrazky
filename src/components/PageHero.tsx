import { RailTrack } from "./RailTrack";

/** Sign-blue page header with the rail-track divider under it. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <>
      <section className="bg-sign px-4 pt-8 pb-8 text-white md:px-6 md:pt-12 md:pb-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="text-5xl md:text-[64px]">{title}</h1>
          {subtitle && <p className="max-w-2xl text-lg text-sign-mist">{subtitle}</p>}
          {children}
        </div>
      </section>
      <RailTrack />
    </>
  );
}
