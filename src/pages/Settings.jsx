import { useState, useEffect } from 'react';
import { ref, set, get } from 'firebase/database';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { Sec, Row, Switch, Modal, Ic } from '../components/UI';
import { hardRefreshApp } from '../utils/refreshApp';

export default function Settings({ shopId, shopData, user, role, lang, setLang, dark, setDark, onLogout, members, toast, isAdmin, onAdminPanel }) {
  const [copied, setCopied]   = useState(false);
  const [editN,  setEditN]    = useState(false);
  const [uName,  setUName]    = useState('');
  const [showPin,setShowPin]  = useState(false);
  const hasPin = !!localStorage.getItem(`meropasal_pin_${shopId}`);

  const copyCode = () => {
    navigator.clipboard?.writeText(shopData?.code || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const saveDisplayName = async () => {
    if (!uName.trim()) return;
    try {
      await updateProfile(auth.currentUser, { displayName: uName.trim() });
      await set(ref(db, `users/${user.uid}/name`), uName.trim());
      toast('नाम अपडेट ✓'); setEditN(false);
    } catch { toast('त्रुटि भयो'); }
  };

  const qCount = () => { try { return JSON.parse(localStorage.getItem('meropasal_offline_queue')||'[]').length; } catch { return 0; } };

  return (
    <div className="page-wrap S FI">
      <header className="page-hdr">
        <h1 className="page-title">सेटिङ</h1>
      </header>
      <div className="page-body">
        {isAdmin && onAdminPanel && (
          <button type="button" onClick={onAdminPanel} className="cd admin-menu-card" style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'16px', cursor:'pointer', border:'none', textAlign:'left', marginBottom:4 }}>
            <span style={{ fontSize:28 }}>🛡️</span>
            <div>
              <p style={{ margin:0, fontSize:16, fontWeight:800, color:'#4338ca' }}>Admin Panel खोल्नुहोस्</p>
              <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--sub)' }}>सबै पसल हेर्नुहोस् · निलम्बित गर्नुहोस्</p>
            </div>
          </button>
        )}
        {/* Profile card */}
        <div style={{ background:'linear-gradient(135deg,#0f766e,#134e4a)',borderRadius:24,padding:'22px',marginBottom:16,color:'#fff' }}>
          <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:14 }}>
            <div style={{ width:56,height:56,borderRadius:18,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:900 }}>
              {(user?.displayName||user?.email||'?')[0].toUpperCase()}
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <p style={{ fontSize:17,fontWeight:800,color:'#fff',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user?.displayName || 'प्रयोगकर्ता'}</p>
              <p style={{ fontSize:12,color:'rgba(255,255,255,.6)',margin:'2px 0 0',overflow:'hidden',textOverflow:'ellipsis' }}>{user?.email}</p>
            </div>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <span style={{ background:'rgba(255,255,255,.15)',color:'rgba(255,255,255,.8)',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20 }}>
              {role === 'owner' ? '👑 मालिक' : '🔑 क्यासियर'}
            </span>
          </div>
        </div>

        {/* Shop info */}
        <Sec title="पसल">
          <Row icon="🪴" label={shopData?.name || 'पसल'} right={<span style={{ fontSize:12,color:'var(--sub)' }}>{shopData?.type||''}</span>}/>
          <Row icon="🔑" label="पसल कोड" last right={
            <button onClick={copyCode} style={{ background:'var(--pl)',border:'none',borderRadius:10,padding:'5px 12px',fontSize:12,fontWeight:700,color:'var(--p2)',cursor:'pointer' }}>
              {copied ? '✓ कपी' : shopData?.code}
            </button>
          }/>
        </Sec>

        {/* Members (owner only) */}
        {role === 'owner' && (
          <Sec title="👥 सदस्यहरू">
            {Object.entries(members).length === 0 && <p style={{ fontSize:13,color:'var(--sub)',padding:'8px 12px',margin:0 }}>कुनै सदस्य छैन</p>}
            {Object.entries(members).map(([uid, m], i, arr) => (
              <div key={uid} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px',borderBottom: i<arr.length-1?'1px solid var(--bdr)':'none' }}>
                <div style={{ width:38,height:38,borderRadius:12,background:'var(--pl)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:'var(--p2)' }}>
                  {uid.slice(0,1).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13,fontWeight:700,color:'var(--txt)',margin:0 }}>Member</p>
                  <span style={{ fontSize:11,background:m.role==='owner'?'#f0fdfa':'#f8fafc',color:m.role==='owner'?'#0f766e':'var(--sub)',padding:'2px 8px',borderRadius:10,fontWeight:700 }}>
                    {m.role==='owner'?'👑 मालिक':'🔑 क्यासियर'}
                  </span>
                </div>
                {uid !== user?.uid && (
                  <button onClick={async()=>{
                    const nr = m.role==='owner'?'cashier':'owner';
                    await set(ref(db,`shops/${shopId}/members/${uid}/role`),nr);
                    toast('भूमिका अपडेट ✓');
                  }} style={{ background:m.role==='owner'?'#fef2f2':'#f0fdfa',border:'none',borderRadius:10,padding:'6px 12px',fontSize:12,fontWeight:700,color:m.role==='owner'?'var(--red)':'var(--p2)',cursor:'pointer' }}>
                    {m.role==='owner'?'↓ Cashier':'↑ Owner'}
                  </button>
                )}
              </div>
            ))}
          </Sec>
        )}

        {/* App cache */}
        <Sec title="एप">
          <Row
            icon="🔄"
            label="एप रिफ्रेश (पुरानो डेटा मेटाउने)"
            onClick={() => hardRefreshApp()}
            last
          />
        </Sec>

        {/* Preferences */}
        <Sec title="प्राथमिकताहरू">
          <Row icon="🌐" label="भाषा / Language" right={
            <div style={{ display:'flex',gap:6 }}>
              {['ne','en'].map(l=>(
                <button key={l} onClick={()=>setLang(l)} style={{ padding:'4px 12px',borderRadius:10,border:`2px solid ${lang===l?'var(--p3)':'var(--bdr)'}`,background:lang===l?'var(--pl)':'transparent',color:lang===l?'var(--p2)':'var(--sub)',fontSize:12,fontWeight:700,cursor:'pointer' }}>{l==='ne'?'नेपाली':'English'}</button>
              ))}
            </div>
          }/>
          <Row icon={dark?'☀️':'🌙'} label={dark?'Light Mode':'Dark Mode'} right={<Switch on={dark} onChange={setDark}/>} last/>
        </Sec>

        {/* Offline queue */}
        {qCount() > 0 && (
          <Sec title="📵 ऑफलाइन डेटा">
            <Row icon="🔄" label={`${qCount()} रेकर्ड सिंक बाँकी`} last/>
          </Sec>
        )}

        {/* Account */}
        <Sec title="Account">
          <Row icon="✏️" label="नाम परिवर्तन" onClick={()=>{setUName(user?.displayName||'');setEditN(true);}}/>
          <Row icon="🚪" label="लगआउट" onClick={onLogout} danger last/>
        </Sec>

        {/* About */}
        <Sec title="About">
          <Row icon="🪴" label="Mero Pasal Smart Business App" right={<span style={{ fontSize:12,color:'var(--sub)' }}>v6.0</span>}/>
          <Row icon="🔒" label="डेटा सुरक्षित र ब्याकअप" right={<span style={{ fontSize:11,background:'#f0fdfa',color:'#0f766e',padding:'2px 8px',borderRadius:10,fontWeight:700 }}>✓</span>}/>
          <Row icon="📜" label="Privacy Policy" last onClick={()=>window.open('https://yogesh10-tech.github.io/yoga-privacy-policy','_blank')}/>
        </Sec>
      </div>

      {editN && (
        <Modal onClose={()=>setEditN(false)} title="नाम परिवर्तन">
          <input value={uName} onChange={e=>setUName(e.target.value)} placeholder="तपाईंको नाम" className="inp" style={{ marginBottom:14 }}/>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <button onClick={()=>setEditN(false)} className="btn Bo">रद्द</button>
            <button onClick={saveDisplayName} className="btn Bp">सुरक्षित</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
