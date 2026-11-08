import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTeacherStudentHistory, getTeacherStudentProgress, type TeacherStudentHistory, type TeacherStudentProgress } from "../lib/playerApi";

function metric(value: number | null, suffix = "") {
  return value === null ? "—" : `${value.toFixed(1)}${suffix}`;
}

export default function StudentProgress() {
  const [students, setStudents] = useState<TeacherStudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TeacherStudentHistory | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [reload, setReload] = useState(0);
  const [detailReload, setDetailReload] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true); setError("");
    getTeacherStudentProgress().then(response => { if (current) setStudents(response.students); })
      .catch(cause => { if (current) setError(cause instanceof Error ? cause.message : "Unable to load student progress"); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [reload]);

  useEffect(() => {
    if (selectedId === null) return;
    let current = true;
    setDetail(null); setDetailError(""); setDetailLoading(true);
    getTeacherStudentHistory(selectedId).then(response => { if (current) setDetail(response); })
      .catch(cause => { if (current) setDetailError(cause instanceof Error ? cause.message : "Unable to load student history"); })
      .finally(() => { if (current) setDetailLoading(false); });
    return () => { current = false; };
  }, [selectedId, detailReload]);

  const selected = students.find(student => student.id === selectedId);
  const activeDetail = detail?.student.id === selectedId ? detail : null;
  return (
    <section className="h-full overflow-y-auto pb-6">
      <header className="mb-4 rounded-2xl border border-[#2967a1] bg-[#11183d]/95 p-5">
        <Link to="/app/results" className="text-sm text-sky-300 hover:underline">Back to Results</Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Student Progress</h1>
        <p className="mt-2 text-sm text-slate-300">Finished attempts in your completed classrooms only. Zero results count; averages ignore missing metrics. Session dates show when the classroom was created.</p>
      </header>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <article className="min-w-0 rounded-2xl border border-[#2967a1] bg-[#11183d]/95 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Your students</h2>
          {loading ? <p role="status" className="text-sm text-slate-300">Loading student progress...</p> : error ? (
            <div role="alert" className="text-sm text-amber-300">{error}<button type="button" onClick={() => setReload(value => value + 1)} className="ml-3 text-sky-300 underline">Retry</button></div>
          ) : students.length === 0 ? <p className="text-sm text-slate-300">No finished student attempts in completed classrooms yet.</p> : (
            <div className="space-y-3">
              {students.map(student => (
                <button key={student.id} type="button" aria-pressed={selectedId === student.id} onClick={() => setSelectedId(student.id)} className={`w-full rounded-xl border p-3 text-left ${selectedId === student.id ? "border-cyan-300 bg-[#233f9d]" : "border-[#2967a1] bg-[#1d2655] hover:border-cyan-300"}`}>
                  <strong className="block break-words text-white">{student.display_name}</strong>
                  <span className="block break-words text-xs text-slate-300">@{student.username} · {student.session_count} sessions</span>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div><dt>Average WPM</dt><dd className="text-white">{metric(student.average_wpm)}</dd></div>
                    <div><dt>Average accuracy</dt><dd className="text-white">{metric(student.average_accuracy, "%")}</dd></div>
                    <div><dt>Best WPM</dt><dd className="text-white">{metric(student.best_wpm)}</dd></div>
                    <div><dt>Latest session</dt><dd className="text-white">{new Date(student.latest_session_date).toLocaleDateString()}</dd></div>
                  </dl>
                </button>
              ))}
            </div>
          )}
        </article>
        <article className="min-w-0 rounded-2xl border border-[#2967a1] bg-[#11183d]/95 p-4">
          <h2 className="mb-3 break-words text-lg font-semibold text-white">{selected ? `${selected.display_name} — Session history` : "Session history"}</h2>
          {selectedId === null ? <p className="text-sm text-slate-300">Select a student to view their sessions with you.</p> : detailLoading ? <p role="status" className="text-sm text-slate-300">Loading student history...</p> : detailError ? (
            <div role="alert" className="text-sm text-amber-300">{detailError}<button type="button" onClick={() => setDetailReload(value => value + 1)} className="ml-3 text-sky-300 underline">Retry</button></div>
          ) : activeDetail && activeDetail.history.length === 0 ? <p className="text-sm text-slate-300">No qualifying sessions available.</p> : activeDetail ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1d2655] text-slate-300"><tr>{["Session", "Date", "Category", "Difficulty", "Score", "WPM", "Accuracy", "Rank", "Status"].map(label => <th key={label} scope="col" className="whitespace-nowrap px-3 py-2">{label}</th>)}</tr></thead>
                <tbody>{activeDetail.history.map(session => (
                  <tr key={session.session_id} className="border-b border-[#2967a1]/60 text-white">
                    <td className="px-3 py-3">#{session.session_id}</td><td className="whitespace-nowrap px-3 py-3">{new Date(session.session_date).toLocaleString()}</td>
                    <td className="px-3 py-3">{session.word_set}</td><td className="px-3 py-3">{session.difficulty}</td>
                    <td className="px-3 py-3">{session.score?.toLocaleString() ?? "—"}</td><td className="px-3 py-3">{metric(session.wpm)}</td><td className="px-3 py-3">{metric(session.accuracy, "%")}</td>
                    <td className="px-3 py-3">{session.position ?? "—"}</td><td className="px-3 py-3">{session.completion_status}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
