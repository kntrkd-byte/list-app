import { describe, it, expect, vi, afterEach } from 'vitest';
import { openAccountingModal, closeAccountingModal } from '../js/paymentEditor.js';

function makeVisit(payments = []) {
  return { payments };
}

describe('accountingModal', () => {
  afterEach(() => {
    closeAccountingModal();
    document.body.innerHTML = '';
  });

  it('renders a title, input rows for each method, history rows and the running total', () => {
    const visit = makeVisit([
      { method: '現金', amount: 5000 },
      { method: 'カード', amount: 3000 },
    ]);

    const editor = openAccountingModal(visit, () => {});

    expect(editor.classList.contains('accounting-modal')).toBe(true);
    expect(editor.querySelector('.accounting-modal-title').textContent).toBe('会計');
    expect(editor.querySelectorAll('.payment-row')).toHaveLength(4);
    expect(editor.querySelectorAll('.history-row')).toHaveLength(2);
    expect(editor.querySelector('.payment-total').textContent).toBe('合計 ¥8000');
  });

  it('always shows the four payment methods in order', () => {
    const visit = makeVisit();

    const editor = openAccountingModal(visit, () => {});

    const labels = Array.from(editor.querySelectorAll('.payment-method-label')).map(
      (el) => el.textContent
    );
    expect(labels).toEqual(['現金', 'カード', 'キャッシュレス', '売掛']);
  });

  it('starts with empty amount inputs', () => {
    const visit = makeVisit([{ method: '現金', amount: 5000 }]);

    const editor = openAccountingModal(visit, () => {});

    const amountInputs = editor.querySelectorAll('.payment-amount-input');
    amountInputs.forEach((input) => {
      expect(input.value).toBe('');
    });
  });

  it('adds a payment to the history when 追加 is clicked', () => {
    const visit = makeVisit();
    const onChange = vi.fn();

    const editor = openAccountingModal(visit, onChange);
    const rows = editor.querySelectorAll('.payment-row');
    const cardRow = Array.from(rows).find(
      (row) => row.querySelector('.payment-method-label').textContent === 'カード'
    );
    cardRow.querySelector('.payment-amount-input').value = '2000';
    cardRow.querySelector('.payment-add-button').click();

    expect(visit.payments).toEqual([{ method: 'カード', amount: 2000 }]);
    expect(onChange).toHaveBeenCalledWith(visit);
    expect(editor.querySelectorAll('.history-row')).toHaveLength(1);
  });

  it('removes a history entry when its delete button is clicked', () => {
    const visit = makeVisit([{ method: '現金', amount: 5000 }]);
    const onChange = vi.fn();

    const editor = openAccountingModal(visit, onChange);
    editor.querySelector('.history-row .history-row-delete').click();

    expect(visit.payments).toEqual([]);
    expect(onChange).toHaveBeenCalledWith(visit);
    expect(editor.querySelectorAll('.history-row')).toHaveLength(0);
  });

  it('closes the modal when "決定" is clicked', () => {
    const visit = makeVisit([{ method: '現金', amount: 5000 }]);

    const editor = openAccountingModal(visit, () => {});
    const confirmButton = Array.from(editor.querySelectorAll('button')).find(
      (b) => b.textContent === '決定'
    );
    confirmButton.click();

    expect(document.body.contains(editor)).toBe(false);
  });

  it('closes the modal when the close button is clicked', () => {
    const visit = makeVisit([{ method: '現金', amount: 5000 }]);

    const editor = openAccountingModal(visit, () => {});
    editor.querySelector('[data-action="close"]').click();

    expect(document.body.contains(editor)).toBe(false);
  });
});
