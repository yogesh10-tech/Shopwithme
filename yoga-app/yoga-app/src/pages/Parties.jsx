import { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove, get } from 'firebase/database';
import { db } from '../firebase';
import { fmt, fmtBS, oa, tsToDateStr, dateStrToTs } from '../utils/date';
import { smartPush, smartUpdate, oqAdd } from '../utils/offlineQueue';
import { Modal, Ic, CalcModal } from './UI';

export default function Parties({ shopId, t, lang, toast }) {
  const [parties, setParties] = useState([]);
  const [ledger,  setLedger]  = useState([]);
  const [tab,   setTab]   = useState('customer');
  const [sel,   setSel]   = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [txModal,  setTxModal]  = useState(null); // 'cred' | 'pay'
  const [editModal,setEditModal]= useState(null); // party id
  const [editName, setEditName] = useState('');
  const [cf, setCf] = useState({ name:'', type:'customer', phone:'', addr:'' });
  const [tf, setTf] = useState({ amount:'', desc:'', date: tsToDateStr(Date.now()) });
  const [busy, setBusy]   = useState(false);
  const [showCalc,setShowCalc] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const r1 = ref(db, `shops/${shopId}/parties`);
    const r2 = ref(db, `shops/${shopId}/ledger`);
    const u1 = onValue(r1, s => setParties(oa(s.val()).sort((a,b)=>(a.name||'').localeCompare(b.name||''))));
    const u2 = onValue(r2, s => setLedger(oa(s.val())));
    return () => { u1(); u2(); };
  }, [shopId]);

  const selP = sel ? parties.find(p => p.id === sel) : null;
  const selLedger = selP ? ledger.filter(l => l.partyId === selP.id).sort((a,b) => (b.createdAt||0)-(a.createdAt||0)) : [];
  const filtered = parties.filter(p => p.type === tab && (!search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search)));
  const totalUdharo = filtered.reduce((s,p) => s + Math.max(0, p.balance||0), 0);

  const addParty = async () => {
    if (!cf.name.trim()) return;
    setBusy(true);
    try {
      const data = { ...cf, balance: 0, createdAt: Date.now() };
      if (navigator.onLine) {
        await push(ref(db, `shops/${shopId}/parties`), data);
      } else {
        oqAdd({ op:'push', path:`shops/${shopId}/parties`, data });
        toast('📵 ऑफलाइन — सिंक हुनेछ');
      }
      toast('पार्टी थपियो ✓');
      setCf({ name:'', type:'customer', phone:'', addr:'' });
      setAddModal(false);
    } catch { toast('त्रुटि भयो'); }
    setBusy(false);
  };

  const doTx = async () => {
    if (!tf.amount || !selP) return;
    setBusy(true);
    try {
      const amt = parseFloat(tf.amount);
      const isCred = txModal === 'cred';
      const txTs = dateStrToTs(tf.date);
      const delta = selP.type === 'customer' ? (isCred ? amt : -amt) : (isCred ? -amt : amt);
      const newBal = (selP.balance || 0) + delta;
      const ledgerData = { partyId: selP.id, type: txModal, amount: amt, description: tf.desc || (isCred ? 'उधारो' : 'भुक्तानी'), createdAt: txTs, recordedAt: Date.now() };

      if (navigator.onLine) {
        await set(ref(db, `shops/${shopId}/parties/${selP.id}/balance`), newBal);
        await push(ref(db, `shops/${shopId}/ledger`), ledgerData);
      } else {
        oqAdd({ op:'set', path:`shops/${shopId}/parties/${selP.id}/balance`, data: newBal });
        oqAdd({ op:'push', path:`shops/${shopId}/ledger`, data: ledgerData });
        toast('📵 ऑफलाइन — सिंक हुनेछ');
      }
      toast(isCred ? 'उधारो थपियो ✓' : 'भुक्तानी थपियो ✓');
      setTxModal(null);
      setTf({ amount:'', desc:'', date: tsToDateStr(Date.now()) });
    } catch { toast('त्रुटि भयो'); }
    setBusy(false);
  };

  const deleteParty = async id => {
    if (!window.confirm('यो पार्टी हटाउने? सबै डेटा जान्छ।')) return;
    try {
      await remove(ref(db, `shops/${shopId}/parties/${id}`));
      const lSnap = await get(ref(db, `shops/${shopId}/ledger`));
      const lData = lSnap.val() || {};
      await Promise.all(Object.entries(lData).filter(([,v])=>v.partyId===id).map(([k])=>remove(ref(db,`shops/${shopId}/ledger/${k}`))));
      toast('हटाइयो ✓'); setSel(null);
    } catch { toast('त्रुटि भयो'); }
  };

  const savePartyName = async () => {
    if (!editName.trim() || !editModal) return;
    try { await set(ref(db, `shops/${shopId}/parties/${editModal}/name`), editName.trim()); toast('नाम अपडेट ✓'); }
    catch { toast('त्रुटि भयो'); }
    setEditModal(null); setEditName('');
  };

  const sendWA = p => {
    if (!p.phone) return;
    const bal = Math.abs(p.balance || 0);
    const msg = `नमस्ते ${p.name}जी, तपाईंको ${shopId} मा उधारो बाँकी: ${fmt(bal)} छ। कृपया भुक्तानी गर्नुहोस्।`;
    window.open(`https://wa.me/977${p.phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Party detail view
  if (selP) return (
    <div className="S FI" style={{ height:'100%', paddingBottom:76 }}>
      <div style={{ padding:'16px 16px 0' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
          <button onClick={()=>setSel(null)} style={{ width:36,height:36,background:'var(--bg)',border:'1px solid var(--bdr)',borderRadius:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Ic n="back" s={18} c="var(--txt)"/>
          </button>
          <div style={{ flex:1,minWidth:0 }}>
            <h1 style={{ fontSize:19,fontWeight:800,color:'var(--txt)',margin:0 }}>{selP.name}</h1>
            <p style={{ fontSize:12,color:'var(--sub)',margin:'2px 0 0' }}>{selP.type==='customer'?'ग्राहक':'आपूर्तिकर्ता'}{selP.phone?` · ${selP.phone}`:''}</p>
          </div>
          <div style={{ display:'flex',gap:6 }}>
            <button onClick={()=>{setEditModal(selP.id);setEditName(selP.name||'');}} style={{ width:34,height:34,background:'#eff6ff',border:'none',borderRadius:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Ic n="edit" s={15} c="#2563eb"/></button>
            {selP.phone && <button onClick={()=>sendWA(selP)} style={{ width:34,height:34,background:'#dcfce7',border:'none',borderRadius:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Ic n="wa" s={17} c="#25d366"/></button>}
            <button onClick={()=>deleteParty(selP.id)} style={{ width:34,height:34,background:'#fef2f2',border:'none',borderRadius:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Ic n="trash" s={15} c="#dc2626"/></button>
          </div>
        </div>

        {/* Balance card */}
        <div style={{ background:`linear-gradient(135deg,${(selP.balance||0)>0?'#7c3aed,#a855f7':'#0f766e,#14b8a6'})`,borderRadius:20,padding:'20px',marginBottom:14,color:'#fff' }}>
          <p style={{ fontSize:12,opacity:.7,margin:'0 0 4px' }}>{(selP.balance||0)>0?'उधारो बाँकी':'कुनै उधारो छैन'}</p>
          <p style={{ fontSize:32,fontWeight:900,margin:0 }}>{fmt(Math.abs(selP.balance||0))}</p>
        </div>

        {/* Action buttons */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16 }}>
          <button onClick={()=>setTxModal('cred')} style={{ background:'#fef2f2',border:'2px solid #fecaca',borderRadius:14,padding:'12px',cursor:'pointer',fontWeight:700,fontSize:14,color:'#dc2626' }}>
            + उधारो थप्नुस्
          </button>
          <button onClick={()=>setTxModal('pay')} style={{ background:'#f0fdfa',border:'2px solid #99f6e4',borderRadius:14,padding:'12px',cursor:'pointer',fontWeight:700,fontSize:14,color:'#0f766e' }}>
            ✓ भुक्तानी
          </button>
        </div>

        {/* Ledger entries */}
        <p style={{ fontSize:13,fontWeight:700,color:'var(--sub)',margin:'0 0 8px' }}>कारोबार इतिहास</p>
        {selLedger.length === 0 && <p style={{ fontSize:13,color:'var(--sub)',textAlign:'center',padding:'24px 0' }}>कुनै कारोबार छैन</p>}
        {selLedger.map(l => (
          <div key={l.id} className="cd" style={{ marginBottom:8,display:'flex',alignItems:'center',gap:12,padding:'12px 14px' }}>
            <div style={{ width:36,height:36,borderRadius:12,background:l.type==='cred'?'#fef2f2':'#f0fdfa',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>
              {l.type==='cred'?'📋':'✅'}
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13,fontWeight:600,color:'var(--txt)',margin:0 }}>{l.description}</p>
              <p style={{ fontSize:11,color:'var(--sub)',margin:'2px 0 0' }}>{fmtBS(l.createdAt,lang)}</p>
            </div>
            <p style={{ fontSize:14,fontWeight:700,color:l.type==='cred'?'#dc2626':'#0f766e',margin:0 }}>
              {l.type==='cred'?'+':'-'}{fmt(l.amount)}
            </p>
          </div>
        ))}
      </div>

      {/* Edit name modal */}
      {editModal && (
        <Modal onClose={()=>{setEditModal(null);setEditName('');}} title="नाम परिवर्तन">
          <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="नाम" className="inp" style={{ marginBottom:14 }}/>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <button onClick={()=>{setEditModal(null);setEditName('');}} className="btn Bo">रद्द</button>
            <button onClick={savePartyName} className="btn Bp">सुरक्षित</button>
          </div>
        </Modal>
      )}

      {/* Tx modal */}
      {txModal && (
        <>
          <Modal onClose={()=>setTxModal(null)} title={txModal==='cred'?'उधारो थप्नुस्':'भुक्तानी थप्नुस्'}>
            <div style={{ display:'flex',flexDirection:'column',gap:11 }}>
              <div>
                <label style={{ fontSize:12,color:'var(--sub)',fontWeight:600,display:'block',marginBottom:4 }}>📅 मिति</label>
                <input type="date" value={tf.date} onChange={e=>setTf({...tf,date:e.target.value})} max={tsToDateStr(Date.now())} className="inp"/>
              </div>
              <div style={{ position:'relative' }}>
                <input value={tf.amount} onChange={e=>setTf({...tf,amount:e.target.value})} type="number" placeholder="रकम" className="inp" style={{ paddingRight:48 }}/>
                <button onClick={()=>setShowCalc(true)} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',width:32,height:32,background:'var(--pl)',border:'none',borderRadius:10,cursor:'pointer',fontSize:16 }}>🧮</button>
              </div>
              <input value={tf.desc} onChange={e=>setTf({...tf,desc:e.target.value})} placeholder="विवरण (वैकल्पिक)" className="inp"/>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:18 }}>
              <button onClick={()=>setTxModal(null)} className="btn Bo">रद्द</button>
              <button onClick={doTx} disabled={busy} className="btn Bp">{busy?'...':'सुरक्षित'}</button>
            </div>
          </Modal>
          {showCalc && <CalcModal initial={tf.amount} onDone={v=>setTf({...tf,amount:v})} onClose={()=>setShowCalc(false)}/>}
        </>
      )}
    </div>
  );

  return (
    <div className="S FI" style={{ height:'100%', paddingBottom:76 }}>
      <div style={{ padding:'16px 16px 0' }}>
        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
          <h1 style={{ fontSize:22,fontWeight:900,color:'var(--txt)',margin:0 }}>👥 पार्टी</h1>
          <button onClick={()=>setAddModal(true)} style={{ background:'var(--p2)',border:'none',borderRadius:14,padding:'10px 16px',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}>
            <Ic n="plus" s={14} c="#fff"/> थप
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
          {[['customer','👤 ग्राहक'],['supplier','🏢 आपूर्तिकर्ता']].map(([v,l]) => (
            <button key={v} onClick={()=>setTab(v)} style={{ padding:'11px',borderRadius:14,border:`2px solid ${tab===v?'var(--p3)':'var(--bdr)'}`,background:tab===v?'var(--pl)':'var(--card)',color:tab===v?'var(--p2)':'var(--sub)',fontWeight:700,cursor:'pointer',fontSize:13 }}>{l}</button>
          ))}
        </div>

        {/* Search */}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="खोज्नुहोस्..." className="inp" style={{ marginBottom:12 }}/>

        {/* Summary */}
        {totalUdharo > 0 && (
          <div style={{ background:'linear-gradient(135deg,#7c3aed,#a855f7)',borderRadius:16,padding:'14px 18px',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:11,color:'rgba(255,255,255,.7)',margin:'0 0 3px' }}>जम्मा उधारो बाँकी</p>
              <p style={{ fontSize:22,fontWeight:900,color:'#fff',margin:0 }}>{fmt(totalUdharo)}</p>
            </div>
            <span style={{ fontSize:28 }}>💜</span>
          </div>
        )}

        {/* Party list */}
        {filtered.length === 0 && (
          <div style={{ textAlign:'center',padding:'40px 0' }}>
            <p style={{ fontSize:32,margin:'0 0 8px' }}>👥</p>
            <p style={{ color:'var(--sub)',fontSize:14 }}>कुनै पार्टी छैन</p>
          </div>
        )}
        {filtered.map(p => (
          <div key={p.id} className="cd" style={{ marginBottom:8,display:'flex',alignItems:'center',gap:12,cursor:'pointer',padding:'14px' }} onClick={()=>setSel(p.id)}>
            <div style={{ width:44,height:44,borderRadius:15,background:'linear-gradient(135deg,#0f766e,#14b8a6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'#fff',flexShrink:0 }}>
              {(p.name||'?')[0].toUpperCase()}
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <p style={{ fontSize:15,fontWeight:700,color:'var(--txt)',margin:0 }}>{p.name}</p>
              {p.phone && <p style={{ fontSize:12,color:'var(--sub)',margin:'2px 0 0' }}>{p.phone}</p>}
            </div>
            <div style={{ textAlign:'right',flexShrink:0 }}>
              {(p.balance||0) !== 0 && (
                <>
                  <p style={{ fontSize:15,fontWeight:800,color:(p.balance||0)>0?'#dc2626':'#0f766e',margin:0 }}>{fmt(Math.abs(p.balance||0))}</p>
                  <p style={{ fontSize:11,color:'var(--sub)',margin:'2px 0 0' }}>{(p.balance||0)>0?'उधारो':'अग्रिम'}</p>
                </>
              )}
              {!(p.balance||0) && <p style={{ fontSize:12,color:'var(--sub)',margin:0 }}>बाँकी छैन</p>}
            </div>
            <Ic n="back" s={14} c="var(--sub)" style={{ transform:'rotate(180deg)' }}/>
          </div>
        ))}
      </div>

      {/* Add party modal */}
      {addModal && (
        <Modal onClose={()=>setAddModal(false)} title="पार्टी थप्नुस्">
          <div style={{ display:'flex',gap:8,marginBottom:14 }}>
            {[['customer','👤 ग्राहक'],['supplier','🏢 आपूर्तिकर्ता']].map(([v,l]) => (
              <button key={v} onClick={()=>setCf({...cf,type:v})} style={{ flex:1,padding:'10px',borderRadius:12,border:`2px solid ${cf.type===v?'var(--p3)':'var(--bdr)'}`,background:cf.type===v?'var(--pl)':'transparent',color:cf.type===v?'var(--p2)':'var(--sub)',fontWeight:700,cursor:'pointer',fontSize:12 }}>{l}</button>
            ))}
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            <input value={cf.name} onChange={e=>setCf({...cf,name:e.target.value})} placeholder="नाम *" className="inp"/>
            <input value={cf.phone} onChange={e=>setCf({...cf,phone:e.target.value})} placeholder="फोन नम्बर" className="inp" type="tel"/>
            <input value={cf.addr} onChange={e=>setCf({...cf,addr:e.target.value})} placeholder="ठेगाना" className="inp"/>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:16 }}>
            <button onClick={()=>setAddModal(false)} className="btn Bo">रद्द</button>
            <button onClick={addParty} disabled={busy} className="btn Bp">{busy?'...':'सुरक्षित'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
