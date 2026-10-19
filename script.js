const $ = id => document.getElementById(id);

// Language setup: Judge0 language ids, file names and starter programs
const LANGS = {
  python: { id: 71, file: 'main.py', code: 'name = input("Your name: ")\nprint("Hello,", name)\n' },
  java: { id: 62, file: 'Main.java', code: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print("Your name: ");\n        String name = sc.nextLine();\n        System.out.println("Hello, " + name);\n    }\n}\n' },
  c: { id: 50, file: 'main.c', code: '#include <stdio.h>\n\nint main() {\n    char name[50];\n    printf("Your name: ");\n    scanf("%49s", name);\n    printf("Hello, %s\\n", name);\n    return 0;\n}\n' },
  cpp: { id: 54, file: 'main.cpp', code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string name;\n    cout << "Your name: ";\n    cin >> name;\n    cout << "Hello, " << name << endl;\n    return 0;\n}\n' }
};
const API = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';

// Safe storage helpers
const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const load = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };

// Theme and colours
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  $('bg').value = t;
  $('theme').textContent = (t === 'dark' || t === 'ocean') ? 'Light mode' : 'Dark mode';
  save('cn-theme', t);
}
function setAccent(c) {
  document.documentElement.style.setProperty('--accent', c);
  const n = parseInt(c.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  document.documentElement.style.setProperty('--on-accent', lum > 160 ? '#111' : '#fff');
  $('accent').value = c;
  save('cn-accent', c);
}
$('theme').onclick = () => setTheme(['dark', 'ocean'].includes(document.documentElement.dataset.theme) ? 'light' : 'dark');
$('bg').onchange = e => setTheme(e.target.value);
$('accent').oninput = e => setAccent(e.target.value);
setTheme(load('cn-theme') || 'light');
setAccent(load('cn-accent') || '#5b5bd6');

// Profile form
function enter(user) {
  $('welcome').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('hello').textContent = 'Welcome, ' + user.name;
  $('lang').value = user.fav;
  loadLang(user.fav);
}
$('detailsForm').onsubmit = e => {
  e.preventDefault();
  const user = { name: $('name').value.trim(), email: $('email').value.trim(), college: $('college').value.trim(), fav: $('fav').value };
  save('cn-user', JSON.stringify(user));
  enter(user);
};
try { const u = JSON.parse(load('cn-user')); if (u && u.name) enter(u); } catch (e) {}

// Editor
function loadLang(l) {
  $('code').value = LANGS[l].code;
  $('file').textContent = LANGS[l].file;
  numbers();
}
function numbers() {
  const n = $('code').value.split('\n').length;
  $('lines').textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n');
}
$('lang').onchange = e => loadLang(e.target.value);
$('code').addEventListener('input', numbers);
$('code').addEventListener('scroll', () => { $('lines').scrollTop = $('code').scrollTop; });
$('code').addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const t = e.target, s = t.selectionStart;
    t.value = t.value.slice(0, s) + '    ' + t.value.slice(t.selectionEnd);
    t.selectionStart = t.selectionEnd = s + 4;
    numbers();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run();
});

// Run and debug
function show(text, isError, status, cls) {
  const o = $('output');
  o.textContent = text;
  o.classList.toggle('error', isError);
  $('status').textContent = status;
  $('status').className = cls || '';
}
async function run() {
  const btn = $('run');
  btn.disabled = true;
  show('Compiling and running...', false, 'Running');
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language_id: LANGS[$('lang').value].id,
        source_code: $('code').value,
        stdin: $('stdin').value
      })
    });
    if (!res.ok) throw new Error('Server answered with status ' + res.status);
    const d = await res.json();
    const info = d.time ? ' (' + d.time + 's)' : '';
    if (d.compile_output) {
      show(d.compile_output, true, 'Compile error', 'bad');
    } else if (d.stderr) {
      show((d.stdout || '') + '\n' + d.stderr, true, d.status.description, 'bad');
    } else if (d.status.id === 3) {
      show(d.stdout || '(no output)', false, 'Success' + info, 'ok');
    } else {
      show((d.stdout || '') + (d.message || d.status.description), true, d.status.description, 'bad');
    }
  } catch (err) {
    show('Could not reach the compiler service.\nCheck your internet connection and try again.\n\nDetails: ' + err.message, true, 'Offline', 'bad');
  }
  btn.disabled = false;
}
$('run').onclick = run;