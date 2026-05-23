import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../firebase';
import { oqFlush } from '../utils/offlineQueue';
import { Ic, ToastComp, OfflineBanner } from './UI';
import Dashboard   from '../pages/Dashboard';
import Transactions from '../pages/Transactions';
import Parties     from '../pages/Parties';
import Inventory   from '../pages/Inventory';
import Reports     from '../pages/Reports';
import Bills       from '../pages/Bills';
import Settings    from '../pages/Settings';

export default function MainApp({ user, shopId, shopData, role, isAdmin, toast, toasts, onAdminPanel, onLogout }) {
  const [page, setPage]   = useState('dash');
  const [dark, setDark]   = useState(() => localStorage.getItem('yoga_dark') === '1');
  const [lang, setLang]   = useState(() => localStorage.getItem('yoga_lang') || 'ne');
  const [members, setMembers] = useState({});
  const [qType, setQType] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-dark', dark);
    localStorage.setItem('yoga_dark', dark ? '1' : '0');
  }, [dark]);

  useEffect(() => {
    localStorage.setItem('yoga_lang', lang);
  }, [lang]);

  useEffect(() => {
    const r = ref(db, `shops/${shopId}/members`);
    const u = onValue(r, s => setMembers(s.val() || {}));
    return () => u();
  }, [shopId]);

  // Sync offline queue when online
  useEffect(() => {
    const handler = () => oqFlush(toast);
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, []);

  const logout = () => { signOut(auth).then(onLogout); };

  const ownerNav = [
    { id:'dash',  icon:'home',     label:'ड्यासबोर्ड' },
    { id:'inv',   icon:'box',      label:'सूची' },
    { id:'tx',    icon:'money',    label:'कारोबार' },
    { id:'party', icon:'users',    label:'पार्टी' },
    { id:'rep',   icon:'chart',    label:'रिपोर्ट' },
    { id:'bills', icon:'file',     label:'बिल' },
    { id:'set',   icon:'settings', label:'सेटिङ' },
  ];
  const cashierNav = [
    { id:'dash',  icon:'home',     label:'ड्यासबोर्ड' },
    { id:'tx',    icon:'money',    label:'कारोबार' },
    { id:'bills', icon:'file',     label:'बिल' },
    { id:'set',   icon:'settings', label:'सेटिङ' },
  ];
  const activeNav = role === 'owner' ? ownerNav : cashierNav;

  const pages = {
    dash:  <Dashboard  shopId={shopId} shopData={shopData} role={role} user={user} lang={lang} t={{}} onNav={setPage} onQuickTx={tp=>{setQType(tp);setPage('tx');}}/>,
    inv:   <Inventory  shopId={shopId} shopData={shopData} role={role} t={{}} lang={lang} toast={toast}/>,
    tx:    <Transactions shopId={shopId} shopData={shopData} role={role} t={{}} lang={lang} toast={toast} qType={qType} clearQ={()=>setQType(null)}/>,
    party: <Parties    shopId={shopId} t={{}} lang={lang} toast={toast}/>,
    rep:   <Reports    shopId={shopId} lang={lang} toast={toast}/>,
    bills: <Bills      shopId={shopId} shopData={shopData} lang={lang} toast={toast}/>,
    set:   <Settings   shopId={shopId} shopData={shopData} user={user} role={role} lang={lang} setLang={setLang} dark={dark} setDark={setDark} onLogout={logout} members={members} toast={toast}/>,
  };

  return (
    <div data-dark={dark} style={{ height:'100%' }}>
      <OfflineBanner onFlush={() => oqFlush(toast)}/>
      <div className="app-shell">

        {/* Sidebar — desktop only */}
        <aside className="app-sidebar">
          <div style={{ marginBottom:24,padding:'0 6px' }}>
            <div style={{ fontSize:22,fontWeight:900,letterSpacing:1,color:'var(--p2)' }}>🪴 Yoga</div>
            <div style={{ fontSize:13,fontWeight:700,color:'var(--txt)',marginTop:5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{shopData?.name}</div>
            <div style={{ fontSize:11,color:'var(--sub)',marginTop:2 }}>{role === 'owner' ? '👑 मालिक' : '🔑 क्यासियर'}</div>
          </div>
          {isAdmin && (
            <button onClick={onAdminPanel} style={{ width:'100%',background:'linear-gradient(135deg,#4338ca,#6d28d9)',border:'none',borderRadius:11,padding:'9px 12px',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
              <Ic n="shield" s={13} c="#fff"/> Admin Panel
            </button>
          )}
          <nav style={{ flex:1,display:'flex',flexDirection:'column',gap:3 }}>
            {activeNav.map(item => {
              const act = page === item.id;
              return (
                <button key={item.id} onClick={()=>setPage(item.id)} style={{ display:'flex',alignItems:'center',gap:10,padding:'11px 12px',borderRadius:12,border:'none',background:act?'var(--pl)':'transparent',cursor:'pointer',color:act?'var(--p2)':'var(--sub)',fontWeight:act?700:500,fontSize:14,textAlign:'left',width:'100%',transition:'background .15s' }}>
                  <Ic n={item.icon} s={18} c={act?'var(--p3)':'var(--sub)'}/>
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div style={{ borderTop:'1px solid var(--bdr)',paddingTop:10,display:'flex',flexDirection:'column',gap:4 }}>
            <button onClick={()=>setDark(!dark)} style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:11,border:'none',background:'transparent',cursor:'pointer',color:'var(--sub)',fontSize:13,width:'100%' }}>
              <span style={{ fontSize:16 }}>{dark?'☀️':'🌙'}</span> {dark?'Light Mode':'Dark Mode'}
            </button>
            <button onClick={logout} style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:11,border:'none',background:'#fee2e2',cursor:'pointer',color:'var(--red)',fontSize:13,fontWeight:700,width:'100%' }}>
              <Ic n="logout" s={16} c="var(--red)"/> लगआउट
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="app-content">
          {pages[page] || pages.dash}
        </div>

        {/* Bottom nav — mobile only */}
        <div className="BN">
          {isAdmin && (
            <button onClick={onAdminPanel} style={{ width:'100%',background:'linear-gradient(135deg,#4338ca,#6d28d9)',border:'none',padding:'6px 16px',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
              <Ic n="shield" s={13} c="#fff"/> Admin Panel
            </button>
          )}
          <div style={{ display:'flex' }}>
            {activeNav.map(item => {
              const act = page === item.id;
              return (
                <button key={item.id} onClick={()=>setPage(item.id)} style={{ flex:1,border:'none',background:'transparent',padding:'6px 0 9px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2 }}>
                  <div style={{ width:34,height:27,borderRadius:9,background:act?'var(--pl)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'background .2s' }}>
                    <Ic n={item.icon} s={18} c={act?'var(--p3)':'var(--sub)'}/>
                  </div>
                  <span style={{ fontSize:9,fontWeight:act?700:500,color:act?'var(--p3)':'var(--sub)',lineHeight:1 }}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <ToastComp toasts={toasts}/>
    </div>
  );
}
