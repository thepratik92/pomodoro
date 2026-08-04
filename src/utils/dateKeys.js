export function dayKey(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function shiftDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
