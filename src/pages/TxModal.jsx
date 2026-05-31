import { useState, useEffect } from 'react';
import { ref, get, push, set } from 'firebase/database';
import { db } from '../firebase';
import { oa, tsToDateStr, dateStrToTs, fmt } from '../utils/date';
import { oqAdd } from '../utils/offlineQueue';
import { Modal, CalcModal, Switch } from '../components/UI';

export default function TxModal({ shopId, shopData, t, onClose, defaultType = 'sale', role, lang, toast, scannedProduct }) {
  const [prods, setProds]   = useState([]);
  const [parties, setParties] = useState([]);
  const [f, setF] = useState({
    type: defaultType, amount:'', desc:'', prodId:scannedProduct?.productId||'', qty:String(scannedProduct?.quantity||'1'),
    partyId:'', isCredit: false, payMethod:'cash', useVat: false,
    date: tsToDateStr(Date.now())
  });
  const [busy, setBusy]     = useState(false);
  const [showCalc, setShowCalc] = useState(false);

  useEffect(() => {
    get(ref(db, `shops/${shopId}/inventory`)).then(s => setProds(oa(s.val()).sort((a,b)=>(a.name||'').localeCompare(b.name||''))));
    get(ref(db, `shops/${shopId}/parties`)).then(s  => setParties(oa(s.val()).sort((a,b)=>(a.name||'').localeCompare(b.name||''))));
  }, [shopId]);

  // Auto-open calculator when user focuses on amount field with special keys or directly type
  const handleAmountKeyDown = (e) => {
    // Open calculator on: Ctrl+M, *+, /, or when user tries to calculate
    if (e.ctrlKey && e.key === 'm') {
      e.preventDefault();
      setShowCalc(true);
    } else if (['+', '-', '*', '/', '='].includes(e.key)) {
      // If user presses an operator, auto-open calculator
      e.preventDefault();
      setShowCalc(true);
    }
  };

  const save = async () => {
    const amt = parseFloat(f.amount);
    if (!amt || amt <= 0) return;
    setBusy(true);
    const isOnline = navigator.onLine;
    try {
      const qty = parseFloat(f.qty) || 1;
      const txTs = dateStrToTs(f.date);
      const vatAmt = f.useVat ? Math.round(amt * 0.13) : 0;
      let nextInv = Date.now() % 100000;
      if (isOnline) {
        const snap = await get(ref(db, `shops/${shopId}/meta/lastInvNo`));
        nextInv = (snap.val() || 0) + 1;
        await set(ref(db, `shops/${shopId}/meta/lastInvNo`), nextInv);
      }
      const txData = {
        type: f.type, amount: amt, vatAmount: vatAmt, totalAmount: amt+vatAmt,
        description: f.desc || f.type, productId: f.prodId||null, quantity: qty,
        partyId: (f.isCredit&&f.partyId) ? f.partyId : null,
        paymentMethod: f.payMethod, useVat: f.useVat, invNo: nextInv,
        createdAt: txTs, recordedAt: Date.now()
      };

      if (isOnline) {
        await push(ref(db, `shops/${shopId}/transactions`), txData);
        if (f.prodId) {
          const delta = f.type==='sale' ? -qty : f.type==='purch' ? qty : 0;
          if (delta !== 0) {
            const sn = await get(ref(db, `shops/${shopId}/inventory/${f.prodId}/stock`));
            await set(ref(db, `shops/${shopId}/inventory/${f.prodId}/stock`), (sn.val()||0)+delta);
          }
        }
        if (f.isCredit && f.partyId) {
          const sn = await get(ref(db, `shops/${shopId}/parties/${f.partyId}/balance`));
          const delta2 = f.type==='sale' ? amt : -amt;
          await set(ref(db, `shops/${shopId}/parties/${f.partyId}/balance`), (sn.val()||0)+delta2);
          await push(ref(db, `shops/${shopId}/ledger`), { partyId:f.partyId, type:f.type==='sale'?'receivable':'payable', amount:amt, description:f.desc||f.type, createdAt:txTs, recordedAt:Date.now() });
        }
      } else {
        oqAdd({ op:'push', path:`shops/${shopId}/transactions`, data:txData });
        if (f.prodId) {
          const delta = f.type==='sale' ? -qty : f.type==='purch' ? qty : 0;
          if (delta !== 0) oqAdd({ op:'stockDelta', path:`shops/${shopId}/inventory/${f.prodId}/stock`, data:{ delta } });
        }
        toast('📵 ऑफलाइन — अनलाइन हुँदा सिंक हुनेछ');
      }
      toast(f.type==='sale'?'बिक्री थपियो ✓':f.type==='purch'?'खरिद थपियो ✓':'खर्च थपियो ✓');
      onClose();
    } catch (e) { toast('त्रुटि भयो — पुनः प्रयास'); }
    setBusy(false);
  };

  const TC = { sale:{b:'#f0fdfa',c:'var(--p3)'}, purch:{b:'#dbeafe',c:'var(--blue)'}, exp:{b:'#fee2e2',c:'var(--red)'} };
  const payMethods = ['cash','esewa','khalti','qr','fonepay'];

  return (
    <>
      <Modal onClose={onClose} title="कारोबार थप्नुस्">
        {role !== 'cashier' && (
          <div style={{ display:'flex',gap:8,marginBottom:16 }}>
            {[['sale','बिक्री'],['purch','खरिद'],['exp','खर्च']].map(([tp,lb]) => {
              const a = f.type===tp, tc = TC[tp];
              return <button key={tp} onClick={()=>setF({...f,type:tp})} style={{ flex:1,padding:'11px 4px',borderRadius:12,border:`2px solid ${a?tc.c:'var(--bdr)'}`,fontWeight:700,fontSize:13,cursor:'pointer',background:a?tc.b:'transparent',color:a?tc.c:'var(--sub)' }}>{lb}</button>;
            })}
          </div>
        )}
        <div style={{ display:'flex',flexDirection:'column',gap:11 }}>
          <div>
            <label style={{ fontSize:12,color:'var(--sub)',fontWeight:600,display:'block',marginBottom:4 }}>📅 मिति</label>
            <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})} max={tsToDateStr(Date.now())} className="inp"/>
          </div>
           <div>
            <label style={{ fontSize:12,color:'var(--sub)',fontWeight:600,display:'block',marginBottom:4 }}>रकम</label>
            <div style={{ position:'relative' }}>
              <input value={f.amount} onChange={e=>setF({...f,amount:e.target.value})} onKeyDown={handleAmountKeyDown} type="number" placeholder="0" className="inp" style={{ paddingRight:48 }}/>
              <button onClick={()=>setShowCalc(true)} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',width:32,height:32,background:'var(--pl)',border:'none',borderRadius:10,cursor:'pointer',fontSize:16 }} title="Calculator (Ctrl+M)">🧮</button>
            </div>
          </div>
          <input value={f.desc} onChange={e=>setF({...f,desc:e.target.value})} placeholder="विवरण" className="inp"/>
          {role !== 'cashier' && (
            <select value={f.prodId} onChange={e=>{const p=prods.find(x=>x.id===e.target.value);setF({...f,prodId:e.target.value,amount:p&&!f.amount?String(p.sellP||0):f.amount,desc:p&&!f.desc?p.name:f.desc});}} className="inp">
              <option value="">सामान छान्नुस् (वैकल्पिक)</option>
              {prods.map(p=><option key={p.id} value={p.id}>{p.name} ({p.stock||0})</option>)}
            </select>
          )}
          {f.prodId && <input value={f.qty} onChange={e=>{const q=parseFloat(e.target.value)||1;const p=prods.find(x=>x.id===f.prodId);setF({...f,qty:e.target.value,amount:p?String((p.sellP||0)*q):f.amount});}} type="number" placeholder="मात्रा" min="1" className="inp"/>}
          {f.type === 'sale' && (
            <>
              <div style={{ display:'flex',gap:7,flexWrap:'wrap' }}>
                {payMethods.map(pm=>(
                  <button key={pm} onClick={()=>setF({...f,payMethod:pm})} className="pil" style={{ borderColor:f.payMethod===pm?'var(--p3)':'var(--bdr)',background:f.payMethod===pm?'var(--p3)':'transparent',color:f.payMethod===pm?'#fff':'var(--sub)' }}>
                    {pm==='cash'?'💵':pm==='esewa'?'🟢':pm==='khalti'?'🟣':pm==='qr'?'📱':'📲'} {pm}
                  </button>
                ))}
              </div>
              <label style={{ display:'flex',alignItems:'center',gap:12,cursor:'pointer' }}>
                <Switch on={f.useVat} onChange={v=>setF({...f,useVat:v})}/>
                <span style={{ fontSize:14,fontWeight:600,color:'var(--txt)' }}>VAT थप्नुस् (+13%)</span>
              </label>
              {f.useVat&&f.amount&&<p style={{ fontSize:13,color:'var(--amber)',margin:0,fontWeight:600 }}>जम्मा: {fmt(parseFloat(f.amount||0)+Math.round(parseFloat(f.amount||0)*0.13))}</p>}
              <label style={{ display:'flex',alignItems:'center',gap:12,cursor:'pointer' }}>
                <Switch on={f.isCredit} onChange={v=>setF({...f,isCredit:v})}/>
                <span style={{ fontSize:14,fontWeight:600,color:'var(--txt)' }}>उधारोमा</span>
              </label>
              {f.isCredit && (
                <select value={f.partyId} onChange={e=>setF({...f,partyId:e.target.value})} className="inp">
                  <option value="">पार्टी छान्नुस्</option>
                  {parties.map(p=><option key={p.id} value={p.id}>{p.name}{p.balance?` — ${fmt(Math.abs(p.balance))}`:''}</option>)}
                </select>
              )}
            </>
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
