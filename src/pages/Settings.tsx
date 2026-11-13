import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayerAuth } from "../lib/PlayerAuthContext";
import { submitFeedback } from "../lib/playerApi";

import { developmentTeam } from "../data/developmentTeam";

const settingsItems = [
  ["Account Settings", "/app/settings/account"],
  ["Notifications", "/app/settings/notifications"],
  ["Help & Support", "/app/settings/help"],
  ["About Type Tiles", "/app/settings/about"],
  ["Feedback", "/app/settings/feedback"],
] as const;

function SettingsFrame({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <section className="h-full overflow-y-auto">
      <div className="min-h-[735px] rounded-[8px] bg-[linear-gradient(197deg,#08122e_17%,rgba(43,51,89,.9)_46%,#13173b_81%)] px-6 py-6 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/app/settings")} className="rounded-full p-2 text-white hover:bg-white/10" aria-label="Back to Settings">
            <ChevronLeft className="h-7 w-7" />
          </button>
          <h1 className="text-[24px] font-medium text-white">{title}</h1>
        </div>
        <div className="mt-8 max-w-[998px]">{children}</div>
      </div>
    </section>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = usePlayerAuth();

  return (
    <section className="h-full overflow-y-auto" data-node-id="440:2197">
      <div className="min-h-[735px] rounded-[8px] bg-[linear-gradient(197deg,#08122e_17%,rgba(43,51,89,.9)_46%,#13173b_81%)] px-6 py-6 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-medium text-white">Settings</h1>
          <button type="button" onClick={() => navigate("/app/customize")} className="rounded-full p-2 text-white hover:bg-white/10" aria-label="Back to profile">
            <ChevronLeft className="h-7 w-7" />
          </button>
        </div>
        <div className="mt-10 max-w-[998px]">
          {settingsItems.map(([label, path]) => (
            <button key={path} type="button" onClick={() => navigate(path)} className="flex h-[85px] w-full items-start justify-between pt-1 text-left text-[20px] font-medium text-white transition hover:text-[#6a9eff]">
              <span>{label}</span>
              <ChevronRight className="mt-1 h-6 w-6" />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => { logout(); navigate("/welcome", { replace: true }); }} className="mx-auto mt-4 block h-[60px] w-full max-w-[420px] rounded-[8px] bg-[#2746a6] text-[22px] font-medium text-white transition hover:brightness-110">Sign Out</button>
      </div>
    </section>
  );
}

export function AccountSettings() {
  const { user, updateProfile } = usePlayerAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setDisplayName(user?.displayName || ""), [user?.displayName]);

  const save = async () => {
    setSaving(true);
    setStatus("");
    setError("");
    try {
      await updateProfile({ displayName: displayName.trim() });
      setStatus("Account changes saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save account changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsFrame title="Account Settings">
      <div className="space-y-5 rounded-[8px] border border-[#2967a1] bg-[#0a1325]/70 p-5">
        <label className="block text-sm font-medium text-white">Display Name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2 w-full rounded-[7px] border border-[#2967a1] bg-[#1d234a] px-3 py-3 text-white outline-none focus:border-[#6a9eff]" /></label>
        <label className="block text-sm font-medium text-white">Username<input value={user?.username || ""} readOnly className="mt-2 w-full rounded-[7px] border border-white/10 bg-white/5 px-3 py-3 text-white/60" /></label>
        <label className="block text-sm font-medium text-white">Role<input value={user?.role || ""} readOnly className="mt-2 w-full rounded-[7px] border border-white/10 bg-white/5 px-3 py-3 capitalize text-white/60" /></label>
        <button type="button" onClick={save} disabled={saving || !displayName.trim()} className="rounded-[8px] bg-[#2746a6] px-5 py-3 font-medium text-white disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
        {status ? <div className="text-sm text-emerald-300">{status}</div> : null}
        {error ? <div className="text-sm text-amber-300">{error}</div> : null}
      </div>
    </SettingsFrame>
  );
}

export function NotificationSettings() {
  return <SettingsFrame title="Notifications"><div className="rounded-[8px] border border-[#2967a1] bg-[#0a1325]/70 p-5 text-slate-300">Type Tiles currently uses in-app system and match messages. No email, push, SMS, or notification preferences are configured.</div></SettingsFrame>;
}

export function HelpSupport() {
  return <SettingsFrame title="Help & Support"><div className="space-y-5 text-slate-300"><InfoBlock title="HOW TO PLAY">Type the correct answer for each falling tile before it reaches the bottom of the screen.</InfoBlock><InfoBlock title="SOLO PRACTICE">Choose a category, difficulty, and round duration. Complete as many prompts as possible while maintaining speed and accuracy.</InfoBlock><InfoBlock title="LAN CLASSROOM MULTIPLAYER">Teachers create and configure classrooms, start matches, monitor students, and view standings. Students join, become Ready, and play when the teacher starts.</InfoBlock><InfoBlock title="SCORING / PERFORMANCE">The game reports Score, Lives, WPM, and Accuracy using the current gameplay rules.</InfoBlock><InfoBlock title="GREGG SHORTHAND">Gregg Shorthand exercises are supported when verified shorthand content is available.</InfoBlock></div></SettingsFrame>;
}

export function AboutTypeTiles() {
  return <SettingsFrame title="About Type Tiles"><div className="space-y-5 rounded-[8px] border border-[#2967a1] bg-[#0a1325]/70 p-5 text-slate-300"><div><h2 className="text-2xl font-semibold text-white">Type Tiles</h2><div className="mt-1 text-[#6a9eff]">Version 1.0.0</div></div><p>Type Tiles is a gamified typing application using falling-tile mechanics for skill development.</p><p>Developed by Wanderpets, it supports Solo Practice, online and local/LAN classroom activities, and Gregg stenography exercises.</p><div><h3 className="text-sm font-medium tracking-[0.2em] text-white">CAPSTONE DEVELOPMENT TEAM</h3><div className="mt-3 space-y-5">{developmentTeam.map((member) => <div key={member.id}><h4 className="font-semibold text-white">{member.name}</h4><p className="text-[#91dcff]">{member.role}</p><p className="mt-1 leading-7">{member.description}</p></div>)}</div><a href="/about/" className="mt-5 inline-block text-[#91dcff] underline">Meet Wanderpets on our public team page</a></div><p>Pateros Technological College{`\n`}BS Information Technology{`\n`}2026</p></div></SettingsFrame>;
}

export function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setSubmitting(true);
    setStatus("");
    setError("");
    try {
      await submitFeedback(message);
      setMessage("");
      setStatus("Feedback submitted successfully.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return <SettingsFrame title="Feedback"><div className="rounded-[8px] border border-[#2967a1] bg-[#0a1325]/70 p-5"><p className="text-slate-300">Help us improve Type Tiles.</p><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={7} placeholder="Enter your feedback here..." className="mt-4 w-full resize-y rounded-[7px] border border-[#2967a1] bg-[#1d234a] px-3 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#6a9eff]" /><button type="button" onClick={submit} disabled={submitting || !message.trim()} className="mt-4 rounded-[8px] bg-[#2746a6] px-5 py-3 font-medium text-white disabled:opacity-60">{submitting ? "Submitting..." : "Submit Feedback"}</button>{status ? <div className="mt-3 text-sm text-emerald-300">{status}</div> : null}{error ? <div className="mt-3 text-sm text-amber-300">{error}</div> : null}</div></SettingsFrame>;
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[8px] border border-[#2967a1] bg-[#0a1325]/70 p-5"><h2 className="text-sm font-medium tracking-[0.2em] text-white">{title}</h2><p className="mt-2 leading-7">{children}</p></section>;
}