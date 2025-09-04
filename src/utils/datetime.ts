export function formatDatetime(date: Date, timezone = 'Asia/Tokyo'): string {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
}

export function formatDate(date: Date, timezone = 'Asia/Tokyo'): string {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date).replaceAll('/', '-');
}
