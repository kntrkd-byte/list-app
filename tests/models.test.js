import { describe, it, expect } from 'vitest';
import { createVisitGroup, addPayment, removePayment, calcRowSales, cycleExtension } from '../js/models.js';
import {
  markComplete,
  calcDailyTotals,
  roundTimeTo5Minutes,
  addMinutesToTime,
  createVisitInGroup,
  assignGroupNumbers,
} from '../js/models.js';

describe('createVisitGroup', () => {
  it('creates N visits sharing groupId, date, store and startTime', () => {
    const visits = createVisitGroup({
      store: 'STORE',
      date: '2026-06-10',
      groupSize: 3,
      startTime: '20:00',
      idGenerator: (() => {
        let n = 0;
        return () => `g${++n}`;
      })(),
    });

    expect(visits).toHaveLength(3);

    const groupIds = new Set(visits.map((v) => v.groupId));
    expect(groupIds.size).toBe(1);

    for (const visit of visits) {
      expect(visit).toMatchObject({
        store: 'STORE',
        date: '2026-06-10',
        startTime: '20:00',
        table: '',
        nominations: [],
        castColumns: Array(11).fill(null).map(() => ['', '']),
        extensions: Array(10).fill(null),
        payments: [],
        note: '',
        completed: false,
        completedAt: '',
        plannedEndTime: '',
        endTime: '',
      });
    }
  });

  it('uses crypto.randomUUID by default for groupId', () => {
    const visits = createVisitGroup({
      store: '8Door',
      date: '2026-06-10',
      groupSize: 1,
      startTime: '21:00',
    });

    expect(visits).toHaveLength(1);
    expect(typeof visits[0].groupId).toBe('string');
    expect(visits[0].groupId.length).toBeGreaterThan(0);
  });
});

describe('payments', () => {
  it('addPayment appends a payment entry', () => {
    const visit = { payments: [] };

    addPayment(visit, '現金', 5000);
    addPayment(visit, 'カード', 3000);

    expect(visit.payments).toEqual([
      { method: '現金', amount: 5000 },
      { method: 'カード', amount: 3000 },
    ]);
  });

  it('removePayment removes the entry at the given index', () => {
    const visit = {
      payments: [
        { method: '現金', amount: 5000 },
        { method: 'カード', amount: 3000 },
      ],
    };

    removePayment(visit, 0);

    expect(visit.payments).toEqual([{ method: 'カード', amount: 3000 }]);
  });

  it('calcRowSales sums all payment amounts', () => {
    const visit = {
      payments: [
        { method: '現金', amount: 5000 },
        { method: 'カード', amount: 3000 },
        { method: '売掛', amount: 1000 },
      ],
    };

    expect(calcRowSales(visit)).toBe(9000);
  });

  it('calcRowSales returns 0 for no payments', () => {
    expect(calcRowSales({ payments: [] })).toBe(0);
  });
});

describe('cycleExtension', () => {
  it('cycles null -> {minutes: 20} -> {minutes: 40} -> null', () => {
    const visit = { extensions: Array(10).fill(null) };

    cycleExtension(visit, 0);
    expect(visit.extensions[0]).toEqual({ minutes: 20 });

    cycleExtension(visit, 0);
    expect(visit.extensions[0]).toEqual({ minutes: 40 });

    cycleExtension(visit, 0);
    expect(visit.extensions[0]).toBeNull();
  });

  it('only mutates the extension at the given index', () => {
    const visit = { extensions: Array(10).fill(null) };

    cycleExtension(visit, 3);

    expect(visit.extensions[3]).toEqual({ minutes: 20 });
    expect(visit.extensions[0]).toBeNull();
    expect(visit.extensions[9]).toBeNull();
  });
});

describe('markComplete', () => {
  it('sets endTime, completed flag and completedAt', () => {
    const visit = { completed: false, endTime: '', completedAt: '' };

    markComplete(visit, '23:45');

    expect(visit.completed).toBe(true);
    expect(visit.endTime).toBe('23:45');
    expect(visit.completedAt).toBe('23:45');
  });
});

describe('calcDailyTotals', () => {
  it('aggregates customer count, total sales, card sales and average spend from completed visits', () => {
    const visits = [
      {
        completed: true,
        payments: [
          { method: '現金', amount: 5000 },
          { method: 'カード', amount: 3000 },
        ],
      },
      {
        completed: true,
        payments: [{ method: '売掛', amount: 4000 }],
      },
      {
        // 未完了の行は集計に含めない
        completed: false,
        payments: [{ method: '現金', amount: 99999 }],
      },
    ];

    const totals = calcDailyTotals(visits);

    expect(totals).toEqual({
      customerCount: 2,
      totalSales: 12000,
      cardSales: 3000,
      averageSpend: 6000,
    });
  });

  it('returns zeroed totals (averageSpend 0) when there are no completed visits', () => {
    const totals = calcDailyTotals([]);

    expect(totals).toEqual({
      customerCount: 0,
      totalSales: 0,
      cardSales: 0,
      averageSpend: 0,
    });
  });
});

describe('roundTimeTo5Minutes', () => {
  it.each([
    ['21:10', '21:10'],
    ['21:11', '21:10'],
    ['21:12', '21:10'],
    ['21:13', '21:15'],
    ['21:14', '21:15'],
    ['21:15', '21:15'],
    ['23:58', '00:00'],
  ])('rounds %s to %s (2捨3入の5分刻み)', (input, expected) => {
    expect(roundTimeTo5Minutes(input)).toBe(expected);
  });
});

describe('addMinutesToTime', () => {
  it('adds minutes within the same day', () => {
    expect(addMinutesToTime('20:00', 40)).toBe('20:40');
  });

  it('wraps to the next day when crossing midnight', () => {
    expect(addMinutesToTime('23:50', 20)).toBe('00:10');
  });
});

describe('createVisitInGroup', () => {
  it('creates a single visit that joins an existing group with the given startTime', () => {
    const visit = createVisitInGroup({
      store: 'STORE',
      date: '2026-06-10',
      groupId: 'g1',
      startTime: '21:00',
    });

    expect(visit).toMatchObject({
      store: 'STORE',
      date: '2026-06-10',
      groupId: 'g1',
      startTime: '21:00',
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
  });
});

describe('assignGroupNumbers', () => {
  it('assigns sequential numbers based on first appearance order of groupId', () => {
    const visits = [
      { groupId: 'g1' },
      { groupId: 'g1' },
      { groupId: 'g2' },
      { groupId: 'g3' },
      { groupId: 'g2' },
    ];

    const numbers = assignGroupNumbers(visits);

    expect(numbers.get('g1')).toBe(1);
    expect(numbers.get('g2')).toBe(2);
    expect(numbers.get('g3')).toBe(3);
  });
});
