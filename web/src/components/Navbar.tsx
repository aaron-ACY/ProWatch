'use client';

import React from 'react';
import { Watch, Activity, History, GitBranch, Cpu, Smartphone, FileSpreadsheet } from 'lucide-react';

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
  const tabs = [
    { key: 'REALTIME' as ActiveTab, label: 'Giám sát Real-time', icon: <Activity size={16} /> },
    { key: 'DATA' as ActiveTab, label: 'Data Sheet (PPG)', icon: <FileSpreadsheet size={16} /> },
    { key: 'HISTORY' as ActiveTab, label: 'Lịch sử đo', icon: <History size={16} /> },
    { key: 'PIPELINE' as ActiveTab, label: 'Tự động hóa n8n', icon: <GitBranch size={16} /> },
    { key: 'MODELS' as ActiveTab, label: 'Đánh giá AI & Metrics', icon: <Cpu size={16} /> },
    { key: 'MOBILE' as ActiveTab, label: 'Run Mobile', icon: <Smartphone size={16} /> },
  ];

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 2rem',
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      {/* Brand logo & title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
        }}>
          <Watch size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            ProWatch <span style={{ color: 'var(--accent-cyan)' }}>AI Studio</span>
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
            XIAO ESP32-S3 • MAX30102 • MPU6050 • n8n • Supabase
          </p>
        </div>
      </div>

      {/* Tabs navigation */}
      <nav style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.25rem', borderRadius: '10px' }}>
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
                padding: '0.5rem 0.9rem',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                background: isActive ? 'linear-gradient(135deg, #6366f1, #06b6d4)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 2px 10px rgba(99, 102, 241, 0.3)' : 'none'
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
