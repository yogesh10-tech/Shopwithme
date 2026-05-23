import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { oa, fmt, fmtBS, tsToDateStr } from '../utils/date';

export default function Bills({ shopId, shopData, lang }) {
  const [txs,     setTxs]     = useState([]);
  const [parties, setParties] = useState([]);
  const [sel,     setSel]     = useState(null);
  const [period,  setPeriod]  = useState('today');

  useEffect(() => {
    const r1 = ref(db, `shops/${shopId}/transactions`);
    const r2 = ref(db, `shops/${shopId}/parties`);
    const u1 = onValue(r1, s => setTxs(oa(s.val()).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))));
    const u2 = onValue(r2, s => setParties(oa(s.val())));
    return () => { u1(); u2(); };
  }, [shopId]);

  const today = tsToDateStr(Date.now());
  const bills = txs.filter(tx => {
    if (tx.type !== 'sale') return false;
    if (period === 'today') return tsToDateStr(tx.createdAt) === today;
    if (period === 'week')  return Date.now() - (tx.createdAt||0) < 7*86400000;
    if (period === 'month') return Date.now() - (tx.createdAt||0) < 30*86400000;
    return true;
  });

  const printBill = tx => {
    const party = parties.find(p=>p.id===tx.partyId);
    const win = window.open('','_blank');
    win.document.write(`
      <html><head><title>Invoice #${tx.invNo||''}</title>
      <style>body{font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
      .total{font-size:20px;font-weight:900;color:#0f766e}h1{color:#0f766e}
      .hdr{text-align:center;margin-bottom:20px}.inv{font-size:12px;color:#666}</style></head>
      <body>
      <div class="hdr"><h1>🪴 ${shopData?.name||'Yoga'}</h1>
      <p class="inv">Invoice #${tx.invNo||'N/A'} | ${new Date(tx.createdAt).toLocaleDateString()}</p>
      ${party?`<p>${party.name}</p>`:''}
      </div>
      <div class="row"><span>विवरण</span><span>${tx.description||''}</span></div>
      <div class="row"><span>मात्रा</span><span>${tx.quantity||1}</span></div>
      <div class="row"><span>रकम</span><span>रु.${tx.amount}</span></div>
      ${tx.useVat?`<div class="row"><span>VAT (13%)</span><span>रु.${tx.vatAmount||0}</span></div>`:''}
      <div class="row"><span><b>जम्मा</b></span><span class="total">रु.${tx.totalAmount||tx.amount}</span></div>
      <div class="row"><span>भुक्तानी विधि</span><span>${tx.paymentMethod||'cash'}</span></div>
      <br><p style="text-align:center;color:#999;font-size:12px">Yoga Smart Business App — धन्यवाद!</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  if (sel) {
    const party = parties.find(p=>p.id===sel.partyId);
    return (
      <div className="S FI" style={{ height:'100%', paddingBottom:76 }}>
        <div style={{ padding:'16px' }}>
          <button onClick={()=>setSel(null)} style={{ display:'flex',alignItems:'center',gap:8,background:'none',border:'none',color:'var(--p2)',fontWeight:700,cursor:'pointer',marginBottom:16,fontSize:14 }}>
            ← फिर्ता
          </button>
          <div className="inv-paper">
            <div style={{ textAlign:'center',marginBottom:20,paddingBottom:16,borderBottom:'2px dashed #e2e8f0' }}>
              <p style={{ fontSize:28,margin:'0 0 4px' }}>🪴</p>
              <h2 style={{ fontSize:20,fontWeight:900,color:'#0f766e',margin:'0 0 4px' }}>{shopData?.name||'Yoga'}</h2>
              <p style={{ fontSize:12,color:'#94a3b8',margin:0 }}>Invoice #{sel.invNo||'N/A'}</p>
            </div>
            {party && <div style={{ marginBottom:12 }}><p style={{ fontSize:13,color:'#64748b',margin:'0 0 2px' }}>ग्राहक</p><p style={{ fontSize:16,fontWeight:700,color:'#0f172a',margin:0 }}>{party.name}</p>{party.phone&&<p style={{ fontSize:12,color:'#94a3b8',margin:'2px 0 0' }}>{party.phone}</p>}</div>}
            <p style={{ fontSize:12,color:'#94a3b8',margin:'0 0 16px' }}>{new Date(sel.createdAt).toLocaleString()}</p>
            {[
              ['विवरण', sel.description],
              ['मात्रा', `${sel.quantity||1}`],
              ['रकम', `रु.${sel.amount}`],
              sel.useVat && ['VAT 13%', `रु.${sel.vatAmount||0}`],
              ['भुक्तानी', sel.paymentMethod||'cash'],
            ].filter(Boolean).map(([k,v])=>(
              <div key={k} style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid #f1f5f9' }}>
                <span style={{ fontSize:13,color:'#64748b' }}>{k}</span>
                <span style={{ fontSize:13,fontWeight:600,color:'#0f172a' }}>{v}</span>
              </div>
            ))}
            <div style={{ display:'flex',justifyContent:'space-between',padding:'14px 0 0',marginTop:4 }}>
              <span style={{ fontSize:16,fontWeight:800,color:'#0f172a' }}>जम्मा</span>
              <span style={{ fontSize:20,fontWeight:900,color:'#0f766e' }}>रु.{sel.totalAmount||sel.amount}</span>
            </div>
          </div>
          <button onClick={()=>printBill(sel)} style={{ width:'100%',background:'linear-gradient(135deg,#0f766e,#14b8a6)',border:'none',borderRadius:14,padding:'14px',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',marginTop:16 }}>
            🖨️ प्रिन्ट / डाउनलोड
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="S FI" style={{ height:'100%', paddingBottom:76 }}>
      <div style={{ padding:'16px 16px 0' }}>
        <h1 style={{ fontSize:22,fontWeight:900,color:'var(--txt)',margin:'0 0 14px' }}>🧾 बिलहरू</h1>

        <div style={{ display:'flex',gap:6,marginBottom:14 }}>
          {[['today','आज'],['week','हप्ता'],['month','महिना'],['all','सबै']].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriod(v)} className="pil" style={{ flexShrink:0,borderColor:period===v?'var(--p3)':'var(--bdr)',background:period===v?'var(--p3)':'transparent',color:period===v?'#fff':'var(--sub)' }}>{l}</button>
          ))}
        </div>

        {bills.length === 0 && (
          <div style={{ textAlign:'center',padding:'40px 0' }}>
            <p style={{ fontSize:32,margin:'0 0 8px' }}>🧾</p>
            <p style={{ color:'var(--sub)',fontSize:14 }}>कुनै बिल छैन</p>
          </div>
        )}
        {bills.map(tx => {
          const party = parties.find(p=>p.id===tx.partyId);
          return (
            <div key={tx.id} className="cd" style={{ marginBottom:8,cursor:'pointer',padding:'14px' }} onClick={()=>setSel(tx)}>
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                <div style={{ width:40,height:40,borderRadius:14,background:'#f0fdfa',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>🧾</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <p style={{ fontSize:14,fontWeight:700,color:'var(--txt)',margin:0 }}>{tx.description}</p>
                    {tx.invNo && <span style={{ fontSize:11,background:'#f0fdfa',color:'#0f766e',padding:'2px 8px',borderRadius:10,fontWeight:700 }}>#{tx.invNo}</span>}
                  </div>
                  <p style={{ fontSize:11,color:'var(--sub)',margin:'3px 0 0' }}>
                    {party?party.name+' · ':''}{fmtBS(tx.createdAt,lang)} · {tx.paymentMethod||'cash'}
                  </p>
                </div>
                <p style={{ fontSize:15,fontWeight:800,color:'#0f766e',margin:0,flexShrink:0 }}>{fmt(tx.totalAmount||tx.amount)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
