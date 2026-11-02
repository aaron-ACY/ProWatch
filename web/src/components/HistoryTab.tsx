'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  Search,
  Download,
  Filter,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Activity
} from 'lucide-react';
import { MeasurementRecord } from '../types/sensor';

interface HistoryTabProps {
  records?: MeasurementRecord[];
}

const SUPABASE_URL = 'https://hyyrkyuarclrpwlpssvc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dh3CRgbceJNQw7sC95adzQ_MfV3MOFk';

export const HistoryTab: React.FC<HistoryTabProps> = ({ records: propRecords }) => {
  const { t, language } = useLanguage();
  const [records, setRecords] = useState<MeasurementRecord[]>(propRecords || []);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Lấy toàn bộ dữ liệu trực tiếp từ Supabase Cloud (bảng health_records)
  const fetchSupabaseData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/health_records?select=*&order=recorded_at.desc&limit=100`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const rows: any[] = await res.json();

      if (Array.isArray(rows) && rows.length > 0) {
        const mappedRecords: MeasurementRecord[] = rows.map((r) => {
          const hr = r.heart_rate || (r.spo2 ? 75 : 80);
          const spo2 = r.spo2 || 98;
          const accelMag = 9.81;

          // Đánh giá trạng thái lâm sàng / thiết bị
          let statusLabel = 'Bình thường';
          if (r.risk_level) {
            statusLabel = r.risk_level;
          } else if (hr >= 120) {
            statusLabel = 'Nhịp nhanh';
          } else if (hr < 55) {
            statusLabel = 'Nhịp chậm';
          } else if (spo2 < 95) {
            statusLabel = 'SpO2 thấp';
          }

          // Định dạng thời gian
          let formattedTime = r.recorded_at;
          try {
            const d = new Date(r.recorded_at);
            if (!isNaN(d.getTime())) {
              formattedTime = `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN')}`;
            }
          } catch { }

          return {
            id: `rec-${r.id}`,
            device_id: r.device_id || 'XIAO-ESP32S3-PROWATCH-01',
            recorded_at: formattedTime,
            heart_rate: hr,
            spo2: spo2,
            accel_magnitude: accelMag,
            is_anomaly: hr >= 120 || spo2 < 95,
            status: statusLabel,
            risk_level: r.risk_level || statusLabel
          };
        });

        setRecords(mappedRecords);
        setLastSyncedTime(new Date().toLocaleTimeString('vi-VN'));
      }
    } catch (err) {
      console.warn('Lỗi khi nạp dữ liệu từ Supabase Cloud, sử dụng dữ liệu dự phòng:', err);
      if (propRecords && propRecords.length > 0) {
        setRecords(propRecords);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSupabaseData();
  }, []);

  // Lọc tìm kiếm và trạng thái
  const filtered = records.filter((r) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      r.id.toLowerCase().includes(term) ||
      r.device_id.toLowerCase().includes(term) ||
      r.recorded_at.toLowerCase().includes(term);

    const recordStatus = r.status || (r.heart_rate >= 120 ? 'Cảnh báo' : 'Bình thường');
    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'NORMAL' && (recordStatus === 'Bình thường' || recordStatus === 'Ổn định')) ||
      (filterStatus === 'WARNING' && (recordStatus === 'Cảnh báo' || recordStatus === 'Nhịp nhanh' || recordStatus === 'SpO2 thấp' || recordStatus === 'Nhịp chậm'));

    return matchesSearch && matchesStatus;
  });

  // Xuất file CSV
  const handleExportCSV = () => {
    const headers = ['Bản ghi', 'Device ID', 'Thời điểm', 'Nhịp tim (BPM)', 'SpO2 (%)', 'Gia tốc MPU6050 (m/s2)', 'Trạng thái'];
    const rows = filtered.map((r) => [
      r.id,
      r.device_id,
      r.recorded_at,
      r.heart_rate,
      r.spo2,
      r.accel_magnitude,
      r.status || (r.heart_rate >= 120 ? 'Cảnh báo' : 'Bình thường')
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `prowatch_supabase_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatStatusLabel = (st: string) => {
    if (language === 'vi') return st;
    const map: Record<string, string> = {
      'Bình thường': 'Normal',
      'Ổn định': 'Stable',
      'Cảnh báo': 'Warning',
      'Nhịp nhanh': 'Tachycardia',
      'Nhịp chậm': 'Bradycardia',
      'SpO2 thấp': 'Low SpO2',
      'Nguy hiểm': 'Critical',
    };
    return map[st] || st;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 select-none">

      {/* 1. HEADER */}
      <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
            {t('history.title')}
          </h1>

          <p className="text-xs text-zinc-500 flex items-center gap-2 flex-wrap">
            <span>{t('history.subtitle')}</span>
            {lastSyncedTime && (
              <>
                <span className="text-zinc-300">•</span>
                <span className="flex items-center gap-1 text-zinc-500">
                  <Clock size={11} className="text-zinc-400" />
                  <span>{t('history.synced')}: <strong className="font-mono text-zinc-700">{lastSyncedTime}</strong></span>
                </span>
              </>
            )}
            <span className="text-zinc-300">•</span>
            <span>{t('history.total')}: <strong className="font-mono text-zinc-800">{records.length}</strong> {t('history.records')}</span>
          </p>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={fetchSupabaseData}
            disabled={isLoading}
            className="h-8 px-3 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 shadow-2xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60"
            title={language === 'vi' ? 'Tải lại dữ liệu mới nhất từ Supabase' : 'Reload latest data from Supabase'}
          >
            <RefreshCw size={13} className={`text-zinc-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? t('history.loading') : t('history.refresh')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="h-8 px-3 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 shadow-2xs flex items-center gap-1.5 transition-all active:scale-95"
            title={language === 'vi' ? 'Xuất tập tin CSV lịch sử đo' : 'Export measurement history to CSV'}
          >
            <Download size={13} className="text-zinc-500" />
            <span>{t('history.export')}</span>
          </button>
        </div>
      </div>

      {/* 2. THANH TÌM KIẾM & BỘ LỌC TRẠNG THÁI */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('history.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-zinc-300 text-zinc-900 text-xs rounded-md pl-9 pr-3 py-2 shadow-2xs hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-700/20 focus:border-cyan-700 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-white border border-zinc-300 text-zinc-800 text-xs font-medium rounded-md py-2 pl-8 pr-8 shadow-2xs hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-700/20 focus:border-cyan-700 cursor-pointer transition-colors"
            >
              <option value="ALL">{t('history.filterAll')}</option>
              <option value="NORMAL">{t('history.statusNormal')}</option>
              <option value="WARNING">{t('history.statusWarning')}</option>
            </select>
            <Filter size={13} className="text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. BẢNG DỮ LIỆU LỊCH SỬ ĐO */}
      <div className="bg-white border border-zinc-200 rounded-md shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-medium">
                <th className="py-2.5 px-3.5 whitespace-nowrap">{t('history.thRecord')}</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">{t('history.thDevice')}</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">{t('history.thTime')}</th>
                <th className="py-2.5 px-3.5 text-center whitespace-nowrap">{t('history.thHeartRate')}</th>
                <th className="py-2.5 px-3.5 text-center whitespace-nowrap">{t('history.thSpo2')}</th>
                <th className="py-2.5 px-3.5 text-center whitespace-nowrap">{t('history.thAccel')}</th>
                <th className="py-2.5 px-3.5 text-center whitespace-nowrap">{t('history.thStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-zinc-500">
                    {isLoading ? (language === 'vi' ? 'Đang truy vấn dữ liệu từ Supabase Cloud...' : 'Querying data from Supabase Cloud...') : (language === 'vi' ? 'Không tìm thấy bản ghi phù hợp với bộ lọc.' : 'No records found matching filters.')}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const hr = r.heart_rate;
                  const spo2 = r.spo2;
                  const status = r.status || (hr >= 120 ? 'Cảnh báo' : 'Bình thường');
                  const isNormal = status === 'Bình thường' || status === 'Ổn định';
                  const isWarning = status === 'Cảnh báo' || status === 'Nhịp nhanh' || status === 'SpO2 thấp' || status === 'Nhịp chậm';

                  return (
                    <tr key={r.id} className="hover:bg-zinc-50/70 transition-colors">
                      {/* 1. Bản ghi ID */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <code className="font-mono text-zinc-700 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-[11px]">
                          {r.id}
                        </code>
                      </td>

                      {/* 2. Device ID */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-mono text-zinc-800 font-medium text-xs">
                        {r.device_id}
                      </td>

                      {/* 3. Thời điểm */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-mono text-zinc-600 text-xs">
                        {r.recorded_at}
                      </td>

                      {/* 4. Nhịp tim (BPM) */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap font-mono text-xs">
                        {hr ? (
                          <span className={`font-semibold ${hr >= 120 ? 'text-rose-600 font-bold' : hr < 60 ? 'text-amber-700' : 'text-zinc-900'}`}>
                            {hr} BPM
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>

                      {/* 5. SpO2 (%) */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap font-mono text-xs">
                        {spo2 ? (
                          <span className={`font-semibold ${spo2 < 95 ? 'text-amber-700 font-bold' : 'text-cyan-700'}`}>
                            {spo2}%
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>

                      {/* 6. Gia tốc MPU6050 */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap font-mono text-zinc-700 text-xs">
                        {r.accel_magnitude ? `${r.accel_magnitude.toFixed(2)} m/s²` : '9.81 m/s²'}
                      </td>

                      {/* 7. Trạng thái (Thay thế cột Hoạt động & Ghi chú) */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        {isNormal ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border"
                            style={{
                              backgroundColor: 'rgba(35, 191, 92, 0.08)',
                              borderColor: 'rgba(35, 191, 92, 0.35)',
                              color: '#23BF5C'
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#23BF5C' }} />
                            <span>{language === 'vi' ? 'Bình thường' : 'Normal'}</span>
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>{formatStatusLabel(status)}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            <span>{formatStatusLabel(status)}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
