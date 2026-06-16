import { describe, it, expect, vi, afterEach } from 'vitest';
import { openNewVisitModal, closeNewVisitModal } from '../js/newVisitModal.js';

function findConfirmButton(modal) {
  return Array.from(modal.querySelectorAll('button')).find(
    (b) => b.textContent === '来店登録'
  );
}

describe('newVisitModal', () => {
  afterEach(() => {
    closeNewVisitModal();
    document.body.innerHTML = '';
  });

  it('renders quick group size buttons and a custom input', () => {
    const modal = openNewVisitModal(() => {});

    const buttons = modal.querySelectorAll('.group-size-options button');
    expect(Array.from(buttons).map((b) => b.textContent)).toEqual([
      '1名', '2名', '3名', '4名', '5名', '6名',
    ]);
    expect(modal.querySelector('input[type="number"]')).not.toBeNull();
  });

  it('confirms with the default size (1) when nothing is selected', () => {
    const onConfirm = vi.fn();
    const modal = openNewVisitModal(onConfirm);

    findConfirmButton(modal).click();

    expect(onConfirm).toHaveBeenCalledWith(1);
  });

  it('confirms with a quick-selected group size', () => {
    const onConfirm = vi.fn();
    const modal = openNewVisitModal(onConfirm);

    modal.querySelector('[data-size="3"]').click();
    findConfirmButton(modal).click();

    expect(onConfirm).toHaveBeenCalledWith(3);
  });

  it('confirms with a custom group size entered in the input', () => {
    const onConfirm = vi.fn();
    const modal = openNewVisitModal(onConfirm);

    const customInput = modal.querySelector('input[type="number"]');
    customInput.value = '7';
    customInput.dispatchEvent(new Event('change'));

    findConfirmButton(modal).click();

    expect(onConfirm).toHaveBeenCalledWith(7);
  });

  it('closes an existing modal when opened again', () => {
    const first = openNewVisitModal(() => {});
    openNewVisitModal(() => {});

    expect(document.body.contains(first)).toBe(false);
    expect(document.querySelectorAll('.new-visit-modal')).toHaveLength(1);
  });

  it('closes the modal after confirming', () => {
    const modal = openNewVisitModal(() => {});

    findConfirmButton(modal).click();

    expect(document.querySelectorAll('.new-visit-modal')).toHaveLength(0);
  });

  it('marks the default size (1) button as selected on open', () => {
    const modal = openNewVisitModal(() => {});

    const button1 = modal.querySelector('[data-size="1"]');
    expect(button1.classList.contains('selected')).toBe(true);
  });

  it('marks the clicked size button as selected and clears the previous selection', () => {
    const modal = openNewVisitModal(() => {});

    const button3 = modal.querySelector('[data-size="3"]');
    const button5 = modal.querySelector('[data-size="5"]');

    button3.click();
    expect(button3.classList.contains('selected')).toBe(true);

    button5.click();
    expect(button3.classList.contains('selected')).toBe(false);
    expect(button5.classList.contains('selected')).toBe(true);
  });

  it('clears all selected states when the custom input is changed', () => {
    const modal = openNewVisitModal(() => {});

    const button3 = modal.querySelector('[data-size="3"]');
    button3.click();
    expect(button3.classList.contains('selected')).toBe(true);

    const customInput = modal.querySelector('input[type="number"]');
    customInput.value = '7';
    customInput.dispatchEvent(new Event('change'));

    expect(button3.classList.contains('selected')).toBe(false);
  });

  it('closes the modal without confirming when the close button is clicked', () => {
    const onConfirm = vi.fn();
    const modal = openNewVisitModal(onConfirm);

    modal.querySelector('[data-action="close"]').click();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(document.querySelectorAll('.new-visit-modal')).toHaveLength(0);
  });

  it('closes the modal when Escape is pressed', () => {
    const onConfirm = vi.fn();
    openNewVisitModal(onConfirm);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(document.querySelectorAll('.new-visit-modal')).toHaveLength(0);
  });
});
