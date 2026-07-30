import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { mockMatchConfig } from "../lib/mockData";

const assetRoot = "/figma/type-tiles-home";

const statItems = [
  {
    icon: `${assetRoot}/vector29.png`,
    label: "WPM",
    value: "164.2",
    valueClassName: "text-white",
  },
  {
    icon: `${assetRoot}/subtract.png`,
    label: "Accuracy",
    value: "99.2 %",
    valueClassName: "text-emerald-400",
  },
  {
    icon: `${assetRoot}/star1.png`,
    label: "Max Combo",
    value: "2,814",
    valueClassName: "text-amber-300",
  },
] as const;

const categories = [
  { label: "CORPORATE", image: `${assetRoot}/image4.png`, dimmed: true },
  { label: "COMMUNICATE", image: `${assetRoot}/image5.png` },
  { label: "RECORDS", image: `${assetRoot}/image6.png`, dimmed: true },
  { label: "ACCOUNTING", image: `${assetRoot}/image7.png`, dimmed: true },
  { label: "TECHNOLOGY", image: `${assetRoot}/image8.png`, dimmed: true },
  { label: "GENERAL", solid: true },
] as const;

const speedOptions = ["Slow", "Normal", "Medium", "Fast"] as const;

type CategoryLabel = (typeof categories)[number]["label"];
type SpeedLabel = (typeof speedOptions)[number];

type HomeProfile = {
  name: string;
  rank: string;
  status: string;
  level: number;
};

function HomeStatIcon({ src, alt }: { src: string; alt: string }) {
  return <img alt={alt} className="h-[26px] w-[26px] shrink-0 object-contain" src={src} />;
}

function LockBadge() {
  return <img alt="" className="absolute left-1/2 top-1/2 h-[66px] w-[66px] -translate-x-1/2 -translate-y-1/2 opacity-90" src={`${assetRoot}/group8.png`} />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<HomeProfile>({
    name: "LISCANO_01",
    rank: "Rank # 1 Global",
    status: "Online",
    level: 42,
  });
  const [draftProfile, setDraftProfile] = useState<HomeProfile>(profile);
  const [profileOpen, setProfileOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<CategoryLabel | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState<SpeedLabel>("Normal");

  const progressWidth = useMemo(() => Math.min(100, Math.max(0, profile.level * 0.95)), [profile.level]);

  const openProfileModal = () => {
    setDraftProfile(profile);
    setProfileOpen(true);
  };

  const saveProfile = () => {
    setProfile(draftProfile);
    setProfileOpen(false);
  };

  const handleStartFromCategory = () => {
    if (!selectedCategory) return;

    const difficultyBySpeed: Record<SpeedLabel, string> = {
      Slow: "Easy",
      Normal: "Normal",
      Medium: "Hard",
      Fast: "Extreme",
    };

    navigate("/pre-match", {
      state: {
        matchConfig: {
          ...mockMatchConfig,
          wordSet: selectedCategory,
          difficulty: difficultyBySpeed[selectedSpeed],
        },
      },
    });
  };

  return (
    <section className="space-y-4">
      <h1 className="px-1 text-[1.95rem] font-semibold tracking-[-0.03em] text-white sm:text-[2.15rem]">Welcome to Type Tiles!</h1>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <article className="rounded-[10px] border border-[#3d3d3d]/70 bg-[#c3d9ed] px-4 py-3 text-slate-900 shadow-[0_20px_50px_rgba(5,8,24,0.35)]">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="h-[84px] w-[88px] shrink-0 overflow-hidden rounded-[9px] bg-[#4186c0]">
                <img alt="Player avatar" className="h-full w-full object-cover object-[center_top]" src={`${assetRoot}/avatar.png`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[0.7rem] uppercase tracking-[0.16em] text-[#3d3d3d]">Player</div>
                <div className="mt-1 truncate text-[1.85rem] font-semibold leading-none tracking-[-0.03em] text-black">{profile.name}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.12em] text-[#3d3d3d]">
                  <span className="font-semibold text-[#3d3d3d]">{profile.rank}</span>
                  <span className="opacity-70">|</span>
                  <span>Status:</span>
                  <span className="text-emerald-500">{profile.status}</span>
                  <span className="opacity-70">|</span>
                  <span>Latency:</span>
                </div>
              </div>

              <div className="hidden min-w-[220px] shrink-0 text-right sm:block">
                <div className="text-[0.63rem] uppercase tracking-[0.13em] text-[#3d3d3d]">Progress : LVL {profile.level}</div>
                <div className="mt-1 h-[7px] overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${progressWidth}%` }} />
                </div>
                <button
                  type="button"
                  onClick={openProfileModal}
                  className="mt-3 w-[180px] rounded-[7px] bg-[#1a2045] py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:brightness-110"
                >
                  Edit Profile
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={openProfileModal}
              className="mt-3 w-full rounded-[7px] bg-[#1a2045] px-4 py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:brightness-110 sm:hidden"
            >
              Edit Profile
            </button>
          </article>

          <article className="rounded-[10px] border border-[#2967a1] bg-[#1d234a] p-4 shadow-[0_16px_30px_rgba(4,8,25,0.35)]">
            <div className="space-y-4">
              {statItems.map((item) => (
                <div key={item.label} className="grid grid-cols-[28px_1fr_auto] items-center gap-3">
                  <HomeStatIcon alt={item.label} src={item.icon} />
                  <div className="text-[1.05rem] font-medium text-white">{item.label}</div>
                  <div className={`text-[1.35rem] font-semibold tracking-[-0.04em] ${item.valueClassName}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="relative overflow-hidden rounded-[10px] border border-[#2967a1] bg-[#1d234a] p-4 shadow-[0_16px_30px_rgba(4,8,25,0.35)]">
            <div className="text-[1.1rem] font-medium text-white">Daily Directive</div>
            <div className="mt-3 text-[0.65rem] uppercase tracking-[0.18em] text-white/90">Progress :</div>
            <div className="mt-2 h-[8px] max-w-[210px] overflow-hidden rounded-full bg-white">
              <div className="h-full w-[60%] rounded-full bg-sky-500" />
            </div>
            <p className="mt-3 max-w-[190px] text-[0.75rem] leading-5 text-white/90">Keep it up! You’re getting better every day.</p>
            <img alt="" className="pointer-events-none absolute right-3 top-1/2 h-[120px] w-[120px] -translate-y-1/2 opacity-15" src={`${assetRoot}/preview2.png`} />
          </article>

          <article className="relative overflow-hidden rounded-[10px] border border-[#2967a1] bg-[#1a2349] p-4 shadow-[0_16px_30px_rgba(4,8,25,0.35)]">
            <div className="text-[1.1rem] font-medium text-white">Last Transmission</div>
            <div className="mt-2 flex items-end gap-3">
              <div className="text-[3rem] font-semibold leading-none tracking-[-0.06em] text-white">154</div>
              <div className="pb-1 text-sm uppercase tracking-[0.16em] text-white/90">WPM</div>
              <div className="ml-auto rounded-[4px] border border-[#01ca62]/80 bg-[rgba(0,171,82,0.6)] px-5 py-2 text-[0.65rem] uppercase tracking-[0.18em] text-white">
                Victory
              </div>
            </div>
            <div className="mt-3 text-[0.75rem] uppercase tracking-[0.18em] text-white/90">
              Cloud Burst <span className="mx-2 text-white/55">02m</span> Ago
            </div>
            <img alt="" className="pointer-events-none absolute -bottom-2 right-1 h-[74px] w-[98px] opacity-70" src={`${assetRoot}/cloud9.png`} />
            <img alt="" className="pointer-events-none absolute -bottom-2 right-6 h-[80px] w-[74px] opacity-90" src={`${assetRoot}/cloud10.png`} />
          </article>
        </div>

        <div className="space-y-4">
          <div className="flex justify-start xl:justify-center">
            <Link
              to="/play"
              className="inline-flex min-w-[158px] items-center justify-center rounded-[8px] border border-[#bde9ff] bg-[#7357f1] px-6 py-3 text-[1rem] font-medium text-white shadow-[0_14px_30px_rgba(80,63,220,0.35)] transition hover:brightness-110"
            >
              Start Game
            </Link>
          </div>

          <div className="home-scroll max-h-[58vh] overflow-y-auto pr-1 xl:max-h-[60vh]">
            <div className="grid gap-[10px] sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <button
                type="button"
                key={category.label}
                onClick={() => {
                  setSelectedCategory(category.label);
                  setSelectedSpeed("Normal");
                }}
                className="relative aspect-[1/1] overflow-hidden rounded-[8px] border-2 border-[#1183bb] bg-[#1a2349] text-left shadow-[0_16px_30px_rgba(4,8,25,0.35)] transition hover:scale-[1.01] hover:border-sky-300"
              >
                {"solid" in category ? (
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(70,62,191,0.95)_0%,rgba(47,35,149,0.95)_100%)]" />
                ) : (
                  <img alt="" className={`absolute inset-0 h-full w-full object-cover ${"dimmed" in category ? "opacity-60" : ""}`} src={category.image} />
                )}
                {"dimmed" in category && !("solid" in category) ? <div className="absolute inset-0 bg-black/25" /> : null}
                {category.label !== "GENERAL" ? <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" /> : null}

                <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
                  <div className="max-w-full font-['Concert_One'] text-[1.8rem] leading-none tracking-[0.04em] text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)] sm:text-[1.95rem]">
                    {category.label}
                  </div>
                </div>

                {category.label === "GENERAL" ? null : <LockBadge />}
              </button>
            ))}
            </div>
          </div>
        </div>
      </div>

      {profileOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[0.9rem] border border-[#5da3c5] bg-[#13173b] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <div className="mb-4 text-center font-['Roboto'] text-xl font-bold text-white">Edit Profile</div>
            <div className="space-y-3">
              <label className="block text-sm text-white/90">
                Name
                <input
                  value={draftProfile.name}
                  onChange={(event) => setDraftProfile((value) => ({ ...value, name: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#5da3c5] bg-white px-3 py-2 text-[#0b2e44] outline-none"
                />
              </label>
              <label className="block text-sm text-white/90">
                Rank
                <input
                  value={draftProfile.rank}
                  onChange={(event) => setDraftProfile((value) => ({ ...value, rank: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#5da3c5] bg-white px-3 py-2 text-[#0b2e44] outline-none"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-white/90">
                  Status
                  <input
                    value={draftProfile.status}
                    onChange={(event) => setDraftProfile((value) => ({ ...value, status: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#5da3c5] bg-white px-3 py-2 text-[#0b2e44] outline-none"
                  />
                </label>
                <label className="block text-sm text-white/90">
                  Level
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={draftProfile.level}
                    onChange={(event) => {
                      const level = Number(event.target.value);
                      setDraftProfile((value) => ({ ...value, level: Number.isNaN(level) ? value.level : level }));
                    }}
                    className="mt-1 w-full rounded-lg border border-[#5da3c5] bg-white px-3 py-2 text-[#0b2e44] outline-none"
                  />
                </label>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProfile}
                className="rounded-lg border border-[#5da3c5] bg-white px-4 py-2 font-semibold text-[#0898dd]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedCategory ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[476px] overflow-hidden rounded-[8px] border border-[#5da3c5] bg-[#13173b] shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            <div className="h-[116px] w-full overflow-hidden">
              <img alt="Category header" className="h-full w-full object-cover" src={`${assetRoot}/image5.png`} />
            </div>

            <div className="px-7 py-6">
              <div className="flex items-center gap-3 text-white/90">
                <div className="h-px flex-1 bg-white/70" />
                <span className="font-['Roboto'] text-[1.85rem] font-bold tracking-[0.03em]">CATEGORY</span>
                <div className="h-px flex-1 bg-white/70" />
              </div>

              <div className="mt-4 flex justify-center">
                <div className="rounded-[8px] border-2 border-[#5da3c5] bg-white px-10 py-[3px] font-['Roboto'] text-[1.55rem] font-bold text-[#0898dd]">
                  {selectedCategory.charAt(0) + selectedCategory.slice(1).toLowerCase()}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 text-white/90">
                <div className="h-px flex-1 bg-white/70" />
                <span className="font-['Roboto'] text-[1.85rem] font-bold tracking-[0.03em]">SPEED SETTING</span>
                <div className="h-px flex-1 bg-white/70" />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {speedOptions.map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setSelectedSpeed(speed)}
                    className={`rounded-[8px] border px-2 py-2 text-lg font-bold transition ${selectedSpeed === speed ? "border-[#5da3c5] bg-[#0898dd] text-white" : "border-white bg-white text-[#0898dd]"}`}
                  >
                    {speed}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="rounded-[8px] border border-white/30 bg-white/10 px-5 py-2 text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartFromCategory}
                  className="rounded-[8px] border border-[#5da3c5] bg-white px-5 py-2 font-bold text-[#0898dd]"
                >
                  Start Game
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}