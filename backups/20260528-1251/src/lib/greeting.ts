/** Pure helpers — bisa diunit-test tanpa DOM. */
export function getGreeting(d = new Date()): string {
  const h = d.getHours();
  return h < 12 ? 'Selamat pagi'
       : h < 15 ? 'Selamat siang'
       : h < 18 ? 'Selamat sore'
                : 'Selamat malam';
}

export function formatDateID(d = new Date()): string {
  return d.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}
