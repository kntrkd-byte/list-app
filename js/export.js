import { assignGroupNumbers } from './models.js';

const CAST_LABELS = ['S', ...Array.from({ length: 10 }, (_, i) => `N${i + 1}`)];

export function exportDailyExcel(visits, date) {
  const XLSX = window.XLSX;
  if (!XLSX) {
    alert('Excelライブラリの読み込みに失敗しました。ページを再読み込みしてください。');
    return;
  }

  const groupNumbers = assignGroupNumbers(visits);

  const headers = [
    'No.', '日付', '組', '開始', '完了時刻', '卓番',
    '指名1', '指名2',
    ...CAST_LABELS,
    ...Array.from({ length: 10 }, (_, i) => `延長${i + 1}`),
    '合計', '備考',
  ];

  const joinSlots = ([a, b]) => (a && b) ? `${a}/${b}` : (a || b || '');

  const rows = visits.map((v, i) => {
    const nominations = v.nominations || [];
    const castColumns = v.castColumns || Array(11).fill(null).map(() => ['', '']);
    const extensions = v.extensions || Array(10).fill(null);
    const total = (v.payments || []).reduce((sum, p) => sum + p.amount, 0);

    return [
      i + 1,
      date,
      groupNumbers.get(v.groupId) ?? '',
      v.startTime || '',
      v.endTime || '',
      v.table || '',
      nominations[0]?.name || '',
      nominations[1]?.name || '',
      ...castColumns.map(joinSlots),
      ...extensions.map((e) => (e ? e.minutes : '')),
      total || '',
      v.note || '',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, date);
  XLSX.writeFile(wb, `リスト表_${date}.xlsx`);
}
