import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from '../firebase';

export default function Auth({ lang }) {
  const [mode, setMode]   = useState('login');
  const [f, setF]         = useState({ email:'', pass:'', name:'' });
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState('');

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, f.email.trim(), f.pass);
        // onAuthStateChanged in App handles the rest — no redirect needed
      } else {
        if (!f.name.trim()) { setErr('नाम लेख्नुहोस्'); setBusy(false); return; }
        const { user } = await createUserWithEmailAndPassword(auth, f.email.trim(), f.pass);
        await updateProfile(user, { displayName: f.name.trim() });
        await set(ref(db, `users/${user.uid}`), { name: f.name.trim(), email: f.email.trim(), createdAt: Date.now() });
      }
    } catch (e) {
      const msg = {
        'auth/user-not-found':    'इमेल फेला परेन',
        'auth/wrong-password':    'गलत पासवर्ड',
        'auth/email-already-in-use': 'इमेल पहिले नै छ',
        'auth/weak-password':     'पासवर्ड कम्तिमा ६ अक्षर',
        'auth/invalid-email':     'गलत इमेल ढाँचा',
        'auth/invalid-credential':'गलत इमेल वा पासवर्ड',
      }[e.code] || e.message;
      setErr(msg);
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#042f2e,#0f766e)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:56, marginBottom:8 }}>🪴</div>
          <h1 style={{ fontSize:30, fontWeight:900, color:'#fff', margin:'0 0 4px' }}>Yoga</h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,.5)', margin:0 }}>Smart Business App</p>
        </div>

        {/* Card */}
        <div style={{ background:'var(--card)', borderRadius:24, padding:'28px 24px', boxShadow:'0 20px 60px rgba(0,0,0,.3)' }}>
          {/* Tabs */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:22 }}>
            {[['login','लगइन'],['register','दर्ता']].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setErr('');}} style={{ padding:'11px', borderRadius:14, border:`2px solid ${mode===m?'var(--p3)':'var(--bdr)'}`, background:mode===m?'var(--pl)':'transparent', color:mode===m?'var(--p2)':'var(--sub)', fontWeight:700, fontSize:14, cursor:'pointer' }}>{l}</button>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {mode === 'register' && (
              <input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="पूरा नाम" className="inp"/>
            )}
            <input value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="इमेल" type="email" className="inp" autoComplete="email"/>
            <input value={f.pass}  onChange={e=>setF({...f,pass:e.target.value})}  placeholder="पासवर्ड (कम्तिमा ६ अक्षर)" type="password" className="inp" autoComplete={mode==='login'?'current-password':'new-password'}/>
          </div>

          {err && <p style={{ color:'var(--red)', fontSize:13, fontWeight:600, margin:'10px 0 0', textAlign:'center' }}>{err}</p>}

          <button onClick={submit} disabled={busy} className="btn Bp" style={{ marginTop:18 }}>
            {busy ? <div className="SP"/> : mode==='login'?'लगइन गर्नुहोस्':'खाता बनाउनुहोस्'}
          </button>
        </div>
      </div>
    </div>
  );
}
