import {
  BarChart3,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const highlights = [
  {
    icon: LayoutDashboard,
    title: "Unified dashboard",
    description: "Fees, attendance, exams, and payroll in one workspace.",
  },
  {
    icon: Users,
    title: "Built for your team",
    description: "Roles for principals, admins, teachers, and auditors.",
  },
  {
    icon: ShieldCheck,
    title: "Secure access",
    description: "Sign in safely with your school email and password.",
  },
];

export function AuthBrandingPanel({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-slate-900 px-6 py-10 text-primary-foreground lg:hidden">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur-sm">
            <GraduationCap className="h-8 w-8" strokeWidth={1.75} />
          </div>
          <h1 className="text-balance text-2xl font-bold tracking-tight">School Management</h1>
          <p className="mt-2 max-w-sm text-sm text-primary-foreground/85">
            Run your school operations with clarity and confidence.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-slate-800 to-slate-950 p-10 text-primary-foreground lg:flex lg:w-[min(44vw,520px)] xl:p-14">
      {/* Decorative orbs */}
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-sky-400/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-20 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10">
        <div className="mb-10 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary-foreground/90 ring-1 ring-white/15 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Education suite
        </div>

        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-xl ring-1 ring-white/25 backdrop-blur-md">
          <GraduationCap className="h-9 w-9" strokeWidth={1.75} />
        </div>

        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight xl:text-[2.75rem]">
          Welcome to
          <span className="mt-1 block text-white/95">School Management</span>
        </h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-primary-foreground/85">
          A calm, modern workspace for academics, finance, and daily school operations.
        </p>
      </div>

      <ul className="relative z-10 mt-12 space-y-5">
        {highlights.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
              <Icon className="h-5 w-5 text-white/95" strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-semibold text-white">{title}</p>
              <p className="mt-0.5 text-sm leading-snug text-primary-foreground/75">{description}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="relative z-10 mt-12 flex items-center gap-2 text-sm text-primary-foreground/65">
        <BarChart3 className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        <span>Trusted for day-to-day school administration</span>
      </div>
    </div>
  );
}
