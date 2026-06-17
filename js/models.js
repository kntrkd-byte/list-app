export function createVisitGroup({
  store,
  date,
  groupSize,
  startTime,
  idGenerator = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        }),
}) {
  const groupId = idGenerator();
  const visits = [];

  for (let i = 0; i < groupSize; i += 1) {
    visits.push({
      store,
      date,
      groupId,
      startTime,
      plannedEndTime: '',
      endTime: '',
      completed: false,
      completedAt: '',
      table: '',
      nominations: [],
      castColumns: Array(11).fill(null).map(() => ['', '']),
      extensions: Array(10).fill(null),
      payments: [],
      note: '',
    });
  }

  return visits;
}

export function addPayment(visit, method, amount) {
  visit.payments.push({ method, amount });
}

export function removePayment(visit, index) {
  visit.payments.splice(index, 1);
}

export function calcRowSales(visit) {
  return visit.payments.reduce((sum, payment) => sum + payment.amount, 0);
}

export function cycleExtension(visit, index) {
  const current = visit.extensions[index];

  if (current === null) {
    visit.extensions[index] = { minutes: 20 };
  } else if (current.minutes === 20) {
    visit.extensions[index] = { minutes: 40 };
  } else {
    visit.extensions[index] = null;
  }
}

export function markComplete(visit, endTime) {
  visit.endTime = endTime;
  visit.completed = true;
  visit.completedAt = endTime;
}

export function calcDailyTotals(visits) {
  const completed = visits.filter((visit) => visit.completed);

  const customerCount = completed.length;
  const totalSales = completed.reduce((sum, visit) => sum + calcRowSales(visit), 0);
  const cardSales = completed.reduce((sum, visit) => {
    const cardTotal = visit.payments
      .filter((payment) => payment.method === 'カード')
      .reduce((s, payment) => s + payment.amount, 0);
    return sum + cardTotal;
  }, 0);
  const averageSpend = customerCount === 0 ? 0 : totalSales / customerCount;

  return { customerCount, totalSales, cardSales, averageSpend };
}

export function roundTimeTo5Minutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const remainder = minutes % 5;

  let roundedMinutes = remainder <= 2 ? minutes - remainder : minutes + (5 - remainder);
  let roundedHours = hours;

  if (roundedMinutes === 60) {
    roundedMinutes = 0;
    roundedHours = (roundedHours + 1) % 24;
  }

  return `${String(roundedHours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
}

export function addMinutesToTime(timeStr, minutes) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMinutes = ((hours * 60 + mins + minutes) % 1440 + 1440) % 1440;
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

export function createVisitInGroup({ store, date, groupId, startTime }) {
  return {
    store,
    date,
    groupId,
    startTime,
    plannedEndTime: '',
    endTime: '',
    completed: false,
    completedAt: '',
    table: '',
    nominations: [],
    castColumns: Array(11).fill(null).map(() => ['', '']),
    extensions: Array(10).fill(null),
    payments: [],
    note: '',
  };
}

export function assignGroupNumbers(visits) {
  const groupNumbers = new Map();

  for (const visit of visits) {
    if (!groupNumbers.has(visit.groupId)) {
      groupNumbers.set(visit.groupId, groupNumbers.size + 1);
    }
  }

  return groupNumbers;
}

export function sortVisitsByGroup(visits) {
  const groupMinId = new Map();
  for (const v of visits) {
    const cur = groupMinId.get(v.groupId);
    if (cur === undefined || v.id < cur) {
      groupMinId.set(v.groupId, v.id);
    }
  }
  return [...visits].sort((a, b) => {
    const ga = groupMinId.get(a.groupId);
    const gb = groupMinId.get(b.groupId);
    return ga !== gb ? ga - gb : a.id - b.id;
  });
}
