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

export const MobileTab: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCenterOnly, setIsCenterOnly] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [scale, setScale] = useState<number>(0.82); // Tỷ lệ mặc định vừa vặn màn hình

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
        backgroundColor: isFullscreen ? '#07090e' : 'transparent',
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
        backgroundColor: isFullscreen ? 'rgba(15, 23, 42, 0.9)' : 'var(--card-bg)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: isFullscreen ? '0 10px 30px rgba(0,0,0,0.6)' : '0 4px 20px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(16px)',
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
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 0 16px rgba(14, 165, 233, 0.4)'
          }}>
            <Smartphone size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Trình giả lập ProWatch Mobile App
              <span style={{
                fontSize: '0.72rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '20px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontWeight: 600
              }}>
                Expo Web Live
              </span>
              {isFullscreen && (
                <span style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  fontWeight: 600
                }}>
                  🖥️ Toàn màn hình (F11)
                </span>
              )}
            </h2>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Trải nghiệm và tương tác trực tiếp ứng dụng ProWatch Health trên khung điện thoại mô phỏng
            </p>
          </div>
        </div>

        {/* Action Controls & Zoom Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Zoom & Fit Controller */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            padding: '2px',
            gap: '2px'
          }}>
            <button
              onClick={handleZoomOut}
              title="Thu nhỏ tỉ lệ"
              style={{
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                cursor: 'pointer',
                borderRadius: '6px'
              }}
            >
              <ZoomOut size={15} />
            </button>

            <button
              onClick={handleAutoFit}
              title="Đặt tỷ lệ tự động vừa màn hình"
              style={{
                padding: '0 0.5rem',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#a5b4fc',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: '6px'
              }}
            >
              <Sparkles size={12} />
              <span>{Math.round(scale * 100)}% (Vừa màn hình)</span>
            </button>

            <button
              onClick={() => setScale(1.0)}
              title="Đặt tỉ lệ gốc 100%"
              style={{
                padding: '0 0.4rem',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: scale === 1.0 ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                borderRadius: '6px'
              }}
            >
              100%
            </button>

            <button
              onClick={handleZoomIn}
              title="Phóng to tỉ lệ"
              style={{
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
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
              title={isCenterOnly ? "Hiển thị kèm thông tin" : "Chỉ tập trung điện thoại (căn giữa)"}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: isCenterOnly ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: isCenterOnly ? '#818cf8' : 'var(--text-main)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {isCenterOnly ? <AlignJustify size={14} /> : <AlignCenter size={14} />}
              <span>{isCenterOnly ? "Hiện bảng tin" : "Căn giữa"}</span>
            </button>
          )}

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            title="Tải lại ứng dụng"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <RotateCcw size={14} />
            <span>Tải lại</span>
          </button>

          {/* TRUE FULLSCREEN TOGGLE (F11 equivalent) */}
          <button
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Thoát toàn màn hình (Esc hoặc F11)" : "Mở rộng toàn màn hình (như F11)"}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: isFullscreen ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.25)',
              border: isFullscreen ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
              color: isFullscreen ? '#fca5a5' : '#c7d2fe',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isFullscreen ? '0 0 12px rgba(239, 68, 68, 0.3)' : '0 0 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình (F11)"}</span>
          </button>

          {/* Open in separate tab */}
          <a
            href="http://localhost:8085"
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
              boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)'
            }}
          >
            <ExternalLink size={14} />
            <span>Tab riêng</span>
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
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95), 0 0 0 4px #262c3e, 0 0 0 7px #161922',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'transform 0.2s ease'
            }}>
              {/* Dynamic Island / Speaker */}
              <div style={{
                position: 'absolute',
                top: '18px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '115px',
                height: '28px',
                backgroundColor: '#000',
                borderRadius: '20px',
                zIndex: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 10px',
                boxShadow: '0 0 6px rgba(0,0,0,0.8)'
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#131b2c',
                  border: '1px solid #1e293b'
                }} />
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#059669',
                  boxShadow: '0 0 6px #10b981'
                }} />
              </div>

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
                      Đang khởi chạy ProWatch Health...
                    </p>
                    {loadTimeout && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
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
                          🔄 Thử lại
                        </button>
                        <a
                          href="http://localhost:8085"
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
                          Mở cổng 8085 ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Embedded Expo Web App with Full Bluetooth and Fullscreen permissions */}
                <iframe
                  key={iframeKey}
                  ref={iframeRef}
                  src="http://localhost:8085"
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
              backgroundColor: 'var(--card-bg)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 600 }}>
                <Zap size={18} color="#0ea5e9" />
                <span>Trạng thái kết nối & Vận hành</span>
              </div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>
                Ứng dụng di động đang chạy trực tiếp từ mã nguồn React Native (Expo Web) tại cổng <strong>8085</strong>. 
                Bạn có thể tương tác đầy đủ như trên điện thoại thật: chuyển đổi các tab, xem chỉ số sinh tồn và trạng thái thiết bị.
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
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cổng phục vụ</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#38bdf8', marginTop: '0.15rem' }}>
                    :8085
                  </div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Framework</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#a78bfa', marginTop: '0.15rem' }}>
                    Expo 57 / RN 0.86
                  </div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cơ sở dữ liệu</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#34d399', marginTop: '0.15rem' }}>
                    Supabase PostgreSQL
                  </div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mô hình AI</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fbbf24', marginTop: '0.15rem' }}>
                    HAR 1D-CNN
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Modules */}
            <div style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--card-bg)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 600 }}>
                <CheckCircle2 size={17} color="#10b981" />
                <span>Các phân hệ tính năng trên Mobile App</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{ color: '#10b981', fontSize: '0.8rem' }}>•</span>
                  <div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Tổng quan sinh tồn:</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                      Hiển thị Nhịp tim (BPM) và Oxy trong máu (SpO2) từ cảm biến quang học MAX30102.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{ color: '#10b981', fontSize: '0.8rem' }}>•</span>
                  <div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Hoạt động & Giấc ngủ:</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                      Theo dõi bước chân tích lũy, calo tiêu hao và chu kỳ ngủ.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{ color: '#10b981', fontSize: '0.8rem' }}>•</span>
                  <div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Nhận diện vận động AI:</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                      Phân loại hành vi thời gian thực từ cảm biến gia tốc MPU6050.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{ color: '#10b981', fontSize: '0.8rem' }}>•</span>
                  <div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Bảo mật & Cài đặt:</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                      Xác thực đa yếu tố (MFA), cài đặt ngưỡng cảnh báo nhịp tim bất thường.
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
