import { describe, it, expect, beforeEach } from 'vitest';
import { initHistory, renderHistoryTable, renderHistoryTotals } from '../js/history.js';
import { openDatabase, addVisit } from '../js/db.js';

function setupRoot() {
  document.body.innerHTML = `
    <input type="date" id="history-date" />
    <div id="history-table"></div>
    <div id="history-totals"></div>
  `;
  return document.body;
}

function makeVisit(overrides = {}) {
  return {
    store: 'STORE',
    date: '2026-06-12',
    groupId: 'g1',
    startTime: '20:00',
    completedAt: '21:30',
    table: '3',
    completed: true,
    note: '常連',
    payments: [
      { method: '現金', amount: 5000 },
      { method: 'カード', amount: 3000 },
    ],
    ...overrides,
  };
}

describe('renderHistoryTable', () => {
  it('renders one row per visit with group number, table, times, payment breakdown, total, note and detail toggle', () => {
    const container = document.createElement('div');
    const visit = makeVisit();

    renderHistoryTable(container, [visit]);

    const headers = Array.from(container.querySelectorAll('th')).map((th) => th.textContent);
    expect(headers).toEqual(['組', '卓', '開始', '完了', '現金', 'カード', 'キャッシュレス', '売掛', '合計', '備考', '詳細']);

    const cells = Array.from(container.querySelectorAll('tbody tr.visit-row td')).map((td) => td.textContent);
    expect(cells).toEqual(['1', '3', '20:00', '21:30', '5000', '3000', '0', '0', '¥8000', '常連', '詳細']);
  });

  it('shows a hidden detail row that reveals times, nominations, cast assignments and itemized payment history when toggled', () => {
    const container = document.createElement('div');
    const visit = makeVisit({
      plannedEndTime: '21:00',
      nominations: [
        { name: 'みお', isRed: false },
        { name: 'れな', isRed: true },
      ],
      castColumns: [
        ['ゆい', ''],
        ['みお', 'りお'],
        ['', ''],
        ['', ''],
        ['', ''],
        ['', ''],
        ['', ''],
        ['', ''],
        ['', ''],
        ['', ''],
        ['', ''],
      ],
      payments: [
        { method: '現金', amount: 3000 },
        { method: '現金', amount: 2000 },
        { method: 'カード', amount: 3000 },
      ],
    });

    renderHistoryTable(container, [visit]);

    const toggle = container.querySelector('[data-action="toggle-detail"]');
    expect(toggle.textContent).toBe('詳細');

    const detailRow = container.querySelector('tr.history-detail-row');
    expect(detailRow.hidden).toBe(true);

    toggle.click();

    expect(detailRow.hidden).toBe(false);
    expect(toggle.textContent).toBe('閉じる');
    expect(detailRow.textContent).toContain('開始 20:00');
    expect(detailRow.textContent).toContain('終了予定 21:00');
    expect(detailRow.textContent).toContain('完了 21:30');
    expect(detailRow.textContent).toContain('みお');
    expect(detailRow.textContent).toContain('れな');
    expect(detailRow.textContent).toContain('S: ゆい');
    expect(detailRow.textContent).toContain('N1: みお・りお');

    const paymentItems = Array.from(detailRow.querySelectorAll('.history-detail-payments li')).map((li) => li.textContent);
    expect(paymentItems).toEqual(['現金 ¥3000', '現金 ¥2000', 'カード ¥3000']);

    toggle.click();
    expect(detailRow.hidden).toBe(true);
    expect(toggle.textContent).toBe('詳細');
  });
});

describe('renderHistoryTotals', () => {
  it('renders daily totals cards for completed visits', () => {
    const container = document.createElement('div');
    const visit = makeVisit({ completed: true });

    renderHistoryTotals(container, [visit]);

    const cards = Array.from(container.querySelectorAll('.totals-card')).map((card) => card.textContent);
    expect(cards).toEqual(['入客数: 1', '売上合計: ¥8000', 'カード売上: ¥3000', '客単価: ¥8000']);
  });
});

describe('initHistory', () => {
  let dbCounter = 0;

  beforeEach(() => {
    document.body.innerHTML = '';
    dbCounter += 1;
  });

  it('defaults the date input to today and shows that day\'s visits', async () => {
    const root = setupRoot();
    const dbName = `history-test-db-${dbCounter}`;
    const today = new Date().toISOString().slice(0, 10);

    const db = await openDatabase(dbName);
    await addVisit(db, makeVisit({ date: today }));
    db.close();

    await initHistory(root, { dbName });

    expect(root.querySelector('#history-date').value).toBe(today);
    expect(root.querySelectorAll('#history-table tbody tr.visit-row')).toHaveLength(1);
  });

  it('reloads visits for the newly selected date when the date input changes', async () => {
    const root = setupRoot();
    const dbName = `history-test-db-${dbCounter}`;
    const today = new Date().toISOString().slice(0, 10);

    const db = await openDatabase(dbName);
    await addVisit(db, makeVisit({ date: today }));
    await addVisit(db, makeVisit({ date: '2026-01-01', groupId: 'g2', table: '7' }));
    db.close();

    await initHistory(root, { dbName });

    const dateInput = root.querySelector('#history-date');
    dateInput.value = '2026-01-01';
    dateInput.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const rows = root.querySelectorAll('#history-table tbody tr.visit-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('7');
  });
});
