import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, addVisit, getVisitsByStoreAndDate, updateVisit, deleteVisit } from '../js/db.js';
import { addCast, getCasts, seedDefaultCasts, updateCast, deleteCast } from '../js/db.js';
import { addNotePreset, getNotePresets, deleteNotePreset } from '../js/db.js';

describe('openDatabase', () => {
  it('creates visits, casts, and notePresets object stores with expected indexes', async () => {
    const db = await openDatabase('test-db-1');

    expect(Array.from(db.objectStoreNames)).toEqual(
      expect.arrayContaining(['visits', 'casts', 'notePresets'])
    );

    const tx = db.transaction('visits', 'readonly');
    const store = tx.objectStore('visits');
    expect(Array.from(store.indexNames)).toContain('storeDate');

    db.close();
  });
});

describe('visits CRUD', () => {
  it('adds a visit and retrieves it by store and date', async () => {
    const db = await openDatabase('test-db-2');

    const visit = {
      store: 'STORE',
      date: '2026-06-10',
      groupId: 'g1',
      startTime: '20:00',
      table: '1',
    };

    const id = await addVisit(db, visit);
    expect(typeof id).toBe('number');

    const results = await getVisitsByStoreAndDate(db, 'STORE', '2026-06-10');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id, table: '1', groupId: 'g1' });

    db.close();
  });

  it('updates an existing visit', async () => {
    const db = await openDatabase('test-db-3');

    const visit = {
      store: '8Door',
      date: '2026-06-10',
      groupId: 'g2',
      startTime: '21:00',
      table: '5',
    };

    const id = await addVisit(db, visit);
    const [stored] = await getVisitsByStoreAndDate(db, '8Door', '2026-06-10');
    stored.table = '7';
    await updateVisit(db, stored);

    const [updated] = await getVisitsByStoreAndDate(db, '8Door', '2026-06-10');
    expect(updated.table).toBe('7');
    expect(updated.id).toBe(id);

    db.close();
  });
});

describe('casts', () => {
  it('seeds default casts only once and lists them by store', async () => {
    const db = await openDatabase('test-db-4');

    await seedDefaultCasts(db, 'STORE', ['マイ', 'リン', 'カリン']);
    await seedDefaultCasts(db, 'STORE', ['マイ', 'リン', 'カリン']);

    const casts = await getCasts(db, 'STORE');
    expect(casts).toHaveLength(3);
    expect(casts.map((c) => c.name)).toEqual(['マイ', 'リン', 'カリン']);
    expect(casts.every((c) => c.store === 'STORE')).toBe(true);

    db.close();
  });

  it('addCast adds a single cast for a store', async () => {
    const db = await openDatabase('test-db-5');

    await addCast(db, { store: '8Door', name: 'サキ', working: true });
    const casts = await getCasts(db, '8Door');

    expect(casts).toHaveLength(1);
    expect(casts[0]).toMatchObject({ store: '8Door', name: 'サキ', working: true });

    db.close();
  });
});

describe('casts CRUD - update/delete', () => {
  it('updateCast updates name and working flag', async () => {
    const db = await openDatabase('test-db-6');
    const id = await addCast(db, { store: 'STORE', name: 'マイ', working: true });

    await updateCast(db, { id, store: 'STORE', name: 'マイコ', working: false });

    const casts = await getCasts(db, 'STORE');
    expect(casts).toHaveLength(1);
    expect(casts[0]).toMatchObject({ id, name: 'マイコ', working: false });

    db.close();
  });

  it('deleteCast removes a cast', async () => {
    const db = await openDatabase('test-db-7');
    const id1 = await addCast(db, { store: 'STORE', name: 'マイ', working: true });
    const id2 = await addCast(db, { store: 'STORE', name: 'リン', working: true });

    await deleteCast(db, id1);

    const casts = await getCasts(db, 'STORE');
    expect(casts).toHaveLength(1);
    expect(casts[0].id).toBe(id2);

    db.close();
  });
});

describe('visits CRUD - delete', () => {
  it('deleteVisit removes a visit by id', async () => {
    const db = await openDatabase('test-db-8');

    const id1 = await addVisit(db, {
      store: 'STORE',
      date: '2026-06-10',
      groupId: 'g1',
      startTime: '20:00',
    });
    const id2 = await addVisit(db, {
      store: 'STORE',
      date: '2026-06-10',
      groupId: 'g2',
      startTime: '21:00',
    });

    await deleteVisit(db, id1);

    const results = await getVisitsByStoreAndDate(db, 'STORE', '2026-06-10');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(id2);

    db.close();
  });
});

describe('notePresets CRUD', () => {
  it('addNotePreset adds a preset and getNotePresets retrieves it by store', async () => {
    const db = await openDatabase('test-db-9');

    const id = await addNotePreset(db, {
      store: 'STORE',
      text: '常連',
    });
    expect(typeof id).toBe('number');

    const presets = await getNotePresets(db, 'STORE');
    expect(presets).toHaveLength(1);
    expect(presets[0]).toMatchObject({ id, text: '常連' });

    db.close();
  });

  it('getNotePresets filters by store', async () => {
    const db = await openDatabase('test-db-10');

    await addNotePreset(db, { store: 'STORE', text: '常連' });
    await addNotePreset(db, { store: '8Door', text: '新規' });

    const loveLimitPresets = await getNotePresets(db, 'STORE');
    const doorPresets = await getNotePresets(db, '8Door');

    expect(loveLimitPresets).toHaveLength(1);
    expect(loveLimitPresets[0].text).toBe('常連');
    expect(doorPresets).toHaveLength(1);
    expect(doorPresets[0].text).toBe('新規');

    db.close();
  });

  it('deleteNotePreset removes a preset', async () => {
    const db = await openDatabase('test-db-11');

    const id1 = await addNotePreset(db, { store: 'STORE', text: '常連' });
    const id2 = await addNotePreset(db, { store: 'STORE', text: '新規' });

    await deleteNotePreset(db, id1);

    const presets = await getNotePresets(db, 'STORE');
    expect(presets).toHaveLength(1);
    expect(presets[0].id).toBe(id2);

    db.close();
  });
});
