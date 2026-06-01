import { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { fmt, fmtBS, oa, tsToDateStr } from '../utils/date';
import { WelcomeBanner, MiniBarChart } from '../components/UI';

export default function Dashboard({ shopId, shopData, role, user, lang, onNav, onQuickTx, isAdmin, onAdminPanel }) {
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

  const weekChart = useMemo(() => {
    const labels = ['आ', 'सो', 'मं', 'बु', 'बि', 'शु', 'श'];
    return [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      const ds = tsToDateStr(d.getTime());
      const value = txs
        .filter(t => t.type === 'sale' && tsToDateStr(t.createdAt) === ds)
        .reduce((s, t) => s + (t.amount || 0), 0);
      const dayIdx = d.getDay();
      return { label: labels[dayIdx] || labels[i], value };
    });
  }, [txs]);

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
    <div className="page-wrap S FI">
      <div className="page-body">
        <WelcomeBanner name={user?.displayName} shopName={shopData?.name} isAdmin={isAdmin} onAdmin={onAdminPanel}/>
        <div className="hero-card">
          <p style={{ fontSize:12, opacity:.75, margin:'0 0 2px' }}>{fmtBS(Date.now(),lang)}</p>
          <p style={{ fontSize:12, opacity:.7, margin:0 }}>आजको बिक्री</p>
          <p style={{ fontSize:32, fontWeight:900, margin:'4px 0 0' }}>{fmt(sale)}</p>
        </div>
        <MiniBarChart data={weekChart} title="७ दिनको बिक्री (ग्राफ)"/>
        <button type="button" onClick={()=>onQuickTx('sale')} className="btn Bp" style={{ borderRadius:16, padding:16 }}>
          💰 बिक्री थप्नुहोस्
        </button>
        {recent.length > 0 && (
          <>
            <p className="section-title">हालका कारोबार</p>
            <TxList items={recent.slice(0,5)}/>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="page-wrap S FI">
      <div className="page-body">
        <WelcomeBanner name={user?.displayName} shopName={shopData?.name} isAdmin={isAdmin} onAdmin={onAdminPanel}/>

        {/* Karobar-style summary cards */}
        <div className="summary-cards-container">
          <button type="button" onClick={()=>onNav('party', 'customer')} className="summary-card summary-card-get">
            <p className="summary-label">Total To Get</p>
            <p className="summary-amount">{fmt(Math.max(0, totalUdharo))}</p>
            <p className="summary-sub">Amount receivable</p>
          </button>
          <button type="button" onClick={()=>onNav('party', 'supplier')} className="summary-card summary-card-give">
            <p className="summary-label">Total To Give</p>
            <p className="summary-amount">{fmt(Math.abs(Math.min(0, totalUdharo)))}</p>
            <p className="summary-sub">Amount payable</p>
          </button>
        </div>

        <MiniBarChart data={weekChart} title="७ दिनको बिक्री (ग्राफ)"/>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="cd" style={{ padding:14 }}>
            <p style={{ fontSize:11, color:'var(--sub)', fontWeight:700, margin:0 }}>उधारो</p>
            <p style={{ fontSize:18, fontWeight:900, color:'var(--purple)', margin:'6px 0 0' }}>{fmt(totalUdharo)}</p>
          </div>
          <div className="cd" style={{ padding:14 }}>
            <p style={{ fontSize:11, color:'var(--sub)', fontWeight:700, margin:0 }}>आजको बिक्री</p>
            <p style={{ fontSize:18, fontWeight:900, color:'var(--p2)', margin:'6px 0 0' }}>{fmt(sale)}</p>
          </div>
        </div>

        <p className="section-title">छिटो कारोबार</p>
        <div className="quick-grid" style={{ marginBottom:0 }}>
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
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <p className="section-title" style={{ margin:0 }}>हालका कारोबार</p>
              <button type="button" onClick={()=>onNav('tx')} style={{ fontSize:12, color:'var(--p2)', background:'none', border:'none', fontWeight:700, cursor:'pointer' }}>सबै →</button>
            </div>
            <TxList items={recent}/>
          </>
        )}
      </div>
    </div>
  );
}
