const DB_VERSION = 2;

export function openDatabase(name = 'list-app-db') {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('visits')) {
        const visits = db.createObjectStore('visits', {
          keyPath: 'id',
          autoIncrement: true,
        });
        visits.createIndex('storeDate', ['store', 'date']);
      }

      if (!db.objectStoreNames.contains('casts')) {
        db.createObjectStore('casts', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }

      if (!db.objectStoreNames.contains('notePresets')) {
        db.createObjectStore('notePresets', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export function addVisit(db, visit) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('visits', 'readwrite');
    const request = tx.objectStore('visits').add(visit);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getVisitsByStoreAndDate(db, storeName, date) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('visits', 'readonly');
    const index = tx.objectStore('visits').index('storeDate');
    const request = index.getAll([storeName, date]);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function updateVisit(db, visit) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('visits', 'readwrite');
    const request = tx.objectStore('visits').put(visit);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function addCast(db, cast) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('casts', 'readwrite');
    const request = tx.objectStore('casts').add(cast);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getCasts(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('casts', 'readonly');
    const request = tx.objectStore('casts').getAll();
    request.onsuccess = () => {
      resolve(request.result.filter((cast) => cast.store === storeName));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function seedDefaultCasts(db, storeName, names) {
  const existing = await getCasts(db, storeName);
  if (existing.length > 0) {
    return;
  }

  for (const name of names) {
    await addCast(db, { store: storeName, name, working: true });
  }
}

export function updateCast(db, cast) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('casts', 'readwrite');
    const request = tx.objectStore('casts').put(cast);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function deleteCast(db, castId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('casts', 'readwrite');
    const request = tx.objectStore('casts').delete(castId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function deleteVisit(db, visitId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('visits', 'readwrite');
    const request = tx.objectStore('visits').delete(visitId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function addNotePreset(db, preset) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notePresets', 'readwrite');
    const request = tx.objectStore('notePresets').add(preset);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getNotePresets(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notePresets', 'readonly');
    const request = tx.objectStore('notePresets').getAll();
    request.onsuccess = () => {
      resolve(request.result.filter((preset) => preset.store === storeName));
    };
    request.onerror = () => reject(request.error);
  });
}

export function deleteNotePreset(db, presetId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notePresets', 'readwrite');
    const request = tx.objectStore('notePresets').delete(presetId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
