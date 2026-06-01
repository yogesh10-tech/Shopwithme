import { useState, useEffect } from 'react';
import { getOfflineStatus, getOfflineStoreStats } from '../utils/offlineStore';
import { forceSyncAll } from '../utils/offlineSync';

export default function OfflineStatusIndicator({ shopId, toast }) {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [stats, setStats] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      toast('✅ अनलाइन भयो');
    };

    const handleOffline = () => {
      setOffline(true);
      toast('📵 अफलाइन मोड');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setStats(getOfflineStoreStats());
    }, 2000);

    setStats(getOfflineStoreStats());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [toast]);

  const handleManualSync = async () => {
    setSyncing(true);
    await forceSyncAll(shopId, toast);
    setSyncing(false);
  };

  if (!offline) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        left: 0,
        right: 0,
        background: '#fee2e2',
        borderTop: '3px solid #dc2626',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 999,
        fontSize: 13,
        color: '#991b1b',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>📵</span>
        <div>
          <strong>अफलाइन मोड सक्रिय</strong>
          {stats && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#b91c1c' }}>
              {stats.inventoryItems} सामान · {stats.parties} ग्राहक · {stats.transactions} लेनदेन
            </p>
          )}
        </div>
      </div>
      <button
        onClick={handleManualSync}
        disabled={syncing}
        style={{
          padding: '6px 12px',
          background: '#dc2626',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: syncing ? 'not-allowed' : 'pointer',
          fontSize: 12,
          fontWeight: 600,
          opacity: syncing ? 0.7 : 1,
        }}
      >
        {syncing ? '⏳ सिंक...' : '🔄 सिंक करुन'}
      </button>
    </div>
  );
}
