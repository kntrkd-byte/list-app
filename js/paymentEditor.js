import { addPayment, removePayment, calcRowSales } from './models.js';

const METHODS = ['現金', 'カード', 'キャッシュレス', '売掛'];

let currentEditor = null;
let currentOverlay = null;
let outsideClickHandler = null;

export function openAccountingModal(visit, onChange) {
  closeAccountingModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  document.body.appendChild(overlay);
  currentOverlay = overlay;

  const editor = document.createElement('div');
  editor.className = 'accounting-modal';

  render();

  document.body.appendChild(editor);
  currentEditor = editor;

  outsideClickHandler = (event) => {
    if (!editor.contains(event.target)) {
      closeAccountingModal();
    }
  };
  document.addEventListener('click', outsideClickHandler, { capture: true });

  return editor;

  function render() {
    editor.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'accounting-modal-title';
    title.textContent = '会計';
    editor.appendChild(title);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.dataset.action = 'close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => closeAccountingModal());
    editor.appendChild(closeButton);

    const body = document.createElement('div');
    body.className = 'accounting-modal-body';

    const inputColumn = document.createElement('div');
    inputColumn.className = 'payment-inputs';

    for (const method of METHODS) {
      const row = document.createElement('div');
      row.className = 'payment-row';

      const label = document.createElement('span');
      label.className = 'payment-method-label';
      label.textContent = method;

      const amountInput = document.createElement('input');
      amountInput.type = 'number';
      amountInput.className = 'payment-amount-input';

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'payment-add-button';
      addButton.textContent = '追加';
      addButton.addEventListener('click', () => {
        const value = Number(amountInput.value) || 0;
        if (value !== 0) {
          addPayment(visit, method, value);
          onChange(visit);
        }
        render();
      });

      row.appendChild(label);
      row.appendChild(amountInput);
      row.appendChild(addButton);
      inputColumn.appendChild(row);
    }

    body.appendChild(inputColumn);

    const historyColumn = document.createElement('div');
    historyColumn.className = 'payment-history';

    const historyTitle = document.createElement('div');
    historyTitle.className = 'payment-history-title';
    historyTitle.textContent = '会計入力履歴';
    historyColumn.appendChild(historyTitle);

    const historyList = document.createElement('div');
    historyList.className = 'payment-history-list';

    visit.payments.forEach((payment, index) => {
      const row = document.createElement('div');
      row.className = 'history-row';

      const text = document.createElement('span');
      text.className = 'history-row-text';
      text.textContent = `${payment.method} ¥${payment.amount}`;

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'history-row-delete';
      deleteButton.textContent = '削除';
      deleteButton.addEventListener('click', () => {
        removePayment(visit, index);
        onChange(visit);
        render();
      });

      row.appendChild(text);
      row.appendChild(deleteButton);
      historyList.appendChild(row);
    });

    historyColumn.appendChild(historyList);
    body.appendChild(historyColumn);

    editor.appendChild(body);

    const total = document.createElement('div');
    total.className = 'payment-total';
    total.textContent = `合計 ¥${calcRowSales(visit)}`;
    editor.appendChild(total);

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'accounting-confirm';
    confirmButton.textContent = '決定';
    confirmButton.addEventListener('click', () => {
      closeAccountingModal();
    });
    editor.appendChild(confirmButton);
  }
}

export function closeAccountingModal() {
  if (currentEditor) {
    currentEditor.remove();
    currentEditor = null;
  }
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
  if (outsideClickHandler) {
    document.removeEventListener('click', outsideClickHandler, { capture: true });
    outsideClickHandler = null;
  }
}
