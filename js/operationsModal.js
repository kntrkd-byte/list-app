let currentModal = null;
let currentOverlay = null;
let currentKeydownHandler = null;

function nowHHMM() {
  return new Date().toTimeString().slice(0, 5);
}

export function openOperationsModal(visit, ctx, handlers) {
  closeOperationsModal();

  const { groupNumber, groupSize = 1 } = ctx || {};
  const {
    onComplete = () => {},
    onRevert = () => {},
    onAddToGroup = () => {},
    onSeparate = () => {},
    onDelete = () => {},
  } = handlers || {};

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', () => closeOperationsModal());
  document.body.appendChild(overlay);
  currentOverlay = overlay;

  const modal = document.createElement('div');
  modal.className = 'operations-modal';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.dataset.action = 'close';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => closeOperationsModal());
  modal.appendChild(closeButton);

  const title = document.createElement('div');
  title.className = 'operations-modal-title';
  const tablePart = visit.table ? `卓${visit.table}` : '卓-';
  title.textContent = `${groupNumber}組 ${tablePart}`;
  modal.appendChild(title);

  if (visit.completed) {
    const info = document.createElement('div');
    info.className = 'operations-modal-info';
    info.textContent = visit.endTime ? `完了 ${visit.endTime}` : '完了済み';
    modal.appendChild(info);

    const revertButton = document.createElement('button');
    revertButton.type = 'button';
    revertButton.className = 'revert-confirm op-button';
    revertButton.textContent = '完了を解除';
    revertButton.addEventListener('click', () => {
      onRevert();
      closeOperationsModal();
    });
    modal.appendChild(revertButton);
  } else {
    const label = document.createElement('label');
    label.className = 'operations-modal-label';
    label.textContent = '終了時刻';

    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.step = '300';
    timeInput.className = 'operations-modal-time';
    timeInput.value = nowHHMM();
    label.appendChild(timeInput);
    modal.appendChild(label);

    const completeButton = document.createElement('button');
    completeButton.type = 'button';
    completeButton.className = 'complete-confirm op-button';
    completeButton.textContent = '完了にする';
    completeButton.addEventListener('click', () => {
      onComplete(timeInput.value || nowHHMM());
      closeOperationsModal();
    });
    modal.appendChild(completeButton);
  }

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.dataset.action = 'add-to-group';
  addButton.className = 'op-button';
  addButton.textContent = '組に追加';
  addButton.addEventListener('click', () => {
    onAddToGroup();
    closeOperationsModal();
  });
  modal.appendChild(addButton);

  if (groupSize > 1) {
    const separateButton = document.createElement('button');
    separateButton.type = 'button';
    separateButton.dataset.action = 'separate';
    separateButton.className = 'op-button';
    separateButton.textContent = '組から分離';
    separateButton.addEventListener('click', () => {
      onSeparate();
      closeOperationsModal();
    });
    modal.appendChild(separateButton);
  }

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.dataset.action = 'delete';
  deleteButton.className = 'op-button op-button--danger';
  deleteButton.textContent = '削除';
  deleteButton.addEventListener('click', () => {
    onDelete();
    closeOperationsModal();
  });
  modal.appendChild(deleteButton);

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'op-button op-button--cancel';
  cancelButton.textContent = 'キャンセル';
  cancelButton.addEventListener('click', () => closeOperationsModal());
  modal.appendChild(cancelButton);

  document.body.appendChild(modal);
  currentModal = modal;

  currentKeydownHandler = (event) => {
    if (event.key === 'Escape') {
      closeOperationsModal();
    }
  };
  document.addEventListener('keydown', currentKeydownHandler);

  return modal;
}

export function closeOperationsModal() {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
  }
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
  if (currentKeydownHandler) {
    document.removeEventListener('keydown', currentKeydownHandler);
    currentKeydownHandler = null;
  }
}
