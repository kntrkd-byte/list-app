import { openDatabase, getVisitsByStoreAndDate } from './db.js';
import { calcRowSales, calcDailyTotals, assignGroupNumbers } from './models.js';

const STORE_NAME = 'STORE';
const PAYMENT_METHODS = ['現金', 'カード', 'キャッシュレス', '売掛'];

function sumByMethod(visit, method) {
  return visit.payments
    .filter((payment) => payment.method === method)
    .reduce((sum, payment) => sum + payment.amount, 0);
}

const HEADERS = ['組', '卓', '開始', '完了', ...PAYMENT_METHODS, '合計', '備考', '詳細'];

function formatCastColumns(castColumns) {
  const labels = ['S', ...Array.from({ length: 10 }, (_, i) => `N${i + 1}`)];

  return (castColumns || [])
    .map((slots, index) => {
      const names = (slots || []).filter((name) => name);
      if (names.length === 0) {
        return null;
      }
      return `${labels[index]}: ${names.join('・')}`;
    })
    .filter((entry) => entry !== null)
    .join(', ');
}

function buildDetailRow(visit) {
  const tr = document.createElement('tr');
  tr.className = 'history-detail-row';
  tr.hidden = true;

  const td = document.createElement('td');
  td.colSpan = HEADERS.length;

  const detail = document.createElement('div');
  detail.className = 'history-detail';

  const timesSection = document.createElement('div');
  timesSection.className = 'history-detail-section';
  timesSection.textContent = `開始 ${visit.startTime} ／ 終了予定 ${visit.plannedEndTime || '-'} ／ 完了 ${visit.completedAt || '-'}`;
  detail.appendChild(timesSection);

  const nominationsSection = document.createElement('div');
  nominationsSection.className = 'history-detail-section';
  const nominationNames = (visit.nominations || []).map((nom) => nom.name);
  nominationsSection.textContent = `指名: ${nominationNames.length > 0 ? nominationNames.join('、') : 'なし'}`;
  detail.appendChild(nominationsSection);

  const castsSection = document.createElement('div');
  castsSection.className = 'history-detail-section';
  const castColumnsText = formatCastColumns(visit.castColumns);
  castsSection.textContent = `キャスト: ${castColumnsText || 'なし'}`;
  detail.appendChild(castsSection);

  const paymentsSection = document.createElement('div');
  paymentsSection.className = 'history-detail-section';

  const paymentsLabel = document.createElement('span');
  paymentsLabel.textContent = '会計履歴: ';
  paymentsSection.appendChild(paymentsLabel);

  const paymentsList = document.createElement('ul');
  paymentsList.className = 'history-detail-payments';

  if ((visit.payments || []).length === 0) {
    const li = document.createElement('li');
    li.textContent = 'なし';
    paymentsList.appendChild(li);
  } else {
    for (const payment of visit.payments) {
      const li = document.createElement('li');
      li.textContent = `${payment.method} ¥${payment.amount}`;
      paymentsList.appendChild(li);
    }
  }

  paymentsSection.appendChild(paymentsList);
  detail.appendChild(paymentsSection);

  td.appendChild(detail);
  tr.appendChild(td);
  return tr;
}

export function renderHistoryTable(container, visits) {
  container.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'history-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const text of HEADERS) {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const groupNumbers = assignGroupNumbers(visits);

  for (const visit of visits) {
    const tr = document.createElement('tr');
    tr.className = 'visit-row';

    const cells = [
      groupNumbers.get(visit.groupId),
      visit.table,
      visit.startTime,
      visit.completedAt,
      ...PAYMENT_METHODS.map((method) => sumByMethod(visit, method)),
      `¥${calcRowSales(visit)}`,
      visit.note,
    ];

    for (const value of cells) {
      const td = document.createElement('td');
      td.textContent = String(value);
      tr.appendChild(td);
    }

    const detailRow = buildDetailRow(visit);

    const toggleTd = document.createElement('td');
    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.dataset.action = 'toggle-detail';
    toggleButton.textContent = '詳細';
    toggleButton.addEventListener('click', () => {
      detailRow.hidden = !detailRow.hidden;
      toggleButton.textContent = detailRow.hidden ? '詳細' : '閉じる';
    });
    toggleTd.appendChild(toggleButton);
    tr.appendChild(toggleTd);

    tbody.appendChild(tr);
    tbody.appendChild(detailRow);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

export function renderHistoryTotals(container, visits) {
  const totals = calcDailyTotals(visits);
  container.innerHTML = '';

  const items = [
    ['入客数', `${totals.customerCount}`],
    ['売上合計', `¥${totals.totalSales}`],
    ['カード売上', `¥${totals.cardSales}`],
    ['客単価', `¥${Math.round(totals.averageSpend)}`],
  ];

  for (const [label, value] of items) {
    const card = document.createElement('div');
    card.className = 'totals-card';
    card.textContent = `${label}: ${value}`;
    container.appendChild(card);
  }
}

export async function initHistory(root, { dbName = 'list-app-db' } = {}) {
  const db = await openDatabase(dbName);
  const dateInput = root.querySelector('#history-date');
  const tableContainer = root.querySelector('#history-table');
  const totalsContainer = root.querySelector('#history-totals');

  dateInput.value = new Date().toISOString().slice(0, 10);

  async function refresh() {
    const visits = await getVisitsByStoreAndDate(db, STORE_NAME, dateInput.value);
    renderHistoryTable(tableContainer, visits);
    renderHistoryTotals(totalsContainer, visits);
  }

  dateInput.addEventListener('change', refresh);
  await refresh();
}
