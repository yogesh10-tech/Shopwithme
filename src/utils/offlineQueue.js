import { ref, push, set, update, get } from 'firebase/database';
import { db } from '../firebase';

const OQ_KEY = 'yoga_offline_queue';

export const oqLoad = () => { try { return JSON.parse(localStorage.getItem(OQ_KEY) || '[]'); } catch { return []; } };
export const oqSave = q => localStorage.setItem(OQ_KEY, JSON.stringify(q));
export const oqAdd = item => {
  const q = oqLoad();
  q.push({ ...item, _qid: Math.random().toString(36).slice(2), _qts: Date.now() });
  oqSave(q);
};

export const oqFlush = async (onToast) => {
  const q = oqLoad();
  if (!q.length) return;
  const done = [];
  for (const item of q) {
    try {
      const r = ref(db, item.path);
      if (item.op === 'push') await push(r, item.data);
      else if (item.op === 'set') await set(r, item.data);
      else if (item.op === 'update') await update(r, item.data);
      else if (item.op === 'stockDelta') {
        const snap = await get(r);
        await set(r, (Number(snap.val()) || 0) + item.data.delta);
      }
      done.push(item._qid);
    } catch { break; }
  }
  oqSave(q.filter(i => !done.includes(i._qid)));
  if (done.length && onToast) onToast(`${done.length} ऑफलाइन रेकर्ड सिंक ✓`);
};

// Smart write: queues offline, writes online
export const smartPush = async (path, data) => {
  if (navigator.onLine) {
    return push(ref(db, path), data);
  } else {
    oqAdd({ op: 'push', path, data });
    return { key: `offline_${Date.now()}` };
  }
};

export const smartSet = async (path, data) => {
  if (navigator.onLine) {
    return set(ref(db, path), data);
  } else {
    oqAdd({ op: 'set', path, data });
  }
};

export const smartUpdate = async (path, data) => {
  if (navigator.onLine) {
    return update(ref(db, path), data);
  } else {
    oqAdd({ op: 'update', path, data });
  }
};
