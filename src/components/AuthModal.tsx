import React, { useState, useEffect } from 'react';
import { UserAccount, AppState } from '../types';
import { uploadToGoogleDrive, downloadFromGoogleDrive } from '../utils/googleDriveSync';
import { connectGoogleDrive, uploadDrive, pullDrive, fetchGoogleUserProfile } from '../utils/sync';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onUserChange: (user: UserAccount | null) => void;
  appState: AppState;
  onRestoreState: (state: AppState) => void;
  syncStatus: string;
  onUpdateSyncStatus: (status: string) => void;
  isLocked?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  appState,
  onRestoreState,
  syncStatus,
  onUpdateSyncStatus,
  isLocked = false,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [remember, setRemember] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(null), 5000);
      return () => clearTimeout(t);
    }
  }, [notice]);

  if (!isOpen) return null;

  // Google Sign-In with Google Drive Permission
  const handleGoogleSignIn = async () => {
    setIsSyncing(true);
    setNotice({ msg: 'Đang kết nối tài khoản Google và mở ủy quyền Google Drive...', type: 'info' });

    try {
      await connectGoogleDrive(
        (st) => onUpdateSyncStatus(st),
        (updater) => {
          onRestoreState(updater(appState));
        },
        () => appState
      );

      // Fetch authentic Google user profile details
      let profile = await fetchGoogleUserProfile();
      const realName = profile?.name || name || 'Tài khoản Google';
      const realEmail = profile?.email || email || 'google.user@gmail.com';
      const realAvatar = profile?.avatar || '🚗';

      const googleUser: UserAccount = {
        id: `usr-g-${Date.now()}`,
        email: realEmail,
        name: realName,
        avatar: realAvatar,
        provider: 'google',
        createdAt: new Date().toISOString(),
        lastSync: new Date().toLocaleTimeString('vi-VN'),
        remember,
      };

      if (remember) {
        localStorage.setItem('veo_user_account', JSON.stringify(googleUser));
        localStorage.setItem('soxe_gd', '1');
      } else {
        sessionStorage.setItem('veo_user_account', JSON.stringify(googleUser));
      }

      onUserChange(googleUser);
      setNotice({ msg: `Chào mừng ${realName}! Tự động đồng bộ Google Drive đã kích hoạt.`, type: 'success' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      // Let user know clearly if sign in had an issue
      setNotice({
        msg: `Chưa đăng nhập được Google: ${err?.message || 'Vui lòng bấm lại hoặc nhập tài khoản bên dưới'}`,
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Local Account Sign Up / Sign In
  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pin.trim()) {
      setNotice({ msg: 'Vui lòng nhập Email và Mật khẩu / Mã PIN', type: 'error' });
      return;
    }

    const localUser: UserAccount = {
      id: `usr-loc-${Date.now()}`,
      email: email.trim().toLowerCase(),
      name: name.trim() || (email.split('@')[0] || 'Tài xế Veo'),
      avatar: '👤',
      provider: 'local',
      createdAt: new Date().toISOString(),
      lastSync: new Date().toLocaleTimeString('vi-VN'),
      remember,
    };

    if (remember) {
      localStorage.setItem('veo_user_account', JSON.stringify(localUser));
      localStorage.setItem(`veo_pin_${localUser.email}`, pin);
    } else {
      sessionStorage.setItem('veo_user_account', JSON.stringify(localUser));
    }

    onUserChange(localUser);
    setNotice({
      msg: tab === 'register' ? 'Đăng ký tài khoản thành công! Đã ghi nhớ tài khoản.' : 'Đăng nhập thành công!',
      type: 'success',
    });
    setTimeout(() => {
      onClose();
    }, 900);
  };

  // Manual Sync to Google Drive
  const handleManualSyncNow = async () => {
    setIsSyncing(true);
    setNotice({ msg: 'Đang tải toàn bộ dữ liệu xe và lộ trình lên Google Drive...', type: 'info' });

    try {
      await uploadDrive(appState);
      const nowStr = new Date().toLocaleTimeString('vi-VN');
      onUpdateSyncStatus(`Đã lưu đám mây lúc ${nowStr}`);
      if (currentUser) {
        const updated = { ...currentUser, lastSync: nowStr };
        onUserChange(updated);
        if (remember) {
          localStorage.setItem('veo_user_account', JSON.stringify(updated));
        }
      }
      setNotice({ msg: 'Đồng bộ lên Google Drive thành công!', type: 'success' });
    } catch (err: any) {
      setNotice({ msg: `Lỗi đồng bộ: ${err.message || 'Kiểm tra kết nối'}`, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull / Restore from Google Drive
  const handleRestoreFromDrive = async () => {
    setIsSyncing(true);
    setNotice({ msg: 'Đang tìm và tải bản sao lưu từ Google Drive...', type: 'info' });

    try {
      const data = await pullDrive();
      if (!data) {
        setNotice({ msg: 'Chưa tìm thấy bản sao lưu nào trên Google Drive.', type: 'info' });
        return;
      }
      if (data.vehicles && Array.isArray(data.vehicles)) {
        onRestoreState({
          vehicles: data.vehicles,
          entries: data.entries || [],
          parts: data.parts || [],
          cur: data.vehicles[0] ? data.vehicles[0].id : null,
          tomb: data.tomb || {},
        });
        setNotice({ msg: `Khôi phục thành công ${data.vehicles.length} xe từ Google Drive!`, type: 'success' });
      }
    } catch (err: any) {
      setNotice({ msg: `Không thể tải dữ liệu: ${err.message || 'Lỗi kết nối'}`, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('veo_user_account');
    localStorage.removeItem('soxe_gd');
    sessionStorage.removeItem('veo_user_account');
    onUserChange(null);
    setNotice({ msg: 'Đã đăng xuất tài khoản.', type: 'info' });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={isLocked ? undefined : onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          margin: 0,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1.5px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ margin: 0, fontSize: '17px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔐 {currentUser ? 'Tài khoản & Đồng bộ Đám mây' : 'Đăng nhập / Tạo tài khoản'}
          </h2>
          {!isLocked && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--mut)',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Notice alert */}
        {notice && (
          <div
            style={{
              marginBottom: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              background:
                notice.type === 'success'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : notice.type === 'error'
                  ? 'rgba(244, 63, 94, 0.2)'
                  : 'rgba(56, 189, 248, 0.2)',
              border: `1px solid ${
                notice.type === 'success' ? '#10b981' : notice.type === 'error' ? '#f43f5e' : '#38bdf8'
              }`,
              color: '#f8fafc',
            }}
          >
            {notice.msg}
          </div>
        )}

        {currentUser ? (
          /* LOGGED IN VIEW */
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  boxShadow: '0 0 14px rgba(56, 189, 248, 0.4)',
                }}
              >
                {currentUser.avatar || '👤'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#f8fafc' }}>{currentUser.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--mut)', wordBreak: 'break-all' }}>{currentUser.email}</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: currentUser.provider === 'google' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                      color: currentUser.provider === 'google' ? '#fbbf24' : '#38bdf8',
                      fontWeight: 700,
                    }}
                  >
                    {currentUser.provider === 'google' ? '🌐 Google Drive Auto-Sync' : '💻 Tài khoản cục bộ'}
                  </span>
                  {currentUser.remember && (
                    <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>✓ Ghi nhớ tự động</span>
                  )}
                </div>
              </div>
            </div>

            {/* Cloud Sync Status info */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(2, 6, 23, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: '12px',
                marginBottom: '14px',
                lineHeight: 1.6,
              }}
            >
              <div>
                ☁️ <b>Google Drive Sync:</b>{' '}
                <span style={{ color: '#38bdf8' }}>{syncStatus || 'Tự động đồng bộ khi thay đổi'}</span>
              </div>
              {currentUser.lastSync && (
                <div style={{ color: 'var(--mut)', fontSize: '11px', marginTop: '2px' }}>
                  Lần sao lưu gần nhất: <b>{currentUser.lastSync}</b>
                </div>
              )}
            </div>

            {/* Sync Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={handleManualSyncNow}
                disabled={isSyncing}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: isSyncing ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isSyncing ? '⏳ Đang đồng bộ...' : '☁️ Đồng bộ lên Google Drive ngay'}
              </button>

              <button
                type="button"
                onClick={handleRestoreFromDrive}
                disabled={isSyncing}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: isSyncing ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                📥 Tải lại bản sao lưu từ Google Drive
              </button>
            </div>

            {/* Logout button */}
            <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f43f5e',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🚪 Đăng xuất / Sử dụng tài khoản khác
              </button>
            </div>
          </div>
        ) : (
          /* NOT LOGGED IN: SIGN IN OR REGISTER */
          <div>
            {/* Google One-Click Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSyncing}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#ffffff',
                color: '#0f172a',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: isSyncing ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(255, 255, 255, 0.2)',
                marginBottom: '16px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isSyncing ? 'Đang kết nối...' : 'Đăng nhập bằng tài khoản Google'}</span>
            </button>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '14px 0',
                color: 'var(--mut)',
                fontSize: '11px',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
              <span style={{ padding: '0 8px' }}>HOẶC TẠO TÀI KHOẢN NỘI BỘ</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
            </div>

            {/* Tab switch between Sign In and Register */}
            <div className="tabs" style={{ marginBottom: '12px' }}>
              <button
                type="button"
                className={tab === 'login' ? 'active' : ''}
                onClick={() => setTab('login')}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={tab === 'register' ? 'active' : ''}
                onClick={() => setTab('register')}
              >
                Đăng ký tài khoản mới
              </button>
            </div>

            <form onSubmit={handleLocalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tab === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--mut)', marginBottom: '4px' }}>
                    Họ và tên chủ xe:
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Nguyễn Văn Nam"
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--mut)', marginBottom: '4px' }}>
                  Địa chỉ Email:
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@example.com"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--mut)', marginBottom: '4px' }}>
                  Mật khẩu hoặc Mã PIN (4-6 số):
                </label>
                <input
                  type="password"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Remember Account Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#e2e8f0',
                  marginTop: '4px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                />
                <span>Ghi nhớ tài khoản trên thiết bị này (không cần đăng nhập lại)</span>
              </label>

              <button
                type="submit"
                style={{
                  marginTop: '6px',
                  padding: '11px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                {tab === 'register' ? '🚀 Tạo tài khoản & Bắt đầu' : '🔑 Đăng nhập'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
