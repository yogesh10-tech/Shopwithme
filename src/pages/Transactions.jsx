import { useState, useEffect } from 'react';
import { ref, onValue, remove, update } from 'firebase/database';
import { db } from '../firebase';
import { fmt, fmtBS, oa, tsToDateStr, dateStrToTs } from '../utils/date';

import { Modal, CalcModal, Ic, PageWrap } from '../components/UI';
import TxModal from './TxModal';

export default function Transactions({ shopId, shopData, role, t, lang, toast, qType, clearQ }) {
  const [txs, setTxs]       = useState([]);
  const [prods, setProds]   = useState([]);
  const [parties, setParties] = useState([]);
  const [typeF,  setTypeF]  = useState('all');
  const [period, setPeriod] = useState('today');
  const [modal,  setModal]  = useState(!!qType);
  const [editTx, setEditTx] = useState(null);

  useEffect(() => {
    const r1 = ref(db, `shops/${shopId}/transactions`);
    const r2 = ref(db, `shops/${shopId}/inventory`);
    const r3 = ref(db, `shops/${shopId}/parties`);
    const u1 = onValue(r1, s => setTxs(oa(s.val()).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))));
    const u2 = onValue(r2, s => setProds(oa(s.val())));
    const u3 = onValue(r3, s => setParties(oa(s.val())));
    return () => { u1(); u2(); u3(); };
  }, [shopId]);

  const today = tsToDateStr(Date.now());
  const filtered = txs.filter(tx => {
    if (typeF !== 'all' && tx.type !== typeF) return false;
    if (period === 'today') return tsToDateStr(tx.createdAt) === today;
    if (period === 'week') return Date.now() - (tx.createdAt||0) < 7*86400000;
    if (period === 'month') return Date.now() - (tx.createdAt||0) < 30*86400000;
    return true;
  });

  const totals = filtered.reduce((acc,tx) => {
    acc[tx.type] = (acc[tx.type]||0) + tx.amount;
    return acc;
  }, {});

  const deleteTx = async tx => {
    if (!window.confirm('यो कारोबार हटाउने?')) return;
    try { await remove(ref(db, `shops/${shopId}/transactions/${tx.id}`)); toast('हटाइयो ✓'); }
    catch { toast('त्रुटि भयो'); }
  };

  const pmIcon = { cash:'💵', esewa:'🟢', khalti:'🟣', qr:'📱', fonepay:'📲' };
  const typeStyle = {
    sale:  { bg:'#f0fdfa', c:'#0f766e', ic:'💰' },
    purch: { bg:'#dbeafe', c:'#2563eb', ic:'📦' },
    exp:   { bg:'#fee2e2', c:'#dc2626', ic:'💸' },
  };

  return (
    <>
    <PageWrap
      title="कारोबार"
      action={
        <button type="button" onClick={()=>setModal(true)} style={{ background:'var(--p2)',border:'none',borderRadius:12,padding:'10px 14px',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}>
          <Ic n="plus" s={14} c="#fff"/> थप
        </button>
      }
    >
        {/* Period filter */}
        <div style={{ display:'flex',gap:6,marginBottom:10,overflowX:'auto',paddingBottom:4 }}>
          {[['today','आज'],['week','हप्ता'],['month','महिना'],['all','सबै']].map(([v,l]) => (
            <button key={v} onClick={()=>setPeriod(v)} className="pil" style={{ flexShrink:0,borderColor:period===v?'var(--p3)':'var(--bdr)',background:period===v?'var(--p3)':'transparent',color:period===v?'#fff':'var(--sub)' }}>{l}</button>
          ))}
        </div>

        {/* Type filter */}
        <div style={{ display:'flex',gap:6,marginBottom:12 }}>
          {[['all','सबै'],['sale','बिक्री'],['purch','खरिद'],['exp','खर्च']].map(([v,l]) => (
            <button key={v} onClick={()=>setTypeF(v)} className="pil" style={{ flexShrink:0,borderColor:typeF===v?'var(--p2)':'var(--bdr)',background:typeF===v?'var(--pl)':'transparent',color:typeF===v?'var(--p2)':'var(--sub)' }}>{l}</button>
          ))}
        </div>

        {/* Summary */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14 }}>
          {[['sale','बिक्री','#0f766e','#f0fdfa'],['purch','खरिद','#2563eb','#dbeafe'],['exp','खर्च','#dc2626','#fee2e2']].map(([type,label,color,bg]) => (
            <div key={type} style={{ background:bg,borderRadius:14,padding:'10px' }}>
              <p style={{ fontSize:10,color,fontWeight:700,margin:'0 0 2px' }}>{label}</p>
              <p style={{ fontSize:15,fontWeight:900,color,margin:0 }}>{fmt(totals[type]||0)}</p>
            </div>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 && (
          <div style={{ textAlign:'center',padding:'40px 0' }}>
            <p style={{ fontSize:32,margin:'0 0 8px' }}>📋</p>
            <p style={{ color:'var(--sub)',fontSize:14 }}>कुनै कारोबार छैन</p>
          </div>
        )}
        {filtered.map(tx => {
          const s = typeStyle[tx.type] || typeStyle.exp;
          const pr = prods.find(p=>p.id===tx.productId);
          const pa = parties.find(p=>p.id===tx.partyId);
          return (
            <div key={tx.id} className="cd" style={{ marginBottom:8,display:'flex',gap:12,alignItems:'center',padding:'12px 14px' }}>
              <div style={{ width:40,height:40,borderRadius:14,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>{s.ic}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
                  <p style={{ fontSize:14,fontWeight:600,color:'var(--txt)',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:130 }}>{tx.description}</p>
                  {tx.paymentMethod&&tx.paymentMethod!=='cash'&&<span style={{ fontSize:11 }}>{pmIcon[tx.paymentMethod]}</span>}
                  {tx.invNo&&<span className="bdg" style={{ background:s.bg,color:s.c,fontSize:10 }}>#{tx.invNo}</span>}
                </div>
                <p style={{ fontSize:11,color:'var(--sub)',margin:'2px 0 0' }}>
                  {pr?pr.name+' · ':''}{pa?pa.name+' · ':''}{fmtBS(tx.createdAt,lang)}
                </p>
              </div>
              <p style={{ fontSize:14,fontWeight:800,color:tx.type==='sale'?'#0f766e':'#dc2626',margin:0,flexShrink:0 }}>
                {tx.type==='sale'?'+':'-'}{fmt(tx.amount)}
              </p>
              <div style={{ display:'flex',gap:4,flexShrink:0 }}>
                <button onClick={()=>setEditTx(tx)} style={{ width:28,height:28,background:'#eff6ff',border:'none',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Ic n="edit" s={12} c="#2563eb"/></button>
                <button onClick={()=>deleteTx(tx)} style={{ width:28,height:28,background:'#fef2f2',border:'none',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Ic n="trash" s={12} c="#dc2626"/></button>
              </div>
            </div>
          );
        })}
    </PageWrap>

      {modal && <TxModal shopId={shopId} shopData={shopData} t={t} onClose={()=>{setModal(false);clearQ&&clearQ();}} defaultType={qType||'sale'} role={role} lang={lang} toast={toast}/>}
      {editTx && <EditTxModal tx={editTx} shopId={shopId} lang={lang} toast={toast} onClose={()=>setEditTx(null)}/>}
    </>
  );
}

function EditTxModal({ tx, shopId, lang, toast, onClose }) {
  const [f, setF] = useState({ amount: String(tx.amount||''), desc: tx.description||'', date: tsToDateStr(tx.createdAt||Date.now()), payMethod: tx.paymentMethod||'cash' });
  const [busy, setBusy]   = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const payMethods = ['cash','esewa','khalti','qr','fonepay'];

  const save = async () => {
    const amt = parseFloat(f.amount);
    if (!amt || amt <= 0) return;
    setBusy(true);
    try {
      await update(ref(db, `shops/${shopId}/transactions/${tx.id}`), {
        amount: amt, description: f.desc, createdAt: dateStrToTs(f.date), paymentMethod: f.payMethod, updatedAt: Date.now()
      });
      toast('अपडेट ✓'); onClose();
    } catch { toast('त्रुटि भयो'); }
    setBusy(false);
  };

  return (
    <>
      <Modal onClose={onClose} title="✏️ कारोबार सम्पादन">
        <div style={{ display:'flex',flexDirection:'column',gap:11 }}>
          <div>
            <label style={{ fontSize:12,color:'var(--sub)',fontWeight:600,display:'block',marginBottom:4 }}>📅 मिति</label>
            <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})} className="inp"/>
          </div>
          <div style={{ position:'relative' }}>
            <input value={f.amount} onChange={e=>setF({...f,amount:e.target.value})} type="number" placeholder="रकम" className="inp" style={{ paddingRight:48 }}/>
            <button onClick={()=>setShowCalc(true)} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',width:32,height:32,background:'var(--pl)',border:'none',borderRadius:10,cursor:'pointer',fontSize:16 }}>🧮</button>
          </div>
          <input value={f.desc} onChange={e=>setF({...f,desc:e.target.value})} placeholder="विवरण" className="inp"/>
          {tx.type==='sale'&&(
            <div style={{ display:'flex',gap:7,flexWrap:'wrap' }}>
              {payMethods.map(pm=>(
                <button key={pm} onClick={()=>setF({...f,payMethod:pm})} className="pil" style={{ borderColor:f.payMethod===pm?'var(--p3)':'var(--bdr)',background:f.payMethod===pm?'var(--p3)':'transparent',color:f.payMethod===pm?'#fff':'var(--sub)' }}>
                  {pm==='cash'?'💵':pm==='esewa'?'🟢':pm==='khalti'?'🟣':pm==='qr'?'📱':'📲'} {pm}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:18 }}>
          <button onClick={onClose} className="btn Bo">रद्द</button>
          <button onClick={save} disabled={busy} className="btn Bp">{busy?'...':'सुरक्षित'}</button>
        </div>
      </Modal>
      {showCalc && <CalcModal initial={f.amount} onDone={v=>setF({...f,amount:v})} onClose={()=>setShowCalc(false)}/>}
    </>
  );
}
