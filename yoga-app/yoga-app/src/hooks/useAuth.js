import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, onValue } from 'firebase/database';
import { auth, db, ADMIN_EMAIL } from '../firebase';

export function useAuth() {
  const [user, setUser]       = useState(undefined); // undefined = loading
  const [shopId, setShopId]   = useState(null);
  const [shopData, setShopData] = useState(null);
  const [memberData, setMemberData] = useState({});
  const shopRef = { current: null };

  useEffect(() => {
    // Auth state — LOCAL persistence means this fires instantly on reload
    const unsub = onAuthStateChanged(auth, async u => {
      if (u) {
        setUser(u);
        try {
          const snap = await get(ref(db, `users/${u.uid}/shopId`));
          const sid = snap.val();
          if (sid) attachShop(sid, u);
        } catch (e) {
          console.warn('shopId fetch error', e);
        }
      } else {
        setUser(null);
        setShopId(null);
        setShopData(null);
        setMemberData({});
      }
    });
    return () => { unsub(); if (shopRef.current) shopRef.current(); };
  }, []);

  const attachShop = (sid, u) => {
    setShopId(sid);
    const r = ref(db, `shops/${sid}`);
    const unsub = onValue(r, snap => {
      const data = snap.val();
      if (data) {
        setShopData({ id: sid, ...data });
        const members = data.members || {};
        setMemberData(members[u?.uid || auth.currentUser?.uid] || {});
      }
    });
    shopRef.current = unsub;
  };

  // Role: admin email always = owner
  const role = user
    ? (user.email === ADMIN_EMAIL || shopData?.ownerId === user.uid
        ? 'owner'
        : memberData.role || 'cashier')
    : null;

  const isAdmin = user?.email === ADMIN_EMAIL;

  return { user, shopId, shopData, role, isAdmin, memberData, attachShop };
}
