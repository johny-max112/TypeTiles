import { Dices } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HudBackground } from "../components/HudBackground";

const onboardingSteps = [
  {
    title: "Welcome to Type Tiles!",
    body: "Play a free online typing game with falling tiles. Practice your typing speed and accuracy through fun, fast-paced gameplay.",
  },
  {
    title: "Practice your typing skills in Solo Mode or join a classroom match hosted by your teacher.",
    body: "Improve your speed and accuracy while competing alongside other students.",
  },
  {
    title: "Personalize your avatar, choose your preferred typing category, and practice the skills you want to improve.",
    body: "Track your progress, improve your WPM and accuracy, and challenge yourself to perform better each session.",
  },
] as const;

export default function Welcome() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const currentStep = onboardingSteps[step];
  const isLastStep = step === onboardingSteps.length - 1;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#08122e_0%,#2d164e_100%)] px-4 py-8 text-white sm:px-8">
      <HudBackground />
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(0,64,95,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(0,64,95,.5)_1px,transparent_1px)] [background-size:76px_76px]" />
      <div className="relative z-10 w-full max-w-[975px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <Dices className="h-14 w-14 rotate-[-13deg] text-[#6a9eff]" />
          <h1 className="mt-1 bg-gradient-to-r from-[#6a9eff] to-[#1183bb] bg-clip-text font-['Orbitron'] text-4xl font-extrabold text-transparent sm:text-6xl">TypeTiles</h1>
          <p className="mt-3 text-sm text-slate-300 sm:text-base">Free typing game · Solo practice · Classroom matches · Gregg stenography</p>
        </div>
        <div className="min-h-[300px] rounded-[27px] bg-[#0b1231] px-6 py-12 shadow-[0_24px_70px_rgba(3,6,31,.45)] sm:min-h-[399px] sm:px-12 sm:py-20">
          <div className="flex min-h-[210px] flex-col justify-between">
            <div className="mx-auto max-w-[780px] text-center font-['Padauk'] text-xl font-bold leading-relaxed text-white sm:text-[26px]">
              <div>{currentStep.title}</div>
              <div className="mt-4">{currentStep.body}</div>
            </div>
            <div className="mt-10 flex justify-end gap-3">
              <button type="button" onClick={() => nav("/login")} className="rounded-[10px] bg-[#7043b6] px-6 py-1 text-sm font-bold text-white transition hover:brightness-110">Skip</button>
              <button type="button" onClick={() => isLastStep ? nav("/login") : setStep((value) => value + 1)} className="rounded-[10px] bg-[#454ec3] px-6 py-1 text-sm font-bold text-white transition hover:brightness-110">{isLastStep ? "Get Started" : "Next"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
