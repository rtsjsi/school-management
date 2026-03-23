/**
 * Welcome: scroll here if content is tall; inner cards stay content-height. Cancels outer content padding.
 */
export default function WelcomeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="-mx-4 -my-6 max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain px-3 sm:-mx-6 sm:-my-8 sm:px-4 lg:-mx-8 lg:-my-8 lg:max-h-[calc(100dvh-3.5rem)] lg:px-6">
      {children}
    </div>
  );
}
