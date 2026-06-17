import { calcRowSales, assignGroupNumbers } from './models.js';

const HEADERS = buildHeaders();
const DURATION_OPTIONS = [20, 40, 60, 80];

function buildHeaders() {
  const headers = ['No.', '開始', '組', '卓', '指名', 'S'];
  for (let i = 1; i <= 10; i += 1) {
    headers.push('', `N${i}`);
  }
  headers.push('会計', '備考');
  return headers;
}

export function renderGrid(container, visits, options = {}) {
  const {
    onCellClick = () => {},
    onComplete = () => {},
    onTableChange = () => {},
    onNoteChange = () => {},
    onSetPlannedEndTime = () => {},
    onToggleNominationColor = () => {},
    onCycleExtension = () => {},
    onEditPlannedEndTime = () => {},
  } = options;

  container.innerHTML = '';

  const scrollWrapper = document.createElement('div');
  scrollWrapper.className = 'grid-scroll';

  const table = document.createElement('table');
  table.className = 'visit-grid';

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

  visits.forEach((visit, index) => {
    const tr = document.createElement('tr');
    if (visit.completed) {
      tr.classList.add('completed');
    }

    tr.appendChild(makeNoCell(index + 1, visit, onComplete));
    tr.appendChild(makeStartCell(visit, onSetPlannedEndTime, onEditPlannedEndTime));
    tr.appendChild(makeCell(groupNumbers.get(visit.groupId)));
    tr.appendChild(makeTableSelectCell(visit, onTableChange));
    tr.appendChild(makeNominationCell(visit, onCellClick, onToggleNominationColor));

    tr.appendChild(makeCastColumnCell(visit, 0, onCellClick));
    for (let i = 0; i < 10; i += 1) {
      tr.appendChild(makeExtensionBoundaryCell(visit, i, onCycleExtension));
      tr.appendChild(makeCastColumnCell(visit, i + 1, onCellClick));
    }

    tr.appendChild(makeButtonCell(`¥${calcRowSales(visit)}`, visit, 'accounting', onCellClick));
    tr.appendChild(makeNoteClickCell(visit, onCellClick));

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  scrollWrapper.appendChild(table);
  container.appendChild(scrollWrapper);
}

function makeCell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function ensureCastColumns(visit) {
  if (!visit.castColumns) {
    const columns = Array(11).fill(null).map(() => ['', '']);
    columns[0][0] = visit.start || '';
    columns[1][0] = visit.next || '';
    visit.castColumns = columns;
  }
  return visit.castColumns;
}

function makeCastColumnCell(visit, columnIndex, onCellClick) {
  const td = document.createElement('td');
  td.className = 'cast-column-cell';
  const slots = ensureCastColumns(visit)[columnIndex];

  const wrap = document.createElement('div');
  wrap.className = 'cast-slots';

  for (let slot = 0; slot < 2; slot += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cast-slot';
    button.dataset.field = 'castColumn';
    button.dataset.column = String(columnIndex);
    button.dataset.slot = String(slot);
    button.textContent = slots[slot] || '';
    button.addEventListener('click', () => onCellClick(visit, 'castColumn', button, columnIndex * 2 + slot));
    wrap.appendChild(button);
  }

  td.appendChild(wrap);
  return td;
}

function makeExtensionBoundaryCell(visit, index, onCycleExtension) {
  const td = document.createElement('td');
  td.className = 'ext-boundary';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ext-bar';
  button.dataset.index = String(index);

  const ext = visit.extensions[index];
  if (ext && ext.minutes === 20) {
    button.classList.add('ext-bar--half');
  } else if (ext && ext.minutes === 40) {
    button.classList.add('ext-bar--full');
  }

  button.addEventListener('click', () => onCycleExtension(visit, index));
  td.appendChild(button);
  return td;
}

function makeStartCell(visit, onSetPlannedEndTime, onEditPlannedEndTime) {
  const td = document.createElement('td');
  td.className = 'start-cell';

  const row1 = document.createElement('div');
  row1.className = 'start-cell-row';

  const span = document.createElement('span');
  span.className = 'start-cell-time';
  span.textContent = visit.startTime;
  row1.appendChild(span);

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.dataset.action = 'toggle-duration-menu';
  toggleButton.textContent = '⏰';
  row1.appendChild(toggleButton);

  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'duration-buttons';

  for (const minutes of DURATION_OPTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.duration = String(minutes);
    button.textContent = `${minutes}分`;
    button.addEventListener('click', () => {
      onSetPlannedEndTime(visit, minutes);
      buttonGroup.classList.remove('open');
      td.classList.remove('menu-open');
    });
    buttonGroup.appendChild(button);
  }

  toggleButton.addEventListener('click', () => {
    const isOpen = buttonGroup.classList.toggle('open');
    td.classList.toggle('menu-open', isOpen);
    if (isOpen) {
      const rect = toggleButton.getBoundingClientRect();
      buttonGroup.style.left = `${rect.left}px`;
      buttonGroup.style.top = `${rect.bottom}px`;
      const popupRect = buttonGroup.getBoundingClientRect();
      if (popupRect.right > window.innerWidth) {
        buttonGroup.style.left = `${Math.max(0, window.innerWidth - popupRect.width - 4)}px`;
      }
      if (popupRect.bottom > window.innerHeight) {
        buttonGroup.style.top = `${Math.max(0, rect.top - popupRect.height)}px`;
      }
    }
  });

  row1.appendChild(buttonGroup);
  td.appendChild(row1);

  const row2 = document.createElement('div');
  row2.className = 'start-cell-row start-cell-planned';

  const plannedSpan = document.createElement('span');
  plannedSpan.textContent = visit.plannedEndTime;

  const plannedInput = document.createElement('input');
  plannedInput.type = 'time';
  plannedInput.step = '300';
  plannedInput.value = visit.plannedEndTime;
  plannedInput.style.display = 'none';

  plannedSpan.addEventListener('click', () => {
    plannedSpan.style.display = 'none';
    plannedInput.style.display = '';
    plannedInput.focus();
  });

  plannedInput.addEventListener('change', () => {
    onEditPlannedEndTime(visit, plannedInput.value);
  });

  row2.appendChild(plannedSpan);
  row2.appendChild(plannedInput);
  td.appendChild(row2);

  return td;
}

function makeNominationCell(visit, onCellClick, onToggleNominationColor) {
  const td = document.createElement('td');
  const nominations = visit.nominations || [];

  if (nominations.length === 0) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.field = 'nomination';
    button.dataset.index = '0';
    button.textContent = '未指名';
    button.addEventListener('click', () => onCellClick(visit, 'nomination', button, 0));
    td.appendChild(button);
    return td;
  }

  nominations.forEach((nom, index) => {
    const row = document.createElement('div');
    row.className = 'nomination-row';

    const nameButton = document.createElement('button');
    nameButton.type = 'button';
    nameButton.dataset.field = 'nomination';
    nameButton.dataset.index = String(index);
    nameButton.textContent = nom.name;
    if (nom.isRed) {
      nameButton.classList.add('nomination-red');
    }
    nameButton.addEventListener('click', () => onCellClick(visit, 'nomination', nameButton, index));
    row.appendChild(nameButton);

    const colorButton = document.createElement('button');
    colorButton.type = 'button';
    colorButton.dataset.action = 'toggle-nomination-color';
    colorButton.dataset.index = String(index);
    colorButton.textContent = '色';
    colorButton.addEventListener('click', () => onToggleNominationColor(visit, index));
    row.appendChild(colorButton);

    td.appendChild(row);
  });

  if (nominations.length < 2) {
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.dataset.action = 'add-nomination';
    addButton.textContent = '+追加';
    addButton.addEventListener('click', () => onCellClick(visit, 'nomination', addButton, nominations.length));
    td.appendChild(addButton);
  }

  return td;
}

function makeButtonCell(label, visit, field, onCellClick) {
  const td = document.createElement('td');
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.field = field;
  button.textContent = label;
  button.addEventListener('click', () => onCellClick(visit, field, button));
  td.appendChild(button);
  return td;
}

function makeNoCell(number, visit, onComplete) {
  const td = document.createElement('td');
  td.className = 'no-cell';

  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.field = 'complete';
  button.className = 'no-button';
  button.textContent = String(number);
  if (visit.completed) {
    button.classList.add('no-button--completed');
    const check = document.createElement('span');
    check.className = 'no-check';
    check.textContent = '✓';
    button.appendChild(check);
  }
  button.addEventListener('click', () => onComplete(visit));
  td.appendChild(button);
  return td;
}

function makeTableSelectCell(visit, onChange) {
  const td = document.createElement('td');
  td.className = 'table-cell';

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.dataset.field = 'table';
  toggleButton.textContent = visit.table || '-';

  const popup = document.createElement('div');
  popup.className = 'table-select-popup';

  let overlay = null;

  const closePopup = () => {
    popup.classList.remove('open');
    td.classList.remove('menu-open');
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  };

  const selectValue = (value) => {
    onChange(visit, value);
    closePopup();
  };

  const emptyOption = document.createElement('button');
  emptyOption.type = 'button';
  emptyOption.dataset.tableValue = '';
  emptyOption.textContent = '-';
  emptyOption.addEventListener('click', () => selectValue(''));
  popup.appendChild(emptyOption);

  for (let i = 1; i <= 25; i += 1) {
    const option = document.createElement('button');
    option.type = 'button';
    option.dataset.tableValue = String(i);
    option.textContent = String(i);
    option.addEventListener('click', () => selectValue(String(i)));
    popup.appendChild(option);
  }

  toggleButton.addEventListener('click', () => {
    if (popup.classList.contains('open')) {
      closePopup();
      return;
    }
    popup.classList.add('open');
    td.classList.add('menu-open');

    overlay = document.createElement('div');
    overlay.className = 'table-select-overlay';
    overlay.addEventListener('click', closePopup);
    document.body.appendChild(overlay);

    const rect = toggleButton.getBoundingClientRect();
    popup.style.left = `${rect.left}px`;
    popup.style.top = `${rect.bottom}px`;
    const popupRect = popup.getBoundingClientRect();
    if (popupRect.bottom > window.innerHeight) {
      popup.style.top = `${Math.max(0, rect.top - popupRect.height)}px`;
    }
  });

  td.appendChild(toggleButton);
  td.appendChild(popup);
  return td;
}

function makeTextInputCell(visit, field, onChange) {
  const td = document.createElement('td');
  const input = document.createElement('input');
  input.type = 'text';
  input.dataset.field = field;
  input.value = visit[field];
  input.addEventListener('change', () => onChange(visit, input.value));
  td.appendChild(input);
  return td;
}

function makeNoteClickCell(visit, onCellClick) {
  const td = document.createElement('td');
  td.className = 'note-cell';
  const parts = (visit.note || '').split('・').filter(Boolean);
  // 0〜1件は真ん中に1スロット、2件のときだけ2段表示
  const slotCount = parts.length >= 2 ? 2 : 1;

  const wrap = document.createElement('div');
  wrap.className = 'note-slots';

  for (let i = 0; i < slotCount; i += 1) {
    const slot = document.createElement('span');
    slot.className = 'note-slot';

    const text = document.createElement('span');
    text.className = 'note-text';
    const value = parts[i] || '';
    if (value) {
      text.textContent = value;
    } else {
      text.textContent = '＋';
      slot.classList.add('note-slot--empty');
    }
    slot.appendChild(text);
    slot.addEventListener('click', () => onCellClick(visit, 'note', slot, i));
    wrap.appendChild(slot);
  }

  td.appendChild(wrap);
  return td;
}
