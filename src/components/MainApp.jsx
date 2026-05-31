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
  const [dark, setDark]   = useState(() => localStorage.getItem('meropasal_dark') === '1');
  const [lang, setLang]   = useState(() => localStorage.getItem('meropasal_lang') || 'ne');
  const [members, setMembers] = useState({});
  const [qType, setQType] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-dark', dark);
    localStorage.setItem('meropasal_dark', dark ? '1' : '0');
  }, [dark]);

  useEffect(() => {
    localStorage.setItem('meropasal_lang', lang);
  }, [lang]);

  useEffect(() => {
    const r = ref(db, `shops/${shopId}/members`);
    const u = onValue(r, s => setMembers(s.val() || {}));
    return () => u();
  }, [shopId]);

  useEffect(() => {
    const handler = () => oqFlush(toast);
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, []);

  const logout = () => { signOut(auth).then(onLogout); };

  const ownerNav = [
    { id:'dash',  icon:'home',     label:'Home' },
    { id:'party', icon:'users',    label:'Khata' },
    { id:'inv',   icon:'box',      label:'Items' },
    { id:'more',  icon:'settings', label:'More' },
  ];
  const cashierNav = [
    { id:'dash',  icon:'home',     label:'Home' },
    { id:'party', icon:'users',    label:'Khata' },
    { id:'bills', icon:'file',     label:'Items' },
    { id:'set',   icon:'settings', label:'More' },
  ];
  const activeNav = role === 'owner' ? ownerNav : cashierNav;

  const renderPage = () => {
    if (page === 'more') {
      return (
        <div className="page-wrap S FI">
          <header className="page-hdr">
            <h1 className="page-title">अझै</h1>
          </header>
          <div className="page-body" style={{ paddingTop:8 }}>
            {isAdmin && (
              <button type="button" onClick={onAdminPanel} className="cd admin-menu-card" style={{ width:'100%', marginBottom:4, display:'flex', alignItems:'center', gap:14, padding:'16px', cursor:'pointer', textAlign:'left' }}>
                <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#4338ca,#6d28d9)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Ic n="shield" s={24} c="#fff"/>
                </div>
                <div>
                  <p style={{ margin:0, fontSize:16, fontWeight:800, color:'#4338ca' }}>🛡️ Admin Panel</p>
                  <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--sub)' }}>पसल निलम्बित / सक्रिय गर्नुहोस्</p>
                </div>
              </button>
            )}
            {[
              { id:'inv', icon:'box', label:'सूची / स्टक', desc:'सामान व्यवस्थापन' },
              { id:'bills', icon:'file', label:'बिल', desc:'इनभ्वाइस हेर्नुहोस्' },
              { id:'set', icon:'settings', label:'सेटिङ', desc:'पसल, भाषा, सदस्य' },
            ].map(item => (
              <button key={item.id} type="button" onClick={() => setPage(item.id)} className="cd" style={{ width:'100%', marginBottom:8, display:'flex', alignItems:'center', gap:14, padding:'14px 16px', cursor:'pointer', border:'1px solid var(--bdr)', textAlign:'left' }}>
                <div style={{ width:44, height:44, borderRadius:12, background:'var(--pl)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Ic n={item.icon} s={22} c="var(--p2)"/>
                </div>
                <div>
                  <p style={{ margin:0, fontSize:15, fontWeight:700, color:'var(--txt)' }}>{item.label}</p>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--sub)' }}>{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }
    const pages = {
      dash:  <Dashboard  shopId={shopId} shopData={shopData} role={role} user={user} lang={lang} t={{}} onNav={setPage} onQuickTx={tp=>{setQType(tp);setPage('tx');}} isAdmin={isAdmin} onAdminPanel={onAdminPanel}/>,
      inv:   <Inventory  shopId={shopId} shopData={shopData} role={role} t={{}} lang={lang} toast={toast}/>,
      tx:    <Transactions shopId={shopId} shopData={shopData} role={role} t={{}} lang={lang} toast={toast} qType={qType} clearQ={()=>setQType(null)}/>,
      party: <Parties    shopId={shopId} t={{}} lang={lang} toast={toast}/>,
      rep:   <Reports    shopId={shopId} lang={lang} toast={toast}/>,
      bills: <Bills      shopId={shopId} shopData={shopData} lang={lang} toast={toast}/>,
      set:   <Settings   shopId={shopId} shopData={shopData} user={user} role={role} lang={lang} setLang={setLang} dark={dark} setDark={setDark} onLogout={logout} members={members} toast={toast} isAdmin={isAdmin} onAdminPanel={onAdminPanel}/>,
    };
    return pages[page] || pages.dash;
  };

  const navPage = ['inv','bills','set'].includes(page) ? 'more' : page;

  return (
    <div data-dark={dark} style={{ height:'100%' }}>
      <OfflineBanner onFlush={() => oqFlush(toast)}/>
      <div className="app-shell">

        <aside className="app-sidebar">
          <div style={{ marginBottom:20, padding:'0 6px' }}>
            <div className="brand-mark">🪴 Mero Pasal</div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--txt)', marginTop:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{shopData?.name}</div>
            <div className="brand-sub">{role === 'owner' ? '👑 मालिक' : '🔑 क्यासियर'}</div>
          </div>
          {isAdmin && (
            <button type="button" onClick={onAdminPanel} className="admin-nav-btn" style={{ borderRadius:11, marginBottom:12 }}>
              <Ic n="shield" s={14} c="#fff"/> Admin Panel
            </button>
          )}
          <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:2 }}>
            {(role === 'owner' ? [...ownerNav, { id:'inv', icon:'box', label:'सूची' }, { id:'bills', icon:'file', label:'बिल' }] : cashierNav).map(item => {
              const act = page === item.id || (item.id === 'more' && ['inv','bills','set'].includes(page));
              return (
                <button key={item.id} type="button" onClick={() => setPage(item.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, border:'none', background:act?'var(--pl)':'transparent', cursor:'pointer', color:act?'var(--p2)':'var(--sub)', fontWeight:act?700:500, fontSize:14, textAlign:'left', width:'100%' }}>
                  <Ic n={item.icon} s={18} c={act?'var(--p3)':'var(--sub)'}/>
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div style={{ borderTop:'1px solid var(--bdr)', paddingTop:10, display:'flex', flexDirection:'column', gap:4 }}>
            <button type="button" onClick={() => setDark(!dark)} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:11, border:'none', background:'transparent', cursor:'pointer', color:'var(--sub)', fontSize:13, width:'100%' }}>
              <span style={{ fontSize:16 }}>{dark ? '☀️' : '🌙'}</span> {dark ? 'Light' : 'Dark'}
            </button>
            <button type="button" onClick={logout} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:11, border:'none', background:'#fee2e2', cursor:'pointer', color:'var(--red)', fontSize:13, fontWeight:700, width:'100%' }}>
              <Ic n="logout" s={16} c="var(--red)"/> लगआउट
            </button>
          </div>
        </aside>

        <div className="app-content">
          {renderPage()}
        </div>

        <div className="BN">
          {isAdmin && (
            <button type="button" onClick={onAdminPanel} className="admin-nav-btn">
              <Ic n="shield" s={13} c="#fff"/> Admin
            </button>
          )}
          <div className="nav-inner">
            {activeNav.map(item => {
              const act = navPage === item.id;
              return (
                <button key={item.id} type="button" onClick={() => setPage(item.id)} className="nav-item">
                  <div className={`nav-ico ${act ? 'active' : ''}`}>
                    <Ic n={item.icon} s={18} c={act ? 'var(--p3)' : 'var(--sub)'}/>
                  </div>
                  <span className={`nav-lbl ${act ? 'active' : ''}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {isAdmin && (
        <button type="button" onClick={onAdminPanel} className="admin-fab" aria-label="Admin Panel">
          <Ic n="shield" s={18} c="#fff"/> Admin
        </button>
      )}
      <ToastComp toasts={toasts}/>
    </div>
  );
}
