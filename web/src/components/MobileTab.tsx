'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Smartphone,
  RotateCcw,
  ExternalLink,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Zap,
  ZoomIn,
  ZoomOut,
  Sparkles,
  AlignJustify,
  AlignCenter
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export const MobileTab: React.FC = () => {
  const { t, language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Cấu hình URL linh hoạt: Môi trường Vercel Cloud (biến môi trường) hoặc Localhost (:8085)
  const envMobileUrl = process.env.NEXT_PUBLIC_MOBILE_APP_URL?.trim();

  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCenterOnly, setIsCenterOnly] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [scale, setScale] = useState<number>(0.82); // Tỷ lệ mặc định vừa vặn màn hình

  // Tự động nhận diện môi trường: Local (:8085) vs Cloud Hosted
  const [isLocalHost, setIsLocalHost] = useState(true);
  const [urlMode, setUrlMode] = useState<'local' | 'cloud'>('local');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setIsLocalHost(isLocal);
      if (envMobileUrl && !isLocal) {
        setUrlMode('cloud');
      } else if (!isLocal) {
        setUrlMode('cloud');
      } else {
        setUrlMode('local');
      }
    }
  }, [envMobileUrl]);

  // URL thực tế cấp cho iframe và các nút liên kết
  const activeMobileUrl = (urlMode === 'cloud' && envMobileUrl)
    ? envMobileUrl
    : 'http://localhost:8085';

  useEffect(() => {
    setLoadTimeout(false);
    const timer = setTimeout(() => {
      setLoadTimeout(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, [iframeKey]);

  // Kích thước chuẩn mô phỏng iPhone 16 Pro
  const PHONE_WIDTH = 390;
  const PHONE_HEIGHT = 810;

  // Tự động tính toán tỷ lệ vừa vặn theo chiều cao màn hình hiện tại
  const handleAutoFit = () => {
    if (typeof window !== 'undefined') {
      const windowH = window.innerHeight;
      const isFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      // Nếu đang toàn màn hình thì chỉ trừ khoảng 90px cho thanh công cụ nổi
      const availableH = isFull ? Math.max(500, windowH - 90) : Math.max(480, windowH - 240);
      const computedScale = Math.min(1.05, Math.max(0.60, Number((availableH / PHONE_HEIGHT).toFixed(2))));
      setScale(computedScale);
    }
  };

  useEffect(() => {
    handleAutoFit();
    const onResize = () => handleAutoFit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Lắng nghe sự kiện Fullscreen của trình duyệt (F11 hoặc phím Esc)
  useEffect(() => {
    const onFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFull);
      setTimeout(() => {
        handleAutoFit();
      }, 100);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  // Bật/tắt chế độ toàn màn hình chuẩn HTML5 Fullscreen API (giống F11)
  const handleToggleFullscreen = async () => {
    try {
      const isFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      if (!isFull) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any)?.webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Lỗi khi kích hoạt chế độ toàn màn hình:', err);
    }
  };

  const handleRefresh = () => {
    setIsLoaded(false);
    setIframeKey(prev => prev + 1);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(1.15, Number((prev + 0.05).toFixed(2))));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.55, Number((prev - 0.05).toFixed(2))));
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        width: '100%',
        backgroundColor: isFullscreen ? '#f8fafc' : 'transparent',
        padding: isFullscreen ? '1.25rem 2rem' : '0',
        minHeight: isFullscreen ? '100vh' : 'auto',
        overflow: 'auto',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Header toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '0.85rem 1.5rem',
        backgroundColor: isFullscreen ? '#ffffff' : 'var(--bg-secondary)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: isFullscreen ? '0 10px 30px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
        zIndex: 40,
        position: isFullscreen ? 'sticky' : 'relative',
        top: 0
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Smartphone size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {t('mobile.title')}
              {isFullscreen && (
                <span style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '20px',
                  backgroundColor: '#eef2ff',
                  color: '#4338ca',
                  border: '1px solid #e0e7ff',
                  fontWeight: 600
                }}>
                  🖥️ {t('mobile.fullscreen')}
                </span>
              )}
            </h2>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {t('mobile.subtitle')}
            </p>
          </div>
        </div>

        {/* Action Controls & Zoom Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Zoom & Fit Controller */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            padding: '2px',
            gap: '2px'
          }}>
            <button
              onClick={handleZoomOut}
              title={t('mobile.zoomOut')}
              style={{
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                borderRadius: '6px'
              }}
            >
              <ZoomOut size={15} />
            </button>

            <button
              onClick={handleAutoFit}
              title={t('mobile.fitScreen')}
              style={{
                padding: '0 0.5rem',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                backgroundColor: '#eef2ff',
                border: '1px solid #e0e7ff',
                color: '#4338ca',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: '6px'
              }}
            >
              <Sparkles size={12} />
              <span>{Math.round(scale * 100)}% ({t('mobile.fitScreen')})</span>
            </button>

            <button
              onClick={() => setScale(1.0)}
              title="100%"
              style={{
                padding: '0 0.4rem',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: scale === 1.0 ? '#ffffff' : 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                borderRadius: '6px'
              }}
            >
              100%
            </button>

            <button
              onClick={handleZoomIn}
              title={t('mobile.zoomIn')}
              style={{
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                borderRadius: '6px'
              }}
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Toggle Center / Side info (only when not in fullscreen) */}
          {!isFullscreen && (
            <button
              onClick={() => setIsCenterOnly(!isCenterOnly)}
              title={isCenterOnly ? t('mobile.showFeed') : t('mobile.center')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: isCenterOnly ? '#eef2ff' : '#f1f5f9',
                border: '1px solid var(--border-color)',
                color: isCenterOnly ? '#4338ca' : 'var(--text-primary)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {isCenterOnly ? <AlignJustify size={14} /> : <AlignCenter size={14} />}
              <span>{isCenterOnly ? t('mobile.showFeed') : t('mobile.center')}</span>
            </button>
          )}

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            title={t('mobile.reload')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              backgroundColor: '#f1f5f9',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <RotateCcw size={14} />
            <span>{t('mobile.reload')}</span>
          </button>

          {/* TRUE FULLSCREEN TOGGLE (F11 equivalent) */}
          <button
            onClick={handleToggleFullscreen}
            title={isFullscreen ? t('mobile.exitFullscreen') : t('mobile.fullscreen')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: isFullscreen ? '#fee2e2' : '#eef2ff',
              border: isFullscreen ? '1px solid #fecaca' : '1px solid #e0e7ff',
              color: isFullscreen ? '#b91c1c' : '#4338ca',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? t('mobile.exitFullscreen') : t('mobile.fullscreen')}</span>
          </button>

          {/* Environment Mode Switcher: Local (:8085) vs Cloud Vercel */}
          {envMobileUrl ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              padding: '2px',
              gap: '2px'
            }}>
              <button
                onClick={() => { setUrlMode('local'); setIsLoaded(false); }}
                title="Sử dụng cổng Local 8085"
                style={{
                  padding: '0 0.6rem',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  backgroundColor: urlMode === 'local' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: urlMode === 'local' ? 600 : 500,
                  color: urlMode === 'local' ? '#0f172a' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: urlMode === 'local' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                <span>💻 Local :8085</span>
              </button>
              <button
                onClick={() => { setUrlMode('cloud'); setIsLoaded(false); }}
                title={`Sử dụng Cloud URL: ${envMobileUrl}`}
                style={{
                  padding: '0 0.6rem',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  backgroundColor: urlMode === 'cloud' ? '#4f46e5' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: urlMode === 'cloud' ? 600 : 500,
                  color: urlMode === 'cloud' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: urlMode === 'cloud' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <span>☁️ Cloud Vercel</span>
              </button>
            </div>
          ) : (
            <span style={{
              fontSize: '0.72rem',
              padding: '0.25rem 0.6rem',
              borderRadius: '8px',
              backgroundColor: isLocalHost ? '#f1f5f9' : '#fef3c7',
              color: isLocalHost ? '#475569' : '#b45309',
              border: '1px solid var(--border-color)',
              fontWeight: 600
            }}>
              {isLocalHost ? '💻 Local Dev (:8085)' : '☁️ Vercel Mode'}
            </span>
          )}

          {/* Open in separate tab */}
          <a
            href={activeMobileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              background: '#4f46e5',
              border: 'none',
              color: 'white',
              fontSize: '0.78rem',
              textDecoration: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
            }}
          >
            <ExternalLink size={14} />
            <span>{t('mobile.newTab')}</span>
          </a>
        </div>
      </div>

      {/* Main interactive area */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: (isFullscreen || isCenterOnly) ? '1fr' : 'auto 1fr',
        gap: '2rem',
        alignItems: 'start',
        justifyContent: 'center',
        flex: 1
      }}>
        {/* Smartphone Chassis Container with scale wrapper */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: '100%',
          padding: isFullscreen ? '1rem 0' : '0'
        }}>
          {/* Scaled Wrapper Box: reserves exact scaled dimensions on the screen */}
          <div style={{
            width: `${Math.round(PHONE_WIDTH * scale)}px`,
            maxWidth: `${Math.round(PHONE_WIDTH * scale)}px`,
            height: `${Math.round(PHONE_HEIGHT * scale)}px`,
            position: 'relative',
            transition: 'width 0.2s ease, height 0.2s ease'
          }}>
            {/* The Actual Smartphone Frame rendered at standard resolution & scaled */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: 'top center',
              width: `${PHONE_WIDTH}px`,
              height: `${PHONE_HEIGHT}px`,
              background: '#0b0f19',
              borderRadius: '48px',
              padding: '12px',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.2), 0 0 0 4px #cbd5e1, 0 0 0 7px #e2e8f0',
              border: '2px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'transform 0.2s ease'
            }}>
              {/* Screen Container */}
              <div style={{
                flex: 1,
                width: '100%',
                height: '100%',
                borderRadius: '38px',
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: '#ffffff'
              }}>
                {/* Loading spinner */}
                {!isLoaded && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: '#0f172a',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    gap: '0.85rem',
                    color: 'white',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      border: '3px solid rgba(99, 102, 241, 0.2)',
                      borderTopColor: '#6366f1',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                      {t('mobile.launching')}
                    </p>
                    {loadTimeout && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem', marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={handleRefresh}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              backgroundColor: '#4f46e5',
                              border: 'none',
                              color: 'white',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            🔄 {t('mobile.retry')}
                          </button>
                          <a
                            href={activeMobileUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              backgroundColor: '#1e293b',
                              border: '1px solid #475569',
                              color: '#38bdf8',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              textDecoration: 'none'
                            }}
                          >
                            {urlMode === 'cloud' ? 'Mở Cloud App ↗' : t('mobile.openPort')}
                          </a>
                        </div>
                        {urlMode === 'cloud' && !envMobileUrl && (
                          <span style={{ fontSize: '0.7rem', color: '#f87171', textAlign: 'center', maxWidth: '300px' }}>
                            Chưa cấu hình biến <code>NEXT_PUBLIC_MOBILE_APP_URL</code> trên Vercel.
                          </span>
                        )}
                        {urlMode === 'local' && (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', maxWidth: '300px' }}>
                            Chạy <code>npm run mobile</code> trong web để bật cổng 8085.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Embedded Expo Web App with Full Bluetooth and Fullscreen permissions */}
                <iframe
                  key={iframeKey}
                  ref={iframeRef}
                  src={activeMobileUrl}
                  allow="bluetooth; bluetooth-scanning; fullscreen; accelerometer; gyroscope"
                  allowFullScreen={true}
                  onLoad={() => setIsLoaded(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#ffffff'
                  }}
                  title="ProWatch Health Mobile App"
                />
              </div>

              {/* Bottom Home Indicator Bar */}
              <div style={{
                width: '130px',
                height: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                borderRadius: '4px',
                margin: '8px auto 2px auto',
                zIndex: 30
              }} />
            </div>
          </div>
        </div>

        {/* Feature info & control panel (hidden in fullscreen or center-only mode) */}
        {!isFullscreen && !isCenterOnly && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Info Card */}
            <div style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                <Zap size={18} color="#0284c7" />
                <span>{t('mobile.statusTitle')}</span>
              </div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                {urlMode === 'cloud' && envMobileUrl
                  ? (language === 'vi'
                      ? `Ứng dụng di động đang kết nối trực tiếp phiên bản Cloud Vercel (${envMobileUrl}). Tương tác trực tiếp với Supabase Database.`
                      : `Mobile app is running from Cloud Vercel deployment (${envMobileUrl}). Real-time sync with Supabase Database.`)
                  : t('mobile.statusDesc')}
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.65rem',
                marginTop: '0.2rem'
              }}>
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('mobile.port')}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0284c7', marginTop: '0.15rem' }}>
                    {urlMode === 'cloud' ? 'Cloud Vercel' : ':8085'}
                  </div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('mobile.framework')}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#6d28d9', marginTop: '0.15rem' }}>
                    Expo 57 / RN 0.86
                  </div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('mobile.database')}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#059669', marginTop: '0.15rem' }}>
                    Supabase PostgreSQL
                  </div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('mobile.aiModel')}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#d97706', marginTop: '0.15rem' }}>
                    Risk score (TinyML)
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Modules */}
            <div style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                <CheckCircle2 size={17} color="#059669" />
                <span>{t('mobile.modulesTitle')}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{ color: '#059669', fontSize: '0.8rem' }}>•</span>
                  <div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t('mobile.modVitals')}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
                      {t('mobile.modVitalsDesc')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{ color: '#059669', fontSize: '0.8rem' }}>•</span>
                  <div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t('mobile.modSleep')}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
                      {t('mobile.modSleepDesc')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{ color: '#059669', fontSize: '0.8rem' }}>•</span>
                  <div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t('mobile.modHar')}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
                      {t('mobile.modHarDesc')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{ color: '#059669', fontSize: '0.8rem' }}>•</span>
                  <div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t('mobile.modSecurity')}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
                      {t('mobile.modSecurityDesc')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
