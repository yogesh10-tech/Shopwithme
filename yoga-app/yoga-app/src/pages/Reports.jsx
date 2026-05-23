import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { oa, fmt, fmtBS, tsToDateStr } from '../utils/date';

export default function Reports({ shopId, lang }) {
  const [txs,     setTxs]     = useState([]);
  const [parties, setParties] = useState([]);
  const [prods,   setProds]   = useState([]);
  const [period,  setPeriod]  = useState('today');

  useEffect(() => {
    const r1 = ref(db, `shops/${shopId}/transactions`);
    const r2 = ref(db, `shops/${shopId}/parties`);
    const r3 = ref(db, `shops/${shopId}/inventory`);
    const u1 = onValue(r1, s => setTxs(oa(s.val())));
    const u2 = onValue(r2, s => setParties(oa(s.val())));
    const u3 = onValue(r3, s => setProds(oa(s.val())));
    return () => { u1(); u2(); u3(); };
  }, [shopId]);

  const today = tsToDateStr(Date.now());
  const filtered = txs.filter(tx => {
    if (period === 'today')  return tsToDateStr(tx.createdAt) === today;
    if (period === 'week')   return Date.now() - (tx.createdAt||0) < 7*86400000;
    if (period === 'month')  return Date.now() - (tx.createdAt||0) < 30*86400000;
    return true;
  });

  const sale  = filtered.filter(t=>t.type==='sale').reduce((s,t)=>s+t.amount,0);
  const purch = filtered.filter(t=>t.type==='purch').reduce((s,t)=>s+t.amount,0);
  const exp   = filtered.filter(t=>t.type==='exp').reduce((s,t)=>s+t.amount,0);
  const profit = sale - purch - exp;
  const totalUdharo = parties.reduce((s,p)=>s+(Math.max(0,p.balance||0)),0);

  // Payment method breakdown
  const pmBreak = filtered.filter(t=>t.type==='sale').reduce((acc,t)=>{
    const pm = t.paymentMethod||'cash';
    acc[pm] = (acc[pm]||0) + t.amount;
    return acc;
  },{});

  // Top products by quantity sold
  const prodSales = filtered.filter(t=>t.type==='sale'&&t.productId).reduce((acc,t)=>{
    acc[t.productId] = (acc[t.productId]||0) + (t.quantity||1);
    return acc;
  },{});
  const topProds = Object.entries(prodSales).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,qty])=>({ prod:prods.find(p=>p.id===id), qty })).filter(x=>x.prod);

  const Stat = ({ label, val, color, sub }) => (
    <div className="cd" style={{ padding:'14px' }}>
      <p style={{ fontSize:11,color:'var(--sub)',fontWeight:600,margin:'0 0 4px' }}>{label}</p>
      <p style={{ fontSize:22,fontWeight:900,color:color||'var(--txt)',margin:0 }}>{val}</p>
      {sub && <p style={{ fontSize:11,color:'var(--sub)',margin:'3px 0 0' }}>{sub}</p>}
    </div>
  );

  return (
    <div className="S FI" style={{ height:'100%', paddingBottom:76 }}>
      <div style={{ padding:'16px 16px 0' }}>
        <h1 style={{ fontSize:22,fontWeight:900,color:'var(--txt)',margin:'0 0 14px' }}>📊 रिपोर्ट</h1>

        {/* Period */}
        <div style={{ display:'flex',gap:6,marginBottom:14 }}>
          {[['today','आज'],['week','हप्ता'],['month','महिना'],['all','सबै']].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriod(v)} className="pil" style={{ flexShrink:0,borderColor:period===v?'var(--p3)':'var(--bdr)',background:period===v?'var(--p3)':'transparent',color:period===v?'#fff':'var(--sub)' }}>{l}</button>
          ))}
        </div>

        {/* Main stats */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12 }}>
          <Stat label="💰 कुल बिक्री" val={fmt(sale)} color="#0f766e"/>
          <Stat label="📈 नाफा" val={fmt(profit)} color={profit>=0?'#16a34a':'#dc2626'}/>
          <Stat label="📦 खरिद" val={fmt(purch)} color="#2563eb"/>
          <Stat label="💸 खर्च" val={fmt(exp)} color="#dc2626"/>
        </div>

        {/* Udharo */}
        <div className="cd" style={{ marginBottom:12,background:'linear-gradient(135deg,#7c3aed,#a855f7)',border:'none' }}>
          <p style={{ fontSize:12,color:'rgba(255,255,255,.7)',margin:'0 0 4px' }}>📒 जम्मा उधारो बाँकी</p>
          <p style={{ fontSize:28,fontWeight:900,color:'#fff',margin:0 }}>{fmt(totalUdharo)}</p>
          <p style={{ fontSize:11,color:'rgba(255,255,255,.5)',margin:'4px 0 0' }}>{parties.filter(p=>(p.balance||0)>0).length} ग्राहकको उधारो</p>
        </div>

        {/* Payment method breakdown */}
        {Object.keys(pmBreak).length > 0 && (
          <>
            <p style={{ fontSize:13,fontWeight:700,color:'var(--sub)',margin:'0 0 8px' }}>भुक्तानी विधि</p>
            {Object.entries(pmBreak).map(([pm,amt])=>(
              <div key={pm} className="cd" style={{ marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px' }}>
                <span style={{ fontSize:14,fontWeight:600,color:'var(--txt)' }}>
                  {pm==='cash'?'💵 नगद':pm==='esewa'?'🟢 eSewa':pm==='khalti'?'🟣 Khalti':pm==='qr'?'📱 QR':'📲 FonePay'}
                </span>
                <span style={{ fontSize:15,fontWeight:800,color:'var(--p2)' }}>{fmt(amt)}</span>
              </div>
            ))}
          </>
        )}

        {/* Top products */}
        {topProds.length > 0 && (
          <>
            <p style={{ fontSize:13,fontWeight:700,color:'var(--sub)',margin:'14px 0 8px' }}>🏆 बढी बिकेका सामान</p>
            {topProds.map(({prod,qty},i)=>(
              <div key={prod.id} className="cd" style={{ marginBottom:8,display:'flex',alignItems:'center',gap:12,padding:'12px 14px' }}>
                <div style={{ width:32,height:32,borderRadius:10,background:'var(--pl)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'var(--p2)',fontSize:14 }}>{i+1}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14,fontWeight:700,color:'var(--txt)',margin:0 }}>{prod.name}</p>
                  <p style={{ fontSize:11,color:'var(--sub)',margin:'2px 0 0' }}>{qty} {prod.unit||'पिस'} बिक्यो</p>
                </div>
                <p style={{ fontSize:14,fontWeight:800,color:'var(--p2)',margin:0 }}>{fmt((prod.sellP||0)*qty)}</p>
              </div>
            ))}
          </>
        )}

        {/* Udharo customers list */}
        {parties.filter(p=>(p.balance||0)>0).length > 0 && (
          <>
            <p style={{ fontSize:13,fontWeight:700,color:'var(--sub)',margin:'14px 0 8px' }}>📒 उधारो ग्राहकहरू</p>
            {parties.filter(p=>(p.balance||0)>0).sort((a,b)=>b.balance-a.balance).map(p=>(
              <div key={p.id} className="cd" style={{ marginBottom:8,display:'flex',alignItems:'center',gap:12,padding:'12px 14px' }}>
                <div style={{ width:38,height:38,borderRadius:12,background:'var(--pl)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'var(--p2)',fontSize:16 }}>{(p.name||'?')[0].toUpperCase()}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14,fontWeight:700,color:'var(--txt)',margin:0 }}>{p.name}</p>
                  {p.phone && <p style={{ fontSize:11,color:'var(--sub)',margin:'2px 0 0' }}>{p.phone}</p>}
                </div>
                <p style={{ fontSize:15,fontWeight:800,color:'#dc2626',margin:0 }}>{fmt(p.balance||0)}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
