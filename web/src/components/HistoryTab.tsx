'use client';

import React, { useState } from 'react';
import { Search, Download, Filter, Calendar, Activity, AlertCircle } from 'lucide-react';
import { MeasurementRecord } from '../types/sensor';

interface HistoryTabProps {
  records: MeasurementRecord[];
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ records }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivity, setFilterActivity] = useState('ALL');

  const filtered = records.filter((r) => {
    const matchesSearch = r.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.recorded_at.includes(searchTerm);
    const matchesActivity = filterActivity === 'ALL' || r.dominant_activity === filterActivity;
    return matchesSearch && matchesActivity;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Device ID', 'Thời gian', 'Nhịp tim (BPM)', 'SpO2 (%)', 'Gia tốc tổng (m/s2)', 'Hoạt động'];
    const rows = filtered.map((r) => [
      r.id,
      r.device_id,
      r.recorded_at,
      r.heart_rate,
      r.spo2,
      r.accel_magnitude,
      r.dominant_activity,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `prowatch_measurements_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Controls */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Lịch sử đo & dữ liệu cảm biến
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
            Truy vấn và lưu trữ toàn bộ lịch sử đo từ Supabase Database PostgreSQL
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid var(--border-color)',
            color: '#fff',
            borderRadius: '8px',
            padding: '0.6rem 1.2rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background 0.2s ease'
          }}
        >
          <Download size={16} /> Xuất CSV
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{
          flex: 1,
          minWidth: '240px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.6rem 1rem'
        }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Tìm theo Device ID hoặc thời gian..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              outline: 'none',
              width: '100%',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="var(--text-muted)" />
          <select
            value={filterActivity}
            onChange={(e) => setFilterActivity(e.target.value)}
            style={{
              background: '#131b2e',
              border: '1px solid var(--border-color)',
              color: '#fff',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Tất cả hoạt động</option>
            <option value="Đang ngồi">Đang ngồi</option>
            <option value="Đang đi bộ">Đang đi bộ</option>
            <option value="Đang chạy bộ">Đang chạy bộ</option>
            <option value="Đang nằm nghỉ">Đang nằm nghỉ</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Bản ghi</th>
                <th style={{ padding: '0.85rem 1rem' }}>Device ID</th>
                <th style={{ padding: '0.85rem 1rem' }}>Thời điểm</th>
                <th style={{ padding: '0.85rem 1rem' }}>Nhịp tim (BPM)</th>
                <th style={{ padding: '0.85rem 1rem' }}>SpO₂ (%)</th>
                <th style={{ padding: '0.85rem 1rem' }}>Gia tốc MPU6050</th>
                <th style={{ padding: '0.85rem 1rem' }}>Hoạt động ghi nhận</th>
                <th style={{ padding: '0.85rem 1rem' }}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '0.85rem 1rem' }}><code>{r.id}</code></td>
                  <td style={{ padding: '0.85rem 1rem' }}>{r.device_id}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>{r.recorded_at}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#ef4444' }}>
                    {r.heart_rate} BPM
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#06b6d4' }}>
                    {r.spo2}%
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {r.accel_magnitude} m/s²
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#a5b4fc',
                      fontWeight: 600
                    }}>
                      {r.dominant_activity}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                    {r.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
