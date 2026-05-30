import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { fmt, fmtBS, oa, tsToDateStr } from '../utils/date';

export default function Dashboard({ shopId, shopData, role, user, t, lang, onNav, onQuickTx }) {
  const [txs, setTxs] = useState([]);
  const [parties, setParties] = useState([]);
  const today = tsToDateStr(Date.now());

  useEffect(() => {
    const r1 = ref(db, `shops/${shopId}/transactions`);
    const r2 = ref(db, `shops/${shopId}/parties`);
    const u1 = onValue(r1, s => setTxs(oa(s.val()).sort((a,b) => (b.createdAt||0)-(a.createdAt||0))));
    const u2 = onValue(r2, s => setParties(oa(s.val())));
    return () => { u1(); u2(); };
  }, [shopId]);

  const todayTxs = txs.filter(tx => tsToDateStr(tx.createdAt) === today);
  const sale  = todayTxs.filter(t=>t.type==='sale').reduce((s,t)=>s+t.amount,0);
  const purch = todayTxs.filter(t=>t.type==='purch').reduce((s,t)=>s+t.amount,0);
  const exp   = todayTxs.filter(t=>t.type==='exp').reduce((s,t)=>s+t.amount,0);
  const profit = sale - purch - exp;
  const totalUdharo = parties.reduce((s,p)=>s+(p.balance||0),0);
  const recent = txs.slice(0,6);

  const TxList = ({ items }) => (
    <>
      {items.map(tx => (
        <div key={tx.id} className="cd tx-row">
          <div className="tx-ico" style={{ background: tx.type==='sale' ? '#f0fdfa' : '#fee2e2' }}>
            {tx.type==='sale'?'💰':tx.type==='purch'?'📦':'💸'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:14, fontWeight:600, color:'var(--txt)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.description}</p>
            <p style={{ fontSize:11, color:'var(--sub)', margin:'2px 0 0' }}>{fmtBS(tx.createdAt,lang)}</p>
          </div>
          <p style={{ fontSize:14, fontWeight:800, color: tx.type==='sale'?'var(--p2)':'var(--red)', margin:0, flexShrink:0 }}>
            {tx.type==='sale'?'+':'-'}{fmt(tx.amount)}
          </p>
        </div>
      ))}
    </>
  );

  if (role === 'cashier') return (
    <div className="S FI" style={{ height:'100%', paddingBottom:76, background:'var(--bg)' }}>
      <div style={{ padding:'16px' }}>
        <div className="hero-card">
          <p style={{ fontSize:12, opacity:.75, margin:'0 0 2px' }}>{fmtBS(Date.now(),lang)}</p>
          <h1 style={{ fontSize:20, fontWeight:800, margin:'0 0 12px' }}>{shopData?.name}</h1>
          <p style={{ fontSize:12, opacity:.7, margin:0 }}>आजको बिक्री</p>
          <p style={{ fontSize:32, fontWeight:900, margin:'4px 0 0' }}>{fmt(sale)}</p>
        </div>
        <button type="button" onClick={()=>onQuickTx('sale')} className="btn Bp" style={{ marginBottom:16, borderRadius:16, padding:16 }}>
          💰 बिक्री थप्नुहोस्
        </button>
        {recent.length > 0 && (
          <>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--sub)', margin:'0 0 8px' }}>हालका कारोबार</p>
            <TxList items={recent.slice(0,5)}/>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="S FI" style={{ height:'100%', paddingBottom:76 }}>
      <header className="page-hdr" style={{ background:'transparent', border:'none', paddingBottom:0 }}>
        <div>
          <p style={{ fontSize:12, color:'var(--sub)', margin:0 }}>{fmtBS(Date.now(),lang)}</p>
          <h1 className="page-title">{shopData?.name || 'कारोबार'}</h1>
        </div>
      </header>
      <div style={{ padding:'0 16px 16px' }}>
        <div className="hero-card">
          <p style={{ fontSize:12, opacity:.75, margin:0 }}>आजको नाफा</p>
          <p style={{ fontSize:28, fontWeight:900, margin:'4px 0 8px', color: profit >= 0 ? '#fff' : '#fecaca' }}>{fmt(profit)}</p>
          <div style={{ display:'flex', gap:16, fontSize:12, opacity:.85 }}>
            <span>बिक्री {fmt(sale)}</span>
            <span>खर्च {fmt(exp+purch)}</span>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
          <div className="cd" style={{ padding:12 }}>
            <p style={{ fontSize:11, color:'var(--sub)', fontWeight:700, margin:0 }}>उधारो</p>
            <p style={{ fontSize:18, fontWeight:900, color:'var(--purple)', margin:'4px 0 0' }}>{fmt(totalUdharo)}</p>
          </div>
          <div className="cd" style={{ padding:12 }}>
            <p style={{ fontSize:11, color:'var(--sub)', fontWeight:700, margin:0 }}>आजको बिक्री</p>
            <p style={{ fontSize:18, fontWeight:900, color:'var(--p2)', margin:'4px 0 0' }}>{fmt(sale)}</p>
          </div>
        </div>

        <div className="quick-grid">
          {[
            { label:'बिक्री', type:'sale', icon:'💰' },
            { label:'खरिद', type:'purch', icon:'📦' },
            { label:'खर्च', type:'exp', icon:'💸' },
          ].map(a => (
            <button key={a.type} type="button" onClick={()=>onQuickTx(a.type)} className="quick-btn">
              <div style={{ fontSize:24, marginBottom:4 }}>{a.icon}</div>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--p2)', margin:0 }}>{a.label}</p>
            </button>
          ))}
        </div>

        {recent.length > 0 && (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--txt)', margin:0 }}>हालका कारोबार</p>
              <button type="button" onClick={()=>onNav('tx')} style={{ fontSize:12, color:'var(--p2)', background:'none', border:'none', fontWeight:700, cursor:'pointer' }}>सबै →</button>
            </div>
            <TxList items={recent}/>
          </>
        )}
      </div>
    </div>
  );
}
