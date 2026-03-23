/**
 * Welcome fits in one viewport: cancel outer content padding vertically so height math matches the pane.
 * Mobile: ~2× header bars; desktop: one header (sidebar is beside main).
 */
export default function WelcomeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-7rem)] max-h-[calc(100dvh-7rem)] min-h-0 flex-col overflow-hidden px-3 sm:-mx-6 sm:-my-8 sm:px-4 lg:-mx-8 lg:-my-8 lg:h-[calc(100dvh-3.5rem)] lg:max-h-[calc(100dvh-3.5rem)] lg:px-6">
      {children}
    </div>
  );
}
