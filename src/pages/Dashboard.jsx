import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { fmt, fmtBS, oa, tsToDateStr } from '../utils/date';
import UI from "../components/UI";

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
  const recent = txs.slice(0,8);

  if (role === 'cashier') return (
    <div className="S FI" style={{ height:'100%', paddingBottom:76, background:'var(--bg)' }}>
      <div style={{ padding:'24px 16px 16px' }}>
        <div style={{ background:'linear-gradient(135deg,#0f766e,#134e4a)',borderRadius:24,padding:'22px',marginBottom:16,color:'#fff' }}>
          <p style={{ fontSize:12,opacity:.7,margin:'0 0 4px' }}>क्यासियर</p>
          <h1 style={{ fontSize:22,fontWeight:900,margin:'0 0 16px' }}>{shopData?.name}</h1>
          <p style={{ fontSize:12,opacity:.6,margin:'0 0 4px' }}>आजको बिक्री</p>
          <p style={{ fontSize:36,fontWeight:900,margin:0 }}>{fmt(sale)}</p>
          <p style={{ fontSize:12,opacity:.5,marginTop:6 }}>{fmtBS(Date.now(),lang)}</p>
        </div>
        <button onClick={()=>onQuickTx('sale')}
          style={{ width:'100%',background:'linear-gradient(135deg,#0f766e,#14b8a6)',border:'none',borderRadius:20,padding:'20px 22px',cursor:'pointer',textAlign:'left',marginBottom:16,boxShadow:'0 6px 24px rgba(15,118,110,.35)',display:'flex',alignItems:'center',gap:14 }}>
          <div style={{ width:48,height:48,background:'rgba(255,255,255,.18)',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Ic n="money" s={24} c="#fff"/>
          </div>
          <div>
            <p style={{ fontSize:19,fontWeight:800,color:'#fff',margin:0 }}>बिक्री थप्नुहोस्</p>
            <p style={{ fontSize:12,color:'rgba(255,255,255,.6)',margin:'3px 0 0' }}>आजको बिक्री रेकर्ड गर्नुहोस्</p>
          </div>
        </button>
        {recent.length > 0 && (
          <div>
            <p style={{ fontSize:13,fontWeight:700,color:'var(--sub)',margin:'0 0 10px' }}>हालका कारोबार</p>
            {recent.slice(0,5).map(tx => (
              <div key={tx.id} className="cd" style={{ marginBottom:8,display:'flex',alignItems:'center',gap:12,padding:'12px 14px' }}>
                <div style={{ width:36,height:36,borderRadius:12,background:tx.type==='sale'?'#f0fdfa':'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>
                  {tx.type==='sale'?'💰':tx.type==='purch'?'📦':'💸'}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13,fontWeight:600,color:'var(--txt)',margin:0 }}>{tx.description}</p>
                  <p style={{ fontSize:11,color:'var(--sub)',margin:'2px 0 0' }}>{fmtBS(tx.createdAt,lang)}</p>
                </div>
                <p style={{ fontSize:13,fontWeight:700,color:tx.type==='sale'?'#0f766e':'#dc2626',margin:0 }}>
                  {tx.type==='sale'?'+':'-'}{fmt(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="S FI" style={{ height:'100%', paddingBottom:76 }}>
      <div style={{ padding:'24px 16px 16px' }}>
        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
          <div>
            <p style={{ fontSize:12,color:'var(--sub)',fontWeight:600,margin:'0 0 2px' }}>{fmtBS(Date.now(),lang)}</p>
            <h1 style={{ fontSize:22,fontWeight:900,color:'var(--txt)',margin:0 }}>{shopData?.name || 'Yoga'}</h1>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12 }}>
          {[
            { label:'आजको बिक्री', val:sale, color:'#0f766e', bg:'#f0fdfa', icon:'💰' },
            { label:'नाफा', val:profit, color: profit>=0?'#16a34a':'#dc2626', bg: profit>=0?'#f0fdf4':'#fef2f2', icon:'📈' },
            { label:'उधारो बाँकी', val:totalUdharo, color:'#7c3aed', bg:'#f5f3ff', icon:'📒' },
            { label:'आजको खर्च', val:exp+purch, color:'#dc2626', bg:'#fef2f2', icon:'💸' },
          ].map(s => (
            <div key={s.label} className="cd" style={{ padding:'14px',background:s.bg }}>
              <p style={{ fontSize:20,margin:'0 0 6px' }}>{s.icon}</p>
              <p style={{ fontSize:11,color:s.color,fontWeight:700,margin:'0 0 3px',opacity:.8 }}>{s.label}</p>
              <p style={{ fontSize:20,fontWeight:900,color:s.color,margin:0 }}>{fmt(s.val)}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16 }}>
          {[
            { label:'बिक्री', type:'sale', color:'var(--p2)', icon:'💰' },
            { label:'खरिद', type:'purch', color:'var(--blue)', icon:'📦' },
            { label:'खर्च', type:'exp', color:'var(--red)', icon:'💸' },
          ].map(a => (
            <button key={a.type} onClick={()=>onQuickTx(a.type)}
              style={{ background:'var(--card)',border:`2px solid var(--bdr)`,borderRadius:16,padding:'14px 8px',cursor:'pointer',textAlign:'center' }}>
              <div style={{ fontSize:22,marginBottom:4 }}>{a.icon}</div>
              <p style={{ fontSize:12,fontWeight:700,color:a.color,margin:0 }}>{a.label}</p>
            </button>
          ))}
        </div>

        {/* Recent transactions */}
        {recent.length > 0 && (
          <>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
              <p style={{ fontSize:14,fontWeight:700,color:'var(--txt)',margin:0 }}>हालका कारोबार</p>
              <button onClick={()=>onNav('tx')} style={{ fontSize:12,color:'var(--p2)',background:'none',border:'none',fontWeight:700,cursor:'pointer' }}>सबै हेर्नुस् →</button>
            </div>
            {recent.map(tx => (
              <div key={tx.id} className="cd" style={{ marginBottom:8,display:'flex',alignItems:'center',gap:12,padding:'12px 14px' }}>
                <div style={{ width:38,height:38,borderRadius:12,background:tx.type==='sale'?'#f0fdfa':'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>
                  {tx.type==='sale'?'💰':tx.type==='purch'?'📦':'💸'}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ fontSize:13,fontWeight:600,color:'var(--txt)',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{tx.description}</p>
                  <p style={{ fontSize:11,color:'var(--sub)',margin:'2px 0 0' }}>{fmtBS(tx.createdAt,lang)}</p>
                </div>
                <p style={{ fontSize:13,fontWeight:700,color:tx.type==='sale'?'#0f766e':'#dc2626',margin:0,flexShrink:0 }}>
                  {tx.type==='sale'?'+':'-'}{fmt(tx.amount)}
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
