import { useState } from 'react';
import { ref, push, set, get, query, orderByChild, equalTo } from 'firebase/database';
import { auth, db } from '../firebase';

export default function ShopSetup({ user, onDone, isAdmin, onAdmin, allowSkip = false }) {
  const [tab,  setTab]  = useState('create');
  const [f,    setF]    = useState({ name:'', type:'grocery', code:'' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const skipSetupForOffline = () => {
    localStorage.setItem(`meropasal_setup_skipped_${user.uid}`, 'true');
    onDone(null); // Pass null to indicate skipped setup
  };

  const createShop = async () => {
    if (!f.name.trim()) { setErr('पसलको नाम लेख्नुहोस्'); return; }
    setBusy(true); setErr('');
    try {
      const code = Math.random().toString(36).slice(2,8).toUpperCase();
      const shopRef = await push(ref(db, 'shops'), {
        name: f.name.trim(), type: f.type, code, ownerId: user.uid,
        plan: 'free', createdAt: Date.now(), status:'active',
        members: { [user.uid]: { role:'owner', joinedAt:Date.now() } }
      });
      await set(ref(db, `users/${user.uid}/shopId`), shopRef.key);
      await set(ref(db, `users/${user.uid}/name`), user.displayName || '');
      onDone(shopRef.key);
    } catch (e) { setErr('त्रुटि भयो: ' + e.message); }
    setBusy(false);
  };

  const joinShop = async () => {
    if (!f.code.trim()) { setErr('कोड लेख्नुहोस्'); return; }
    setBusy(true); setErr('');
    try {
      const snap = await get(ref(db, 'shops'));
      const shops = snap.val() || {};
      const entry = Object.entries(shops).find(([,s]) => s.code === f.code.trim().toUpperCase());
      if (!entry) { setErr('पसल फेला परेन'); setBusy(false); return; }
      const [shopId, shopData] = entry;
      // Always join with same UI — role can be set by owner later
      await set(ref(db, `shops/${shopId}/members/${user.uid}`), { role:'cashier', joinedAt:Date.now() });
      await set(ref(db, `users/${user.uid}/shopId`), shopId);
      await set(ref(db, `users/${user.uid}/name`), user.displayName || '');
      onDone(shopId);
    } catch (e) { setErr('त्रुटि भयो: ' + e.message); }
    setBusy(false);
  };

  const shopTypes = [['grocery','किराना'],['clothing','कपडा'],['electronics','इलेक्ट्रोनिक्स'],['pharmacy','फार्मेसी'],['restaurant','रेस्टुरेन्ट'],['other','अन्य']];

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#042f2e,#0f766e)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🪴</div>
          <h1 style={{ fontSize:26, fontWeight:900, color:'#fff', margin:'0 0 4px' }}>पसल सेटअप</h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.5)', margin:0 }}>पसल बनाउनुस् वा जोड्नुस्</p>
        </div>

        {isAdmin && onAdmin && (
          <button type="button" onClick={onAdmin} className="btn" style={{ width:'100%', marginBottom:12, background:'linear-gradient(135deg,#4338ca,#6d28d9)', color:'#fff', borderRadius:14, padding:'12px', fontWeight:700, fontSize:14, border:'none', cursor:'pointer' }}>
            🛡️ Admin Panel
          </button>
        )}

        <div style={{ background:'var(--card)', borderRadius:24, padding:'24px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
            {[['create','🏗️ नयाँ बनाउनुस्'],['join','🔗 कोडले जोड्नुस्']].map(([v,l])=>(
              <button key={v} onClick={()=>{setTab(v);setErr('');}} style={{ padding:'11px 6px', borderRadius:14, border:`2px solid ${tab===v?'var(--p3)':'var(--bdr)'}`, background:tab===v?'var(--pl)':'transparent', color:tab===v?'var(--p2)':'var(--sub)', fontWeight:700, fontSize:12, cursor:'pointer' }}>{l}</button>
            ))}
          </div>

          {allowSkip && !navigator.onLine && (
            <button type="button" onClick={skipSetupForOffline} style={{ width:'100%', marginBottom:12, padding:'10px', borderRadius:14, border:'2px solid var(--bdr)', background:'transparent', color:'var(--sub)', fontWeight:700, fontSize:12, cursor:'pointer' }}>
              📵 ऑफलाइन मोडमा प्रयोग गर्नुस्
            </button>
          )}

          {tab === 'create' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="पसलको नाम *" className="inp"/>
              <select value={f.type} onChange={e=>setF({...f,type:e.target.value})} className="inp">
                {shopTypes.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
              {err && <p style={{ color:'var(--red)', fontSize:13, margin:0 }}>{err}</p>}
              <button onClick={createShop} disabled={busy} className="btn Bp">
                {busy ? '...' : '✅ पसल बनाउनुस्'}
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <p style={{ fontSize:13, color:'var(--sub)', margin:0 }}>मालिकबाट ६ अक्षरे कोड लिनुस्</p>
              <input value={f.code} onChange={e=>setF({...f,code:e.target.value.toUpperCase()})} placeholder="कोड (जस्तै: ABC123)" className="inp" style={{ letterSpacing:4, fontSize:20, textAlign:'center', fontWeight:800 }} maxLength={6}/>
              {err && <p style={{ color:'var(--red)', fontSize:13, margin:0 }}>{err}</p>}
              <button onClick={joinShop} disabled={busy} className="btn Bp">
                {busy ? '...' : '🔗 पसल जोड्नुस्'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
