import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get, onValue } from 'firebase/database';
import { auth, db } from './firebase';
import { isAdminEmail } from './utils/admin';
import { oqFlush } from './utils/offlineQueue';
import { useToast } from './hooks/useToast';
import { ToastComp } from './components/UI';
import MainApp    from './components/MainApp';
import Auth       from './pages/Auth';
import ShopSetup  from './pages/ShopSetup';
import AdminPanel from './pages/AdminPanel';
import './index.css';

export default function App() {
  const [user,      setUser]      = useState(undefined); // undefined = checking auth
  const [shopId,    setShopId]    = useState(null);
  const [shopData,  setShopData]  = useState(null);
  const [memberData,setMemberData]= useState({});
  const [adminView, setAdminView] = useState(false);

  useEffect(() => {
    if (isAdminEmail(user?.email) && user && !shopId) setAdminView(true);
  }, [user?.email, user, shopId]);
  const { toasts, toast }         = useToast();
  const shopUnsub = useRef(null);

  // ── Auth state listener ────────────────────────────────────────────────────
  // Firebase LOCAL persistence means this fires instantly with cached user.
  // User will NEVER see Auth screen again until they explicitly log out.
  useEffect(() => {
    // Auth timeout: if Firebase takes >30s, unblock UI (increased for better UX)
    const timeout = setTimeout(() => {
      if (user === undefined) setUser(null);
    }, 30000);

    const unsub = onAuthStateChanged(auth, async u => {
      clearTimeout(timeout);
      if (u) {
        setUser(u);
        try {
          const snap = await get(ref(db, `users/${u.uid}/shopId`));
          if (snap.val()) attachShop(snap.val(), u.uid);
        } catch (e) { console.warn('shopId load', e); }
      } else {
        setUser(null);
        setShopId(null);
        setShopData(null);
        setMemberData({});
      }
    });

    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  // ── Sync offline queue on reconnect ───────────────────────────────────────
  useEffect(() => {
    const handler = () => oqFlush(toast);
    window.addEventListener('online', handler);
    // Also try immediately in case we're already online
    oqFlush(toast);
    return () => window.removeEventListener('online', handler);
  }, []);

  // ── Hide HTML splash once React renders ───────────────────────────────────
  useEffect(() => {
    const el = document.getElementById('pre-splash');
    if (el) el.style.display = 'none';
  }, []);

  const attachShop = (sid, uid) => {
    setShopId(sid);
    if (shopUnsub.current) shopUnsub.current();
    shopUnsub.current = onValue(ref(db, `shops/${sid}`), snap => {
      const data = snap.val();
      if (data) {
        setShopData({ id: sid, ...data });
        setMemberData((data.members || {})[uid] || {});
      }
    });
  };

  const logout = async () => {
    if (shopUnsub.current) shopUnsub.current();
    await signOut(auth);
    setUser(null); setShopId(null); setShopData(null); setMemberData({});
  };

  // ── Role calculation ───────────────────────────────────────────────────────
  // Admin email = always owner. Shop owner UID = owner. Others = cashier.
  // ALL members see the SAME app — role only controls what they can do.
  const role = !user ? null
    : (isAdminEmail(user.email) || shopData?.ownerId === user.uid)
      ? 'owner'
      : (memberData.role || 'cashier');

  const isAdmin = isAdminEmail(user?.email);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (user === undefined) return null; // HTML splash shows until this resolves

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) return (
    <>
      <Auth/>
      <ToastComp toasts={toasts}/>
    </>
  );

  // ── Admin panel ───────────────────────────────────────────────────────────
  if (isAdmin && adminView) return (
    <>
      <AdminPanel
        hasShop={!!shopId}
        toast={toast}
        onClose={() => setAdminView(false)}
      />
      <ToastComp toasts={toasts}/>
    </>
  );

  // ── Logged in but no shop ──────────────────────────────────────────────────
  if (!shopId || !shopData) return (
    <>
      <ShopSetup user={user} onDone={sid => attachShop(sid, user.uid)} isAdmin={isAdmin} onAdmin={() => setAdminView(true)}/>
      <ToastComp toasts={toasts}/>
    </>
  );

  // ── Suspended ─────────────────────────────────────────────────────────────
  if (shopData.status === 'suspended') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, padding:24, background:'var(--bg)' }}>
      <span style={{ fontSize:48 }}>🔒</span>
      <h2 style={{ fontWeight:900, color:'var(--txt)', margin:0 }}>पसल निलम्बित</h2>
      <p style={{ color:'var(--sub)', textAlign:'center' }}>Admin सम्पर्क गर्नुहोस्</p>
      {isAdmin && (
        <button type="button" onClick={() => setAdminView(true)} className="btn Bp" style={{ maxWidth:220 }}>Admin Panel</button>
      )}
      <button type="button" onClick={logout} className="btn Br" style={{ maxWidth:200 }}>लगआउट</button>
      <ToastComp toasts={toasts}/>
    </div>
  );

  // ── Main app ───────────────────────────────────────────────────────────────
  return (
    <>
      <MainApp
        user={user}
        shopId={shopId}
        shopData={shopData}
        role={role}
        isAdmin={isAdmin}
        toast={toast}
        toasts={toasts}
        onAdminPanel={() => setAdminView(true)}
        onLogout={logout}
      />
      <ToastComp toasts={toasts}/>
    </>
  );
}
