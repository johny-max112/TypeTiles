import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

function harness(api: object = {}) {
  let user: any = { role: "teacher" };
  let active: any;
  const react = {
    useState(initial: any) {
      const state = active, index = state.cursor++;
      if (!(index in state.values)) state.values[index] = typeof initial === "function" ? initial() : initial;
      return [state.values[index], (value: any) => { state.values[index] = typeof value === "function" ? value(state.values[index]) : value; }];
    },
    useEffect(callback: () => any, deps: any[]) {
      const state = active, index = state.cursor++, old = state.effects[index];
      if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) state.pending.push(() => {
        old?.cleanup?.(); state.effects[index] = { deps, cleanup: callback() };
      });
    },
    lazy: () => () => null, Suspense: "Suspense",
  };
  const jsx = (type: any, props: any) => ({ type, props: props ?? {} });
  const ProgressScreen = () => null;
  async function load(path: string) {
    const source = (await readFile(new URL(`../../${path}`, import.meta.url), "utf8")).replaceAll("import.meta.env.DEV", "false");
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    const module = { exports: {} as any };
    vm.runInNewContext(code, { module, exports: module.exports, Error, Date,
      require: (name: string) => {
        if (name === "react") return react;
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
        if (name === "react-router-dom") return { Link: "Link", NavLink: "NavLink", Route: "Route", Routes: "Routes", Navigate: "Navigate", Outlet: "Outlet", useLocation: () => ({ pathname: "/app" }), useNavigate: () => () => {} };
        if (name.endsWith("playerApi")) return api;
        if (name.endsWith("PlayerAuthContext")) return { usePlayerAuth: () => ({ user, isLoading: false }) };
        if (name.endsWith("StudentProgress")) return { __esModule: true, default: ProgressScreen };
        return { __esModule: true, default: () => null };
      },
    });
    return module.exports;
  }
  function renderer(Component: any) {
    const state: any = { cursor: 0, values: [], effects: [], pending: [] };
    return {
      render() { active = state; state.cursor = 0; state.pending = []; const tree = Component(); for (const effect of state.pending) effect(); return tree; },
      close() { for (const effect of state.effects) effect?.cleanup?.(); },
    };
  }
  return { load, renderer, setRole: (role: string | null) => { user = role ? { role } : null; }, ProgressScreen };
}

function nodes(tree: any, predicate: (node: any) => boolean): any[] {
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  if (!tree || typeof tree !== "object") return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
const text = (tree: any) => JSON.stringify(tree);
const sessionVisible = (tree: any, id: number) => nodes(tree, node => node.type === "td" && [node.props.children].flat().join("") === `#${id}`).length > 0;
async function settle() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

test("Student Progress renders summaries, ignores stale selection responses, and shows history errors", async () => {
  const first = deferred<any>(), second = deferred<any>();
  const calls: number[] = [];
  const summaries = [1, 2].map(id => ({ id, display_name: `Student ${id}`, username: `student${id}`, session_count: 2, average_wpm: id === 1 ? null : 0, average_accuracy: 0, best_wpm: 0, latest_session_date: "2026-01-01T00:00:00Z" }));
  const h = harness({ getTeacherStudentProgress: async () => ({ students: summaries }),
    getTeacherStudentHistory: (id: number) => { calls.push(id); return calls.length > 2 ? Promise.reject(new Error("Student progress not found")) : id === 1 ? first.promise : second.promise; } });
  const page = h.renderer((await h.load("src/pages/StudentProgress.tsx")).default);
  assert(text(page.render()).includes("Loading student progress")); await settle();
  let tree = page.render();
  assert(text(tree).includes("Student 1")); assert(text(tree).includes("0.0%")); assert(text(tree).includes("—"));
  const buttons = () => nodes(page.render(), node => node.props?.["aria-pressed"] !== undefined);
  buttons()[0].props.onClick(); page.render(); assert(text(page.render()).includes("Loading student history"));
  buttons()[1].props.onClick(); page.render();
  first.resolve({ student: summaries[0], history: [{ session_id: 111 }] }); await settle();
  assert(!sessionVisible(page.render(), 111));
  second.resolve({ student: summaries[1], history: [{ session_id: 202, session_date: "2026-01-01", word_set: "General", difficulty: "Normal", score: 0, wpm: 0, accuracy: 0, position: 2, completion_status: "Finished" }] });
  await settle(); tree = page.render();
  assert(sessionVisible(tree, 202)); assert(text(tree).includes("Finished")); assert(text(tree).includes("0.0"));
  buttons()[0].props.onClick(); page.render(); await settle();
  assert(text(page.render()).includes("Student progress not found"));
  assert(!sessionVisible(page.render(), 202));
  page.close();
});

test("Student Progress handles directory failures, retry and empty state", async () => {
  let calls = 0;
  const h = harness({ getTeacherStudentProgress: async () => { if (++calls === 1) throw new Error("Progress unavailable"); return { students: [] }; } });
  const page = h.renderer((await h.load("src/pages/StudentProgress.tsx")).default);
  page.render(); await settle(); let tree = page.render();
  assert(text(tree).includes("Progress unavailable"));
  nodes(tree, node => node.type === "button" && node.props.children === "Retry")[0].props.onClick();
  page.render(); await settle(); tree = page.render();
  assert(text(tree).includes("No finished student attempts")); page.close();
});

test("Student Progress route and navigation are teacher-only", async () => {
  const h = harness();
  const App = (await h.load("src/App.tsx")).default;
  const Shell = (await h.load("src/components/AppShell.tsx")).AppShell;
  for (const role of ["teacher", "student", "admin", null]) {
    h.setRole(role);
    const route = nodes(h.renderer(App).render(), node => node.type === "Route" && node.props.path === "student-progress")[0];
    const result = route.props.element.type();
    assert.equal(result.type, role === "teacher" ? h.ProgressScreen : "Navigate");
    const shell = h.renderer(Shell);
    assert.equal(nodes(shell.render(), node => node.type === "NavLink" && node.props.to === "/app/student-progress").length, role === "teacher" ? 1 : 0);
    shell.close();
  }
});
