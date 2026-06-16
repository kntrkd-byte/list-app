let currentModal = null;
let currentOverlay = null;
let currentKeydownHandler = null;

function nowHHMM() {
  return new Date().toTimeString().slice(0, 5);
}

export function openCompleteModal(visit, groupNumber, onConfirm) {
  closeCompleteModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', () => closeCompleteModal());
  document.body.appendChild(overlay);
  currentOverlay = overlay;

  const modal = document.createElement('div');
  modal.className = 'complete-modal';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.dataset.action = 'close';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => closeCompleteModal());
  modal.appendChild(closeButton);

  const title = document.createElement('div');
  title.className = 'complete-modal-title';
  title.textContent = '来店を完了';
  modal.appendChild(title);

  const info = document.createElement('div');
  info.className = 'complete-modal-info';
  const tablePart = visit.table ? `卓${visit.table}` : '卓-';
  info.textContent = `${groupNumber}組 ${tablePart} ／ 開始 ${visit.startTime}`;
  modal.appendChild(info);

  const label = document.createElement('label');
  label.className = 'complete-modal-label';
  label.textContent = '終了時刻';

  const timeInput = document.createElement('input');
  timeInput.type = 'time';
  timeInput.step = '300';
  timeInput.className = 'complete-modal-time';
  timeInput.value = nowHHMM();
  label.appendChild(timeInput);
  modal.appendChild(label);

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'complete-confirm';
  confirmButton.textContent = '完了にする';
  confirmButton.addEventListener('click', () => {
    const endTime = timeInput.value || nowHHMM();
    onConfirm(endTime);
    closeCompleteModal();
  });
  modal.appendChild(confirmButton);

  document.body.appendChild(modal);
  currentModal = modal;

  currentKeydownHandler = (event) => {
    if (event.key === 'Escape') {
      closeCompleteModal();
    }
  };
  document.addEventListener('keydown', currentKeydownHandler);

  return modal;
}

export function closeCompleteModal() {
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
