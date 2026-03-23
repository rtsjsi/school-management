import { GraduationCap, LayoutDashboard, ShieldCheck, Users } from "lucide-react";

const highlights = [
  {
    icon: LayoutDashboard,
    title: "Unified dashboard",
    description: "Fees, attendance, exams, and payroll in one place.",
  },
  {
    icon: Users,
    title: "Built for your team",
    description: "Principals, admins, teachers, and auditors.",
  },
  {
    icon: ShieldCheck,
    title: "Secure access",
    description: "Sign in with your school email.",
  },
];

export function AuthBrandingPanel({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary via-primary to-slate-900 px-4 py-4 text-primary-foreground lg:hidden">
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-md ring-1 ring-white/20 backdrop-blur-sm">
            <GraduationCap className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 text-left">
            <h1 className="text-lg font-bold leading-tight tracking-tight">School Management</h1>
            <p className="text-xs text-primary-foreground/80">Sign in to continue</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative hidden h-dvh max-h-dvh shrink-0 flex-col justify-center gap-6 overflow-hidden bg-gradient-to-br from-primary via-slate-800 to-slate-950 p-8 text-primary-foreground lg:flex lg:w-[min(40vw,440px)] xl:p-9">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur-md">
          <GraduationCap className="h-7 w-7" strokeWidth={1.75} />
        </div>
        <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight xl:text-3xl">
          School Management
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-snug text-primary-foreground/80">
          Academics, finance, and daily operations in one workspace.
        </p>
      </div>

      <ul className="relative z-10 space-y-3">
        {highlights.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
              <Icon className="h-4 w-4 text-white/95" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-xs leading-snug text-primary-foreground/70">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
