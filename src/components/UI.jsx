import { useState, useEffect } from 'react';

/* ── ICONS ─────────────────────────────────────────────────────────────────── */
const IP = {
  home:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  box:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  money:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  users:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  chart:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  settings:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  file:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  plus:'M12 4v16m8-8H4',
  x:'M6 18L18 6M6 6l12 12',
  back:'M15 19l-7-7 7-7',
  edit:'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash:'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  logout:'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  shield:'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  wa:'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.029 18.88a7.929 7.929 0 01-3.794-.965L5 18.88l1.015-3.132a7.907 7.907 0 01-1.084-4.003C4.933 7.614 8.114 4.43 12.029 4.43c1.98 0 3.836.772 5.233 2.173a7.352 7.352 0 012.167 5.222c-.002 4.07-3.182 7.255-7.4 7.255z',
  camera:'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 1 0-8 4 4 0 0 1 0 8z',
  barcode:'M3 4v16h2V4H3zm3 0v16h1V4H6zm2 0v16h1V4H8zm2 0v16h2V4h-2zm3 0v16h1V4h-1zm2 0v16h1V4h-1zm2 0v16h2V4h-2z',
};

export const Ic = ({ n, s = 20, c = 'currentColor' }) => (
  <svg width={s} height={s} fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    {IP[n] && <path d={IP[n]}/>}
  </svg>
);

/* ── SWITCH ─────────────────────────────────────────────────────────────────── */
export const Switch = ({ on, onChange }) => (
  <button className="sw" onClick={() => onChange(!on)} style={{ background: on ? 'var(--p2)' : 'var(--bdr)' }}>
    <div className="sw-k" style={{ transform: on ? 'translateX(22px)' : 'none' }}/>
  </button>
);

/* ── TOAST ──────────────────────────────────────────────────────────────────── */
export const ToastComp = ({ toasts }) => (
  <>
    {toasts.map(t => (
      <div key={t.id} className="TST">{t.msg}</div>
    ))}
  </>
);

/* ── OFFLINE BANNER ─────────────────────────────────────────────────────────── */
export const OfflineBanner = ({ onFlush }) => {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [qCount, setQCount] = useState(0);

  useEffect(() => {
    const refresh = () => {
      try { setQCount(JSON.parse(localStorage.getItem('meropasal_offline_queue') || '[]').length); } catch {}
    };
    refresh();
    const on = () => { setOffline(false); onFlush && onFlush(); refresh(); };
    const off = () => { setOffline(true); refresh(); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const t = setInterval(refresh, 3000);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(t); };
  }, [onFlush]);

  if (!offline && qCount === 0) return null;
  if (!offline && qCount > 0) return (
    <div className="offline-bar" style={{ background: '#0f766e' }}>🔄 {qCount} रेकर्ड सिंक हुँदैछ...</div>
  );
  return (
    <div className="offline-bar" style={{ background: '#b91c1c' }}>
      📵 अफलाइन {qCount > 0 ? `— ${qCount} रेकर्ड पर्खिरहेको` : '— डेटा सुरक्षित'}
    </div>
  );
};

/* ── MODAL ──────────────────────────────────────────────────────────────────── */
export const Modal = ({ onClose, title, children }) => (
  <div className="OV" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="SH SU">
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 20px 0' }}>
        <h2 style={{ fontSize:18,fontWeight:800,color:'var(--txt)',margin:0 }}>{title}</h2>
        <button onClick={onClose} style={{ width:32,height:32,background:'var(--bg)',border:'none',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <Ic n="x" s={16} c="var(--sub)"/>
        </button>
      </div>
      <div style={{ padding:'16px 20px 24px' }}>{children}</div>
    </div>
  </div>
);

/* ── CALCULATOR ─────────────────────────────────────────────────────────────── */
export const CalcModal = ({ onDone, onClose, initial = '' }) => {
  const [expr, setExpr] = useState(initial || '');
  const [display, setDisplay] = useState(initial || '0');

  const press = k => {
    if (k === 'C') { setExpr(''); setDisplay('0'); return; }
    if (k === '⌫') { const n = expr.slice(0,-1); setExpr(n); setDisplay(n || '0'); return; }
    if (k === '=') {
      try {
        const safe = expr.replace(/[^0-9+\-*/.]/g,'');
        if (!safe) return;
        // eslint-disable-next-line no-new-func
        const res = Function('"use strict";return (' + safe + ')')();
        const rounded = Math.round(res * 100) / 100;
        setDisplay(String(rounded)); setExpr(String(rounded));
      } catch { setDisplay('Error'); setExpr(''); }
      return;
    }
    const n = expr + k; setExpr(n); setDisplay(n);
  };

  const opMap = { '÷':'/', '×':'*' };
  const handleKey = k => {
    if (k === '✓') { const v = parseFloat(display); if (!isNaN(v)) onDone(String(v)); onClose(); return; }
    press(opMap[k] || k);
  };

  const keys = [['C','⌫','%','÷'],['7','8','9','×'],['4','5','6','-'],['1','2','3','+'],['0','.','=','✓']];

  return (
    <div className="OV" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="SH SU" style={{ borderRadius:'24px 24px 0 0',padding:'16px 16px 32px' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
          <span style={{ fontSize:15,fontWeight:700,color:'var(--sub)' }}>🧮 Calculator</span>
          <button onClick={onClose} style={{ width:30,height:30,background:'var(--bg)',border:'none',borderRadius:'50%',cursor:'pointer' }}><Ic n="x" s={14} c="var(--sub)"/></button>
        </div>
        <div style={{ background:'var(--bg)',borderRadius:16,padding:'14px 18px',marginBottom:14,textAlign:'right' }}>
          <p style={{ fontSize:11,color:'var(--sub)',margin:'0 0 2px',wordBreak:'break-all' }}>{expr}</p>
          <p style={{ fontSize:32,fontWeight:900,color:'var(--txt)',margin:0,wordBreak:'break-all' }}>{display}</p>
        </div>
        {keys.map((row,ri) => (
          <div key={ri} style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:9,marginBottom:9 }}>
            {row.map(k => {
              const isOp = ['÷','×','-','+','=','✓','C','⌫','%'].includes(k);
              const isDone = k === '✓';
              return (
                <button key={k} onClick={() => handleKey(k)} className="calc-key"
                  style={{ background: isDone?'var(--p2)':isOp?'var(--pl)':'var(--card)', color: isDone?'#fff':isOp?'var(--p2)':'var(--txt)', border: isOp&&!isDone?'1px solid var(--p4)':'1px solid var(--bdr)' }}>
                  {k}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── PAGE LAYOUT ────────────────────────────────────────────────────────────── */
export function PageWrap({ title, action, children }) {
  return (
    <div className="page-wrap S FI">
      {title && (
        <header className="page-hdr">
          <h1 className="page-title">{title}</h1>
          {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
        </header>
      )}
      <div className="page-body">{children}</div>
    </div>
  );
}

export function WelcomeBanner({ name, shopName, isAdmin, onAdmin }) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'शुभ प्रभात' : hour < 17 ? 'नमस्ते' : 'शुभ साँझ';
  const who = name || 'साथी';
  return (
    <div className="welcome-card cd">
      <div className="welcome-avatar">{(who[0] || 'Y').toUpperCase()}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="welcome-greet">{greet}, {who} 👋</p>
        <p className="welcome-shop">{shopName || 'Yoga कारोबार'}</p>
        <p className="welcome-sub">आजको कारोबार यहाँबाट हेर्नुहोस्</p>
      </div>
      {isAdmin && onAdmin && (
        <button type="button" onClick={onAdmin} className="welcome-admin-btn">
          🛡️ Admin
        </button>
      )}
    </div>
  );
}

export function MiniBarChart({ data, title }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="chart-card cd">
      {title && <p className="chart-title">{title}</p>}
      <div className="bar-chart">
        {data.map((d, i) => (
          <div key={i} className="bar-col">
            <div
              className="bar-fill"
              style={{ height: `${Math.max(8, (d.value / max) * 72)}px` }}
              title={String(d.value)}
            />
            <span className="bar-lbl">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── SETTINGS HELPERS ───────────────────────────────────────────────────────── */
export const Sec = ({ title, children }) => (
  <div className="cd" style={{ marginBottom:12,padding:'6px 4px' }}>
    {title && <p style={{ fontSize:11,fontWeight:700,color:'var(--sub)',textTransform:'uppercase',letterSpacing:.8,margin:'10px 12px 6px' }}>{title}</p>}
    {children}
  </div>
);

export const Row = ({ icon, label, right, onClick, danger, last }) => (
  <div onClick={onClick} style={{ display:'flex',alignItems:'center',gap:12,padding:'13px 12px',borderBottom: last?'none':'1px solid var(--bdr)',cursor:onClick?'pointer':'default' }}>
    <span style={{ fontSize:18,flexShrink:0 }}>{icon}</span>
    <span style={{ flex:1,fontSize:14,fontWeight:600,color:danger?'var(--red)':'var(--txt)' }}>{label}</span>
    {right && <span>{right}</span>}
  {onClick && <span style={{ transform:'rotate(180deg)', display:'flex' }}><Ic n="back" s={14} c="var(--sub)"/></span>}
    </div>
);
