import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../firebase';
import { Ic } from '../components/UI';
import { fmtBS } from '../utils/date';

export default function AdminPanel({ onClose, toast, hasShop }) {
  const [shops, setShops] = useState({});
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const u1 = onValue(ref(db, 'shops'), snap => {
      setShops(snap.val() || {});
      setLoading(false);
    });
    const u2 = onValue(ref(db, 'users'), snap => setUsers(snap.val() || {}));
    return () => { u1(); u2(); };
  }, []);

  const shopList = useMemo(() => {
    return Object.entries(shops).map(([id, s]) => {
      const owner = users[s?.ownerId];
      const members = s?.members ? Object.keys(s.members).length : 0;
      return { id, ...s, ownerName: owner?.name || owner?.email || '—', ownerEmail: owner?.email || '—', members };
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [shops, users]);

  const filtered = useMemo(() => {
    let list = shopList;
    if (filter === 'active') list = list.filter(s => s.status !== 'suspended');
    if (filter === 'suspended') list = list.filter(s => s.status === 'suspended');
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.code || '').toLowerCase().includes(q) ||
        (s.ownerEmail || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [shopList, search, filter]);

  const stats = useMemo(() => ({
    total: shopList.length,
    active: shopList.filter(s => s.status !== 'suspended').length,
    suspended: shopList.filter(s => s.status === 'suspended').length,
  }), [shopList]);

  const toggleSuspend = async (shop, suspend) => {
    const label = suspend ? 'निलम्बित' : 'सक्रिय';
    if (!window.confirm(`"${shop.name}" ${suspend ? 'निलम्बित' : 'सक्रिय'} गर्ने?`)) return;
    try {
      await update(ref(db, `shops/${shop.id}`), {
        status: suspend ? 'suspended' : 'active',
        suspendedAt: suspend ? Date.now() : null,
      });
      toast(`${shop.name} ${label} ✓`);
    } catch {
      toast('त्रुटि भयो');
    }
  };

  return (
    <div className="admin-panel S FI">
      <header className="page-hdr admin-hdr">
        <button type="button" onClick={onClose} className="icon-btn" aria-label="Back" style={{ background:'rgba(255,255,255,.2)' }}>
          <Ic n="back" s={20} c="#fff"/>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-title" style={{ color: '#fff', margin: 0 }}>Admin Panel</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', margin: '2px 0 0' }}>सबै पसल व्यवस्थापन</p>
        </div>
        <span className="admin-badge">{stats.total} पसल</span>
      </header>

      <div style={{ padding: '16px' }}>
        <div className="admin-welcome">
          <h2>🛡️ स्वागत छ, Admin!</h2>
          <p>यहाँबाट सबै पसल हेर्नुहोस् र प्रयोगकर्ता निलम्बित वा सक्रिय गर्नुहोस्।</p>
        </div>

        <div className="stat-row">
          <div className="stat-chip"><span className="stat-num">{stats.active}</span><span className="stat-lbl">सक्रिय</span></div>
          <div className="stat-chip stat-warn"><span className="stat-num">{stats.suspended}</span><span className="stat-lbl">निलम्बित</span></div>
          <div className="stat-chip stat-muted"><span className="stat-num">{Object.keys(users).length}</span><span className="stat-lbl">प्रयोगकर्ता</span></div>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="पसल, कोड वा इमेल खोज्नुहोस्..."
          className="inp"
          style={{ marginBottom: 10 }}
        />

        <div className="filter-row">
          {[['all', 'सबै'], ['active', 'सक्रिय'], ['suspended', 'निलम्बित']].map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setFilter(v)}
              className={`filter-pill ${filter === v ? 'on' : ''}`}
            >
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--sub)', padding: 32 }}>लोड हुँदैछ...</p>
        ) : filtered.length === 0 ? (
          <div className="cd empty-card">
            <span style={{ fontSize: 40 }}>🏪</span>
            <p style={{ margin: '8px 0 0', color: 'var(--sub)' }}>कुनै पसल फेला परेन</p>
          </div>
        ) : (
          filtered.map(shop => {
            const suspended = shop.status === 'suspended';
            return (
              <div key={shop.id} className="cd shop-admin-card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--txt)' }}>{shop.name}</h3>
                      <span className={`status-tag ${suspended ? 'off' : 'on'}`}>
                        {suspended ? 'निलम्बित' : 'सक्रिय'}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--sub)', margin: '4px 0 0' }}>
                      कोड: <strong>{shop.code}</strong> · सदस्य: {shop.members}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--sub)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      👤 {shop.ownerName} · {shop.ownerEmail}
                    </p>
                    {shop.createdAt && (
                      <p style={{ fontSize: 11, color: 'var(--sub)', margin: '4px 0 0', opacity: 0.8 }}>
                        {fmtBS(shop.createdAt, 'ne')}
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {suspended ? (
                    <button type="button" onClick={() => toggleSuspend(shop, false)} className="btn-sm btn-activate">
                      ✓ सक्रिय गर्नुहोस्
                    </button>
                  ) : (
                    <button type="button" onClick={() => toggleSuspend(shop, true)} className="btn-sm btn-suspend">
                      🔒 निलम्बित गर्नुहोस्
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {!hasShop && (
          <button type="button" onClick={onClose} className="btn Bo" style={{ marginTop: 16 }}>
            ← पसल सेटअपमा जानुहोस्
          </button>
        )}
      </div>
    </div>
  );
}
