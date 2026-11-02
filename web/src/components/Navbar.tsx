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
            <div className="inline-flex items-center bg-zinc-100/90 border border-zinc-200/90 rounded-full p-[2.5px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] select-none">
              <button
                type="button"
                onClick={() => setLanguage('vi')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all duration-200 cursor-pointer ${
                  language === 'vi'
                    ? 'bg-white text-zinc-900 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.06)]'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
                title="Tiếng Việt (Vietnamese)"
              >
                <FlagVN className="w-4 h-2.5" />
                <span className="font-sans font-medium text-[11.5px] leading-none">VN</span>
              </button>

              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all duration-200 cursor-pointer ${
                  language === 'en'
                    ? 'bg-white text-zinc-900 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.06)]'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
                title="English"
              >
                <FlagEN className="w-4 h-2.5" />
                <span className="font-sans font-medium text-[11.5px] leading-none">EN</span>
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
