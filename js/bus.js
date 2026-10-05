export const actions = {}, changes = {}, inputs = {};
export const bus = { refresh: () => {}, sheet: null };
export const on = m => Object.assign(actions, m);
export const onChange = m => Object.assign(changes, m);
export const onInput = m => Object.assign(inputs, m);
export function toast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2800);
}
export function reSheet() {
  if (!bus.sheet) return;
  const el = document.getElementById('sheetBody'), y = el.scrollTop;
  el.innerHTML = bus.sheet(); el.scrollTop = y;
}
export function openSheet(fn) {
  bus.sheet = fn; reSheet();
  document.getElementById('sheet').hidden = false; document.body.classList.add('noscroll');
}
export function closeSheet() {
  bus.sheet = null; document.getElementById('sheet').hidden = true; document.body.classList.remove('noscroll');
}
