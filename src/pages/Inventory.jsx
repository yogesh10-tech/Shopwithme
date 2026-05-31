import { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { db } from '../firebase';
import { oa, fmt, fmtBS } from '../utils/date';
import { oqAdd } from '../utils/offlineQueue';
import { Modal, Ic, CalcModal } from '../components/UI';

const blank = { name:'', category:'', buyP:'', sellP:'', stock:'', unit:'पिस', minStock:'', barcode:'' };

export default function Inventory({ shopId, role, lang, toast }) {
  const [items,  setItems]  = useState([]);
  const [modal,  setModal]  = useState(false);
  const [editing,setEditing]= useState(null);
  const [f, setF]           = useState(blank);
  const [busy, setBusy]     = useState(false);
  const [search,setSearch]  = useState('');
  const [showCalc,setShowCalc] = useState(null); // 'buy' | 'sell'

  useEffect(() => {
    const r = ref(db, `shops/${shopId}/inventory`);
    const u = onValue(r, s => setItems(oa(s.val()).sort((a,b)=>(a.name||'').localeCompare(b.name||''))));
    return () => u();
  }, [shopId]);

  const openAdd = () => { setF(blank); setEditing(null); setModal(true); };
  const openEdit = item => { setF({ name:item.name||'', category:item.category||'', buyP:String(item.buyP||''), sellP:String(item.sellP||''), stock:String(item.stock||''), unit:item.unit||'पिस', minStock:String(item.minStock||''), barcode:item.barcode||'' }); setEditing(item.id); setModal(true); };

  const save = async () => {
    if (!f.name.trim()) return;
    setBusy(true);
    try {
      const data = { name:f.name.trim(), category:f.category, buyP:parseFloat(f.buyP)||0, sellP:parseFloat(f.sellP)||0, stock:parseFloat(f.stock)||0, unit:f.unit, minStock:parseFloat(f.minStock)||0, barcode:f.barcode||'', updatedAt:Date.now() };
      if (navigator.onLine) {
        if (editing) await update(ref(db, `shops/${shopId}/inventory/${editing}`), data);
        else { data.createdAt = Date.now(); await push(ref(db, `shops/${shopId}/inventory`), data); }
      } else {
        if (editing) oqAdd({ op:'update', path:`shops/${shopId}/inventory/${editing}`, data });
        else { data.createdAt = Date.now(); oqAdd({ op:'push', path:`shops/${shopId}/inventory`, data }); }
        toast('📵 ऑफलाइन — सिंक हुनेछ');
      }
      toast(editing ? 'अपडेट ✓' : 'थपियो ✓');
      setModal(false);
    } catch { toast('त्रुटि भयो'); }
    setBusy(false);
  };

  const deleteItem = async id => {
    if (!window.confirm('यो सामान हटाउने?')) return;
    try {
      if (navigator.onLine) await remove(ref(db, `shops/${shopId}/inventory/${id}`));
      else oqAdd({ op:'set', path:`shops/${shopId}/inventory/${id}`, data: null });
      toast('हटाइयो ✓');
    } catch { toast('त्रुटि भयो'); }
  };

  const filtered = items.filter(i => !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase()));
  const lowStock = items.filter(i => i.minStock > 0 && (i.stock||0) <= i.minStock);

  return (
    <div className="S FI" style={{ height:'100%', paddingBottom:76 }}>
      <div style={{ padding:'16px 16px 0' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
          <h1 style={{ fontSize:22,fontWeight:900,color:'var(--txt)',margin:0 }}>📦 सूची</h1>
          {role === 'owner' && (
            <button onClick={openAdd} style={{ background:'var(--p2)',border:'none',borderRadius:14,padding:'10px 16px',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}>
              <Ic n="plus" s={14} c="#fff"/> थप
            </button>
          )}
        </div>

        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <div style={{ background:'#fffbeb',border:'2px solid #fde68a',borderRadius:16,padding:'12px 14px',marginBottom:12 }}>
            <p style={{ fontSize:13,fontWeight:700,color:'#b45309',margin:'0 0 6px' }}>⚠️ कम स्टक ({lowStock.length} सामान)</p>
            {lowStock.map(i => (
              <p key={i.id} style={{ fontSize:12,color:'#92400e',margin:'2px 0' }}>• {i.name}: {i.stock||0} {i.unit}</p>
            ))}
          </div>
        )}

        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="सामान खोज्नुस्..." className="inp" style={{ marginBottom:12 }}/>

        <p style={{ fontSize:12,color:'var(--sub)',fontWeight:600,margin:'0 0 8px' }}>{filtered.length} सामान</p>

        {filtered.length === 0 && (
          <div style={{ textAlign:'center',padding:'40px 0' }}>
            <p style={{ fontSize:32,margin:'0 0 8px' }}>📦</p>
            <p style={{ color:'var(--sub)',fontSize:14 }}>कुनै सामान छैन</p>
          </div>
        )}

        {filtered.map(item => {
          const isLow = item.minStock > 0 && (item.stock||0) <= item.minStock;
          return (
            <div key={item.id} className="cd" style={{ marginBottom:8,padding:'14px',border: isLow?'2px solid #fde68a':'1px solid var(--bdr)' }}>
              <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
                <div style={{ width:44,height:44,borderRadius:14,background:'var(--pl)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>📦</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ fontSize:15,fontWeight:700,color:'var(--txt)',margin:'0 0 2px' }}>{item.name}</p>
                  {item.category && <span style={{ fontSize:11,background:'var(--bg)',color:'var(--sub)',padding:'2px 8px',borderRadius:10,fontWeight:600 }}>{item.category}</span>}
                  <div style={{ display:'flex',gap:12,marginTop:8,flexWrap:'wrap' }}>
                    <div>
                      <p style={{ fontSize:10,color:'var(--sub)',margin:'0 0 1px' }}>स्टक</p>
                      <p style={{ fontSize:15,fontWeight:800,color:isLow?'#d97706':'var(--txt)',margin:0 }}>{item.stock||0} <span style={{ fontSize:11,fontWeight:500 }}>{item.unit}</span></p>
                    </div>
                    <div>
                      <p style={{ fontSize:10,color:'var(--sub)',margin:'0 0 1px' }}>बिक्री मूल्य</p>
                      <p style={{ fontSize:15,fontWeight:800,color:'var(--p2)',margin:0 }}>{fmt(item.sellP||0)}</p>
                    </div>
                    {item.buyP > 0 && (
                      <div>
                        <p style={{ fontSize:10,color:'var(--sub)',margin:'0 0 1px' }}>लागत</p>
                        <p style={{ fontSize:13,fontWeight:600,color:'var(--sub)',margin:0 }}>{fmt(item.buyP||0)}</p>
                      </div>
                    )}
                  </div>
                </div>
                {role === 'owner' && (
                  <div style={{ display:'flex',gap:6,flexShrink:0 }}>
                    <button onClick={()=>openEdit(item)} style={{ width:32,height:32,background:'#eff6ff',border:'none',borderRadius:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Ic n="edit" s={13} c="#2563eb"/></button>
                    <button onClick={()=>deleteItem(item.id)} style={{ width:32,height:32,background:'#fef2f2',border:'none',borderRadius:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Ic n="trash" s={13} c="#dc2626"/></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <>
          <Modal onClose={()=>setModal(false)} title={editing ? 'सामान सम्पादन' : 'सामान थप्नुस्'}>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              <input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="सामानको नाम *" className="inp"/>
              <input value={f.category} onChange={e=>setF({...f,category:e.target.value})} placeholder="वर्ग (जस्तै: खाना, पेय)" className="inp"/>
              <input value={f.barcode} onChange={e=>setF({...f,barcode:e.target.value})} placeholder="बारकोड (वैकल्पिक)" className="inp"/>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                <div style={{ position:'relative' }}>
                  <input value={f.buyP} onChange={e=>setF({...f,buyP:e.target.value})} type="number" placeholder="लागत मूल्य" className="inp" style={{ paddingRight:40 }}/>
                  <button onClick={()=>setShowCalc('buy')} style={{ position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:14 }}>🧮</button>
                </div>
                <div style={{ position:'relative' }}>
                  <input value={f.sellP} onChange={e=>setF({...f,sellP:e.target.value})} type="number" placeholder="बिक्री मूल्य" className="inp" style={{ paddingRight:40 }}/>
                  <button onClick={()=>setShowCalc('sell')} style={{ position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:14 }}>🧮</button>
                </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:10 }}>
                <input value={f.stock} onChange={e=>setF({...f,stock:e.target.value})} type="number" placeholder="वर्तमान स्टक" className="inp"/>
                <select value={f.unit} onChange={e=>setF({...f,unit:e.target.value})} className="inp">
                  {['पिस','केजी','ग्राम','लिटर','मिटर','डजन','बाकस'].map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
              <input value={f.minStock} onChange={e=>setF({...f,minStock:e.target.value})} type="number" placeholder="न्यूनतम स्टक (अलर्ट)" className="inp"/>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:16 }}>
              <button onClick={()=>setModal(false)} className="btn Bo">रद्द</button>
              <button onClick={save} disabled={busy} className="btn Bp">{busy?'...':'सुरक्षित'}</button>
            </div>
          </Modal>
          {showCalc && (
            <CalcModal
              initial={showCalc==='buy'?f.buyP:f.sellP}
              onDone={v=>setF({...f,[showCalc==='buy'?'buyP':'sellP']:v})}
              onClose={()=>setShowCalc(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
