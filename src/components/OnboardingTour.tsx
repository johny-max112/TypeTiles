import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { driver } from "driver.js";
import type { Driver } from "driver.js";
import { useLocation, useNavigate } from "react-router-dom";
import { usePlayerAuth } from "../lib/PlayerAuthContext";
import type { OnboardingStatus } from "../lib/playerApi";
import { onboardingTours, type TutorialRole } from "../lib/onboardingTours";
import "driver.js/dist/driver.css";

type TourState = { role: TutorialRole; index: number } | null;
type StoredTourState = { status?: "completed" | "skipped"; step?: number };

const storageKey = (userId: number) => `typetiles:onboarding:v1:${userId}`;
const TutorialContext = createContext<() => void>(() => {});

function readStoredState(userId: number): StoredTourState | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as StoredTourState;
    return {
      ...(value.status === "completed" || value.status === "skipped" ? { status: value.status } : {}),
      ...(Number.isInteger(value.step) && value.step! >= 0 ? { step: value.step } : {}),
    };
  } catch (error) {
    console.warn("Unable to read saved tutorial progress.", error);
    return null;
  }
}

function writeStoredState(userId: number, value: StoredTourState): boolean {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("Unable to save local tutorial progress.", error);
    return false;
  }
}

function removeStoredState(userId: number) {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch (error) {
    console.warn("Unable to clear local tutorial progress.", error);
  }
}

export function TutorialHelpButton() {
  const startTour = useContext(TutorialContext);
  return (
    <button
      type="button"
      data-tour="help-tutorial"
      onClick={startTour}
      className="shrink-0 rounded-lg border border-sky-300/50 bg-[#141a3a] px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-[#233f9d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
    >
      Help / Tutorial
    </button>
  );
}

export function OnboardingHost({ children }: { children: ReactNode }) {
  const { user, updateOnboardingStatus } = usePlayerAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tour, setTour] = useState<TourState>(null);
  const [notice, setNotice] = useState("");
  const driverRef = useRef<Driver | null>(null);
  const autoAttemptedFor = useRef<number | null>(null);
  const currentUserId = user?.id;

  const destroyDriver = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = null;
  }, []);

  const startTour = useCallback(() => {
    if (!user || (user.role !== "student" && user.role !== "teacher")) return;
    setNotice("");
    removeStoredState(user.id);
    setTour({ role: user.role, index: 0 });
  }, [user]);

  const finishTour = useCallback(async (status: "completed" | "skipped") => {
    destroyDriver();
    setTour(null);
    if (!currentUserId) return;

    try {
      const savedStatus: OnboardingStatus | null = await updateOnboardingStatus(status);
      if (savedStatus) {
        writeStoredState(currentUserId, { status });
        setNotice("");
        return;
      }
      removeStoredState(currentUserId);
    } catch (error) {
      const locallySaved = writeStoredState(currentUserId, { status });
      setNotice(locallySaved
        ? "The tour closed, but its completion could not be saved to your account. It will stay dismissed on this browser."
        : "The tour closed, but its completion could not be saved. You can continue using Type Tiles; it may appear again later.");
      console.error("Unable to persist tutorial completion.", error);
    }
  }, [currentUserId, destroyDriver, updateOnboardingStatus]);

  useEffect(() => {
    if (!user || (user.role !== "student" && user.role !== "teacher")) {
      autoAttemptedFor.current = null;
      return;
    }
    if (autoAttemptedFor.current === user.id) return;
    autoAttemptedFor.current = user.id;
    if (user.onboardingStatus !== "eligible") return;

    const steps = onboardingTours[user.role];
    const saved = readStoredState(user.id);
    if (saved?.status === "completed" || saved?.status === "skipped") return;
    const resumeAt = saved?.step ?? 0;
    setTour({ role: user.role, index: Math.min(resumeAt, steps.length - 1) });
  }, [user?.id, user?.role, user?.onboardingStatus]);

  useEffect(() => {
    if (!tour || !currentUserId) {
      destroyDriver();
      return;
    }
    const steps = onboardingTours[tour.role];
    const step = steps[tour.index];
    if (!step) {
      void finishTour("completed");
      return;
    }
    if (location.pathname !== step.path) {
      destroyDriver();
      navigate(step.path);
      return;
    }

    let active = true;
    let observer: MutationObserver | undefined;
    let timeout: number | undefined;
    const targetName = (step.target === "main-navigation" || step.target === "profile-nav") && window.innerWidth < 1024
      ? "mobile-menu"
      : step.target;
    const selector = `[data-tour="${targetName}"]`;
    const show = () => {
      if (!active) return;
      const target = document.querySelector(selector);
      if (!target) return;
      observer?.disconnect();
      if (timeout !== undefined) window.clearTimeout(timeout);

      const advance = (index: number) => {
        destroyDriver();
        if (index >= steps.length) {
          void finishTour("completed");
          return;
        }
        writeStoredState(currentUserId, { step: index });
        setTour({ role: tour.role, index });
      };
      const skip = () => void finishTour("skipped");
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
        stageRadius: 12,
        popoverClass: "typetiles-tour-popover",
        steps: [{
          element: target,
          popover: {
            title: `<span class="typetiles-tour-progress">Step ${tour.index + 1} of ${steps.length}</span><span class="typetiles-tour-title">${step.title}</span>`,
            description: step.description,
            side: step.side ?? "bottom",
            align: "center",
            showButtons: tour.index === 0 ? ["next"] : ["previous", "next"],
            nextBtnText: tour.index === steps.length - 1 ? "Finish" : "Next",
            prevBtnText: "Previous",
            onNextClick: () => advance(tour.index + 1),
            onPrevClick: () => advance(tour.index - 1),
            onPopoverRender: (popover) => {
              const skipButton = document.createElement("button");
              skipButton.type = "button";
              skipButton.className = "driver-popover-btn typetiles-tour-skip";
              skipButton.textContent = "Skip Tour";
              skipButton.addEventListener("click", skip, { once: true });
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
          console.error(`Tutorial target not found: ${targetName}`);
          setNotice("A tutorial step could not be displayed. You can still use the app and replay the tour from Help / Tutorial.");
          setTour(null);
        }
      }, 5000);
    }

    return () => {
      active = false;
      observer?.disconnect();
      if (timeout !== undefined) window.clearTimeout(timeout);
      destroyDriver();
    };
  }, [currentUserId, destroyDriver, finishTour, location.pathname, navigate, tour]);

  return (
    <TutorialContext.Provider value={startTour}>
      {children}
      {notice ? <div role="status" className="fixed bottom-4 left-1/2 z-[10000] w-[min(92vw,560px)] -translate-x-1/2 rounded-lg border border-amber-300/50 bg-[#11183d] px-4 py-3 text-sm text-amber-100 shadow-xl">{notice}</div> : null}
    </TutorialContext.Provider>
  );
}
