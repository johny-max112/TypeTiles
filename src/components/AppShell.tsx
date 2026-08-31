import { Menu, Trophy, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import homeIcon from "../assets/homeicon/home.png";
import { HudBackground } from "./HudBackground";

const navItems = [
  { label: "Home", to: "/app", icon: homeIcon, iconClassName: "h-5 w-5", end: true },
  { label: "Multiplayer", to: "/app/lobby", icon: "/figma/type-tiles-home/image33.png", iconClassName: "h-5 w-5" },
  { label: "Results", to: "/app/results", icon: Trophy, iconClassName: "h-5 w-5" },
  { label: "Profile", to: "/app/settings", icon: "/figma/type-tiles-home/image31.png", iconClassName: "h-5 w-5" },
] as const;

function NavIcon({ icon, iconClassName }: { icon: (typeof navItems)[number]["icon"]; iconClassName: string }) {
  if (typeof icon === "string") {
    return <img alt="" className={iconClassName} src={icon} />;
  }

  const Icon = icon;
  return <Icon className={iconClassName} />;
}

export function AppShell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative h-screen overflow-hidden text-slate-100">
      <HudBackground />
      <div className="mx-auto flex h-full min-h-0 max-w-[1600px] gap-4 p-4 lg:gap-6 lg:p-4">
        <aside
          className={`fixed inset-y-4 left-4 z-40 w-[17rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#141a3a]/95 p-5 shadow-[0_28px_60px_rgba(4,8,25,0.55)] backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-[115%] lg:translate-x-0"}`}
        >
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-start gap-2">
                <div className="flex flex-col leading-none">
                  <div className="font-['Concert_One'] text-[2rem] tracking-[0.1em] text-white">TYPE</div>
                  <div className="font-['Concert_One'] text-[2rem] tracking-[0.1em] text-sky-400">TILES</div>
                </div>
                <img alt="" className="mt-1 h-9 w-9 shrink-0" src="/figma/type-tiles-home/group4.png" />
              </div>
              <img alt="" className="mt-4 h-[1px] w-28 opacity-70" src="/figma/type-tiles-home/line1.png" />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/10 p-2 text-white/70 lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={Boolean((item as any).end)}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-[0.55rem] px-3 py-3 text-sm font-semibold transition",
                    isActive
                      ? "bg-[#233f9d] text-white shadow-[0_12px_30px_rgba(13,43,124,0.45)]"
                      : "text-white/92 hover:bg-white/8 hover:text-white",
                  ].join(" ")
                }
              >
                <NavIcon icon={item.icon} iconClassName={item.iconClassName} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:pl-0">
          <header className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-[#141a3a]/90 px-4 py-3 shadow-[0_24px_50px_rgba(4,8,25,0.35)] backdrop-blur-xl lg:hidden">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-100"
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>
            <div className="text-xs uppercase tracking-[0.3em] text-sky-300">Type Tiles</div>
          </header>

          <main className="relative min-h-0 flex-1 overflow-hidden"><Outlet /></main>
        </div>
      </div>
    </div>
  );
}