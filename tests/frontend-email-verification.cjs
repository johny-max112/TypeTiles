// Uses installed TypeScript and a small hook/router harness; no browser or network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

let active;
let authValue;
let location = { pathname: '/register', state: null };
let clock = 1_000_000;
const navigation = [];
const requests = [];
const storageWrites = [];
let reply = { status: 201, body: { message: 'generic', verificationRequired: true } };
const timers = new Map();
let timerId = 0;
const navigate = (...args) => navigation.push(args);
const react = {
  createContext: () => ({ Provider: 'provider' }),
  useContext: () => authValue,
  useState(initial) {
    const index = active.cursor++;
    const owner = active;
    if (!(index in owner.values)) owner.values[index] = typeof initial === 'function' ? initial() : initial;
    return [owner.values[index], value => { owner.values[index] = typeof value === 'function' ? value(owner.values[index]) : value; }];
  },
  useRef(initial) {
    const index = active.cursor++;
    if (!(index in active.values)) active.values[index] = { current: initial };
    return active.values[index];
  },
  useMemo: factory => factory(),
  useEffect(effect, dependencies) {
    const index = active.cursor++;
    const previous = active.effects[index];
    if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
      active.effects[index] = { dependencies, cleanup: previous?.cleanup };
      active.scheduled.push(() => {
        previous?.cleanup?.();
        active.effects[index].cleanup = effect();
      });
    }
  },
};
const browser = {
  location: { hostname: 'mock.local', protocol: 'http:' },
  setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
  clearTimeout(id) { timers.delete(id); },
  setInterval(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay, interval: true }); return id; },
  clearInterval(id) { timers.delete(id); },
};
const cache = new Map();
function load(filename) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  let source = fs.readFileSync(filename, 'utf8').replace('import.meta.env.VITE_API_URL', 'undefined');
  source = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const requireMock = name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment' };
    if (name === 'react-router-dom') return { Link: 'link', useNavigate: () => navigate, useLocation: () => location };
    if (name === 'lucide-react') return { Dices: 'icon' };
    if (name.endsWith('HudBackground')) return { HudBackground: 'background' };
    const base = path.resolve(path.dirname(filename), name);
    return load(['.ts', '.tsx'].map(extension => base + extension).find(file => fs.existsSync(file)));
  };
  vm.runInNewContext(source, {
    module, exports: module.exports, require: requireMock, window: browser, Date: { now: () => clock },
    AbortController, Error, TextEncoder, URL,
    localStorage: { getItem: () => null, setItem: (...args) => storageWrites.push(args), removeItem: (...args) => storageWrites.push(args) },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.body };
    },
  }, { filename });
  return module.exports;
}
function renderer(Component) {
  const owner = { cursor: 0, values: [], effects: [], scheduled: [] };
  return {
    render() {
      active = owner; owner.cursor = 0; owner.scheduled = [];
      const tree = Component({ children: null });
      for (const effect of owner.scheduled) effect();
      return tree;
    },
    dispose() { for (const effect of owner.effects) effect?.cleanup?.(); },
  };
}
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  const children = Array.isArray(tree.props?.children) ? tree.props.children.flat(Infinity) : [tree.props?.children];
  return [...(predicate(tree) ? [tree] : []), ...children.flatMap(child => nodes(child, predicate))];
}
const form = tree => nodes(tree, node => node.type === 'form')[0];
const input = (tree, id) => nodes(tree, node => node.props?.id === id)[0];
const text = tree => JSON.stringify(tree);
async function settle() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
const submit = tree => form(tree).props.onSubmit({ preventDefault() {} });

(async () => {
  const api = load('src/lib/playerApi.ts');
  const context = load('src/lib/PlayerAuthContext.tsx');
  const PlayerAuth = load('src/components/PlayerAuth.tsx').default;
  const VerifyEmail = load('src/pages/VerifyEmail.tsx').default;
  const provider = renderer(context.PlayerAuthProvider);
  authValue = provider.render().props.value;
  await authValue.register({ username: 'student', email: ' Student@Example.com ', password: 'test-password', displayName: 'Student' });
  authValue = provider.render().props.value;
  assert.equal(storageWrites.length, 0);
  assert.equal(authValue.user, null);
  assert.equal(authValue.verificationEmail, 'student@example.com');

  const signup = renderer(PlayerAuth);
  const roleInputs = () => nodes(signup.render(), node => node.type === 'input' && node.props.name === 'registration-role');
  assert.deepEqual(roleInputs().map(node => node.props.value).sort(), ['student', 'teacher']);
  assert.equal(roleInputs().find(node => node.props.value === 'student').props.checked, true);
  for (const [autocomplete, value] of [['username', 'student'], ['email', 'student@example.com'], ['new-password', 'test-password'], ['name', 'Student']]) {
    nodes(signup.render(), node => node.type === 'input' && node.props.autoComplete === autocomplete)[0].props.onChange({ target: { value } });
  }
  await submit(signup.render());
  assert.equal(JSON.parse(requests.at(-1).options.body).role, 'student');
  assert.equal(navigation.at(-1)[0], '/verify-email');
  assert.equal(storageWrites.length, 0);
  roleInputs().find(node => node.props.value === 'teacher').props.onChange();
  assert.equal(roleInputs().find(node => node.props.value === 'teacher').props.checked, true);
  await submit(signup.render());
  assert.equal(JSON.parse(requests.at(-1).options.body).role, 'teacher');
  assert.equal(navigation.at(-1)[0], '/verify-email');
  assert.equal(storageWrites.length, 0);
  signup.dispose();
  authValue = provider.render().props.value;

  const verification = renderer(VerifyEmail);
  let tree = verification.render();
  assert.equal(input(tree, 'verification-email').props.value, authValue.verificationEmail);
  assert.ok(text(tree).includes('Resend code in 60s'));
  input(tree, 'verification-code').props.onChange({ target: { value: '012345' } });
  tree = verification.render();
  reply = { status: 400, body: { error: 'sensitive arbitrary server error' } };
  submit(tree); await settle();
  tree = verification.render();
  assert.ok(text(tree).includes('incorrect, expired, or already used'));
  assert.ok(!text(tree).includes('sensitive arbitrary server error'));
  assert.equal(JSON.parse(requests.at(-1).options.body).code, '012345');
  clock += 60_001;
  for (const timer of [...timers.values()]) if (timer.interval) timer.callback();
  tree = verification.render();
  reply = { status: 200, body: { message: 'generic' } };
  const resend = nodes(tree, node => node.type === 'button' && node.props.type === 'button')[0];
  assert.equal(resend.props.disabled, false);
  resend.props.onClick(); await settle();
  tree = verification.render();
  assert.ok(requests.at(-1).url.endsWith('/auth/resend-verification-code'));
  assert.ok(text(tree).includes('If an eligible account exists'));
  assert.ok(text(tree).includes('Resend code in 60s'));
  assert.equal(input(tree, 'verification-code').props.value, '');
  input(tree, 'verification-code').props.onChange({ target: { value: '012345' } });
  tree = verification.render();
  submit(tree); await settle(); tree = verification.render();
  assert.ok(text(tree).includes('Email Verified'));
  assert.equal(storageWrites.length, 0);
  const successTimer = [...timers.values()].find(timer => timer.delay === 2500);
  assert.ok(successTimer); successTimer.callback();
  assert.equal(navigation.at(-1)[0], '/login');
  verification.dispose();

  authValue = provider.render().props.value;
  const direct = renderer(VerifyEmail);
  tree = direct.render();
  assert.equal(input(tree, 'verification-email').props.value, '');
  input(tree, 'verification-email').props.onChange({ target: { value: 'other@example.com' } });
  input(direct.render(), 'verification-code').props.onChange({ target: { value: '123' } });
  const before = requests.length;
  submit(direct.render()); await settle();
  assert.equal(requests.length, before);
  assert.ok(text(direct.render()).includes('all six digits'));
  direct.dispose();

  location = { pathname: '/login', state: null };
  const login = renderer(PlayerAuth);
  assert.equal(nodes(login.render(), node => node.type === 'input' && node.props.name === 'registration-role').length, 0);
  reply = { status: 403, body: { error: 'Verify email', code: 'EMAIL_VERIFICATION_REQUIRED' } };
  await submit(login.render());
  assert.ok(nodes(login.render(), node => node.type === 'link' && node.props.to === '/verify-email').length);
  reply = { status: 401, body: { error: 'Invalid username or password' } };
  await submit(login.render());
  assert.equal(nodes(login.render(), node => node.type === 'link' && node.props.to === '/verify-email').length, 0);
  assert.ok(text(login.render()).includes('Invalid username or password'));
  assert.equal(storageWrites.length, 0);
  assert.ok(nodes(login.render(), node => node.type === 'link' && node.props.to === '/forgot-password').length);
  await api.verifyEmail('person@example.com', '012345').catch(() => {});
  assert.equal(JSON.parse(requests.at(-1).options.body).code, '012345');
  for (const request of requests) assert.equal(request.options.headers.Authorization, undefined);
  login.dispose(); provider.dispose();
  console.log('PASS: mocked registration/context/navigation, verification success/failure, resend/cooldown, direct entry, leading zeroes, login error routing, no session writes, and Forgot Password link. No real network or email.');
})().catch(error => {
  console.error('FAIL: frontend verification harness assertions.');
  // Locations only: avoid printing request data or even mock codes/passwords.
  console.error(String(error.stack).split('\n').filter(line => /^\s+at /.test(line)).join('\n'));
  process.exitCode = 1;
});
