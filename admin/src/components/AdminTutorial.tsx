import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { driver } from "driver.js";
import type { Driver } from "driver.js";
import { useLocation, useNavigate } from "react-router-dom";
import "driver.js/dist/driver.css";

const steps = [
  {
    path: "/dashboard",
    target: "admin-dashboard-nav",
    title: "Administrator Dashboard",
    description: "Review account and match totals, recent participation, bans, and the saved solo leaderboard.",
    side: "bottom" as const,
  },
  {
    path: "/dashboard",
    target: "admin-users-nav",
    title: "User Management",
    description: "Search accounts, update eligible user roles or tiers, reset stats, and manage account access.",
    side: "bottom" as const,
  },
  {
    path: "/dashboard",
    target: "admin-leaderboard-nav",
    title: "Leaderboard",
    description: "Review the saved leaderboard, including tier-filtered rankings.",
    side: "bottom" as const,
  },
  {
    path: "/dashboard",
    target: "admin-logs-nav",
    title: "Activity Logs",
    description: "Inspect recorded administrator actions and their targets.",
    side: "bottom" as const,
  },
];

const AdminTutorialContext = createContext<() => void>(() => {});

export function AdminTutorialButton() {
  const start = useContext(AdminTutorialContext);
  return (
    <button
      type="button"
      onClick={start}
      className="whitespace-nowrap rounded border border-blue-500/60 px-3 py-2 text-sm text-blue-200 transition hover:bg-blue-900/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
    >
      Help / Tutorial
    </button>
  );
}

export function AdminTutorialProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const driverRef = useRef<Driver | null>(null);

  const destroy = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = null;
  }, []);

  const start = useCallback(() => {
    destroy();
    setStepIndex(0);
  }, [destroy]);

  useEffect(() => {
    if (stepIndex === null) {
      destroy();
      return;
    }
    const step = steps[stepIndex];
    if (!step) {
      setStepIndex(null);
      return;
    }
    if (location.pathname !== step.path) {
      destroy();
      navigate(step.path);
      return;
    }

    let active = true;
    let observer: MutationObserver | undefined;
    let timeout: number | undefined;
    const selector = `[data-tour="${step.target}"]`;
    const show = () => {
      if (!active) return;
      const target = document.querySelector(selector);
      if (!target) return;
      observer?.disconnect();
      if (timeout !== undefined) window.clearTimeout(timeout);

      const move = (next: number) => {
        destroy();
        setStepIndex(next >= steps.length ? null : next);
      };
      const instance = driver({
        animate: true,
        duration: 350,
        overlayColor: "#050817",
        overlayOpacity: 0.78,
        smoothScroll: true,
        scrollIntoView: { block: "center", inline: "nearest" },
        allowClose: false,
        allowScroll: true,
        allowPageInteraction: false,
        allowKeyboardControl: false,
        overlayClickBehavior: "none",
        stagePadding: 8,
        stageRadius: 10,
        popoverClass: "typetiles-tour-popover",
        steps: [{
          element: target,
          popover: {
            title: `<span class="typetiles-tour-progress">Step ${stepIndex + 1} of ${steps.length}</span><span class="typetiles-tour-title">${step.title}</span>`,
            description: step.description,
            side: step.side,
            align: "center",
            showButtons: stepIndex === 0 ? ["next"] : ["previous", "next"],
            nextBtnText: stepIndex === steps.length - 1 ? "Finish" : "Next",
            prevBtnText: "Previous",
            onNextClick: () => move(stepIndex + 1),
            onPrevClick: () => move(stepIndex - 1),
            onPopoverRender: (popover) => {
              const skipButton = document.createElement("button");
              skipButton.type = "button";
              skipButton.className = "driver-popover-btn typetiles-tour-skip";
              skipButton.textContent = "Skip Tour";
              skipButton.addEventListener("click", () => move(steps.length), { once: true });
              popover.footerButtons.prepend(skipButton);
            },
          },
        }],
      });
      driverRef.current = instance;
      instance.drive();
    };

    show();
    if (!document.querySelector(selector)) {
      observer = new MutationObserver(show);
      observer.observe(document.body, { childList: true, subtree: true });
      timeout = window.setTimeout(() => {
        observer?.disconnect();
        if (active) {
          console.error(`Administrator tutorial target not found: ${step.target}`);
          setStepIndex(null);
        }
      }, 5000);
    }
    return () => {
      active = false;
      observer?.disconnect();
      if (timeout !== undefined) window.clearTimeout(timeout);
      destroy();
    };
  }, [destroy, location.pathname, navigate, stepIndex]);

  return <AdminTutorialContext.Provider value={start}>{children}</AdminTutorialContext.Provider>;
}
