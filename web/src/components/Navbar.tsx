'use client';

import React from 'react';
import { Watch, History, GitBranch, Cpu, Smartphone, FileSpreadsheet } from 'lucide-react';
import { useLanguage, FlagVN, FlagEN } from '@/context/LanguageContext';

export type ActiveTab = 'REALTIME' | 'HISTORY' | 'PIPELINE' | 'MODELS' | 'MOBILE' | 'DATA';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  deviceId?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { language, setLanguage, t } = useLanguage();

  const tabs = [
    { key: 'REALTIME' as ActiveTab, label: t('nav.prototype'), icon: <Watch size={16} /> },
    { key: 'DATA' as ActiveTab, label: t('nav.datasheet'), icon: <FileSpreadsheet size={16} /> },
    { key: 'HISTORY' as ActiveTab, label: t('nav.history'), icon: <History size={16} /> },
    { key: 'PIPELINE' as ActiveTab, label: t('nav.pipeline'), icon: <GitBranch size={16} /> },
    { key: 'MODELS' as ActiveTab, label: t('nav.models'), icon: <Cpu size={16} /> },
    { key: 'MOBILE' as ActiveTab, label: t('nav.mobile'), icon: <Smartphone size={16} /> },
  ];

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 2rem',
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      flexWrap: 'wrap',
      gap: '1rem',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
    }}>
      {/* Brand logo & title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: '#4f46e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
        }}>
          <Watch size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
              ProWatch <span style={{ color: 'var(--accent-cyan)' }}>AI Studio</span>
            </h1>

            {/* Language Switcher [VN] [EN] - Apple / Linear Style Segmented Control */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '9999px',
              padding: '2.5px',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
              userSelect: 'none'
            }}>
              <button
                type="button"
                onClick={() => setLanguage('vi')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  fontSize: '11.5px',
                  fontWeight: language === 'vi' ? 700 : 500,
                  backgroundColor: language === 'vi' ? '#ffffff' : 'transparent',
                  color: language === 'vi' ? '#0f172a' : '#64748b',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: language === 'vi' ? '0 1px 3px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title="Tiếng Việt (Vietnamese)"
              >
                <FlagVN className="w-3.5 h-2.5" />
                <span>VN</span>
              </button>

              <button
                type="button"
                onClick={() => setLanguage('en')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  fontSize: '11.5px',
                  fontWeight: language === 'en' ? 700 : 500,
                  backgroundColor: language === 'en' ? '#ffffff' : 'transparent',
                  color: language === 'en' ? '#0f172a' : '#64748b',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: language === 'en' ? '0 1px 3px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title="English"
              >
                <FlagEN className="w-3.5 h-2.5" />
                <span>EN</span>
              </button>
            </div>
          </div>

          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
            XIAO ESP32-S3 • MAX30102 • MPU6050 • n8n • Supabase
          </p>
        </div>
      </div>

      {/* Tabs navigation */}
      <nav style={{ display: 'flex', gap: '0.35rem', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '0.25rem', borderRadius: '10px' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                border: isActive ? '1px solid #e2e8f0' : '1px solid transparent',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#0f172a' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
