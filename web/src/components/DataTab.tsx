'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  FolderOpen,
  Copy,
  Check,
  Download,
  Database,
  Waves,
  User,
  Search,
  Activity,
  Heart,
  Compass,
  Zap,
  Thermometer,
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useLanguage } from '@/context/LanguageContext';

interface ColumnDef {
  key: string;
  label: string;
  excelCol: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

interface SubjectQuest {
  subjectId: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  skin: number;
  sport: number;
}

export const DataTab: React.FC = () => {
  const { t, language } = useLanguage();
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('CLEAN_HEALTH');
  const [dataCategory, setDataCategory] = useState<'PROCESSED' | 'RAW'>('PROCESSED');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

  // Trạng thái dữ liệu tải từ API
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [datasetDir, setDatasetDir] = useState<string>('riskscore/data');
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    totalRows: number;
    totalPages: number;
  }>({
    page: 1,
    limit: 100,
    totalRows: 0,
    totalPages: 1
  });
  const [summaryStats, setSummaryStats] = useState<any>(null);
  const [quest, setQuest] = useState<SubjectQuest | null>(null);
  const [chartPreview, setChartPreview] = useState<any[]>([]);
  const [, setDemographics] = useState<SubjectQuest[]>([]);

  // Tương tác ô tính Excel (Active Cell)
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    colKey: string;
    excelCoord: string;
    value: any;
  } | null>(null);
  const [copiedCell, setCopiedCell] = useState<boolean>(false);
  const [copiedTable, setCopiedTable] = useState<boolean>(false);

  const getColumnDisplayName = (key: string, defaultLabel: string) => {
    if (language === 'vi') return defaultLabel;
    const enMap: Record<string, string> = {
      heart_rate: 'Heart Rate (BPM)',
      spo2: 'SpO2 (%)',
      bmi: 'BMI (kg/m²)',
      weight: 'Weight (kg)',
      height: 'Height (cm)',
      temp: 'Temperature (°C)',
      risk_level: 'Risk Level',
      subject: 'Subject',
      time_sec: 'Time (s)',
      activity_label: 'Activity Code',
      qc_flag: 'QC Flag',
      hr_pts: 'HR Pts (NEWS2)',
      spo2_pts: 'SpO2 Pts (NEWS2)',
      temp_pts: 'Temp Pts (NEWS2)',
      vital_score: 'Vital Score',
      vital_level: 'Vital Level',
      bmi_category: 'BMI Category',
      bmi_level: 'BMI Level',
      label_driver: 'Primary Driver',
      bvp: 'BVP (PPG Amplitude)',
      eda: 'EDA (Galvanic μS)',
      acc_x: 'Accel X (g)',
      acc_y: 'Accel Y (g)',
      acc_z: 'Accel Z (g)',
      ibi: 'IBI (ms)',
      sport: 'Fitness Level',
      skin: 'Skin Type (Fitzpatrick)',
      age: 'Age (years)',
      gender: 'Gender',
      subjectId: 'Subject ID'
    };
    return enMap[key] || defaultLabel;
  };

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Cuộn ngang thanh tabs bằng con lăn chuột và chặn cuộn dọc trang
  useEffect(() => {
    const tabsEl = tabsContainerRef.current;
    if (!tabsEl) return;

    const handleTabsWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaY) > 0 ? e.deltaY : e.deltaX;
      if (delta !== 0) {
        if (tabsEl.scrollWidth > tabsEl.clientWidth) {
          e.preventDefault();
          tabsEl.scrollLeft += delta * 1.5;
        }
      }
    };

    tabsEl.addEventListener('wheel', handleTabsWheel, { passive: false });
    return () => {
      tabsEl.removeEventListener('wheel', handleTabsWheel);
    };
  }, [dataCategory]);

  // Cuộn ngang bằng con lăn chuột khi di chuột vào thanh bottom bar
  useEffect(() => {
    const bottomEl = bottomBarRef.current;
    if (!bottomEl) return;

    const handleBottomWheel = (e: WheelEvent) => {
      const tableEl = tableContainerRef.current;
      if (!tableEl) return;

      const delta = Math.abs(e.deltaY) > 0 ? e.deltaY : e.deltaX;
      if (delta !== 0) {
        e.preventDefault();
        tableEl.scrollLeft += delta * 1.5;
      }
    };

    bottomEl.addEventListener('wheel', handleBottomWheel, { passive: false });
    return () => {
      bottomEl.removeEventListener('wheel', handleBottomWheel);
    };
  }, []);

  // Cuộn ngang bằng con lăn chuột khi di chuột vào vùng gần thanh cuộn đáy hoặc giữ Shift trên bảng
  useEffect(() => {
    const tableEl = tableContainerRef.current;
    if (!tableEl) return;

    const handleTableWheel = (e: WheelEvent) => {
      const rect = tableEl.getBoundingClientRect();
      const isNearBottomScrollbar = e.clientY >= rect.bottom - 48;

      if (isNearBottomScrollbar || e.shiftKey) {
        if (Math.abs(e.deltaY) > 0) {
          e.preventDefault();
          tableEl.scrollLeft += e.deltaY * 1.5;
        }
      }
    };

    tableEl.addEventListener('wheel', handleTableWheel, { passive: false });
    return () => {
      tableEl.removeEventListener('wheel', handleTableWheel);
    };
  }, [loading, rows]);

  // Nút bấm cuộn ngang nhanh sang trái hoặc phải trên bảng
  const handleScrollHorizontal = (direction: 'left' | 'right') => {
    if (tableContainerRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      tableContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Cuộn ngang thanh tabs bằng nút điều hướng
  const handleTabScroll = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      tabsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Phân biệt kênh dữ liệu đã xử lý và dữ liệu thô
  const isProcessedChannel = (ch: string) => ch === 'CLEAN_HEALTH' || ch === 'CLEAN_HEALTH_DETAILED';
  const isRawChannel = (ch: string) => !isProcessedChannel(ch);

  // Danh mục 1: Dữ liệu đã xử lý (Processed Health Data)
  const processedChannels = [
    {
      key: 'CLEAN_HEALTH',
      label: 'clean_health_dataset.csv (AI Train)',
      badge: language === 'vi' ? '6 đặc trưng' : '6 features',
      icon: <Database size={14} />,
      desc: language === 'vi' ? 'Tập dữ liệu sạch huấn luyện AI (6 đặc trưng chuẩn hóa + risk_level)' : 'Clean dataset for AI training (6 normalized features + risk_level)'
    },
    {
      key: 'CLEAN_HEALTH_DETAILED',
      label: language === 'vi' ? 'clean_health_detailed.csv (19 cột)' : 'clean_health_detailed.csv (19 cols)',
      badge: language === 'vi' ? '19 cột đầy đủ' : 'Full 19 cols',
      icon: <FileSpreadsheet size={14} />,
      desc: language === 'vi' ? 'Tập dữ liệu chi tiết đầy đủ 19 trường (NEWS2, BMI, vital_score, label_driver)' : 'Detailed dataset with 19 fields (NEWS2, BMI, vital_score, label_driver)'
    }
  ];

  // Danh mục 2: Dữ liệu thô - Chưa xử lý (Raw Sensor Signals & Ground Truth)
  const rawChannels = [
    { key: 'BVP', label: 'BVP.csv (PPG 64Hz)', badge: '64 Hz', icon: <Activity size={14} />, desc: language === 'vi' ? 'Biên độ sóng quang học PPG 64Hz' : 'PPG optical pulse amplitude 64Hz' },
    { key: 'HR', label: language === 'vi' ? 'HR.csv (Nhịp tim 1Hz)' : 'HR.csv (Heart Rate 1Hz)', badge: '1 Hz', icon: <Heart size={14} />, desc: language === 'vi' ? 'Nhịp tim theo thời gian 1Hz' : 'Heart rate time series 1Hz' },
    { key: 'ACC', label: language === 'vi' ? 'ACC.csv (Gia tốc 32Hz)' : 'ACC.csv (Accel 32Hz)', badge: '32 Hz', icon: <Compass size={14} />, desc: language === 'vi' ? 'Cảm biến gia tốc 3 trục X, Y, Z 32Hz' : '3-axis accelerometer X, Y, Z 32Hz' },
    { key: 'EDA', label: language === 'vi' ? 'EDA.csv (Điện trở da 4Hz)' : 'EDA.csv (Galvanic 4Hz)', badge: '4 Hz', icon: <Zap size={14} />, desc: language === 'vi' ? 'Điện trở dẫn truyền da Galvanic 4Hz' : 'Galvanic skin resistance 4Hz' },
    { key: 'TEMP', label: language === 'vi' ? 'TEMP.csv (Nhiệt độ 4Hz)' : 'TEMP.csv (Temp 4Hz)', badge: '4 Hz', icon: <Thermometer size={14} />, desc: language === 'vi' ? 'Nhiệt độ da cơ thể 4Hz' : 'Body skin temperature 4Hz' },
    { key: 'ACTIVITIES', label: language === 'vi' ? 'Hoạt động (Ground Truth)' : 'Activities (Ground Truth)', badge: language === 'vi' ? 'Nhãn hoạt động' : 'Activity labels', icon: <Tag size={14} />, desc: language === 'vi' ? 'Các giai đoạn hoạt động lâm sàng' : 'Clinical activity phases' },
    { key: 'DEMOGRAPHICS', label: language === 'vi' ? 'Nhân khẩu học (15 đối tượng)' : 'Demographics (15 subjects)', badge: language === 'vi' ? '15 đối tượng' : '15 subjects', icon: <User size={14} />, desc: language === 'vi' ? 'Thông tin nhân khẩu học 15 đối tượng nghiên cứu' : 'Demographics of 15 study subjects' }
  ];

  const activeCategoryTabs = dataCategory === 'PROCESSED' ? processedChannels : rawChannels;

  const subjectsList = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => `S${i + 1}`);
  }, []);

  // Gọi API tải dữ liệu sheet
  const fetchSheetData = async (
    subj: string,
    chan: string,
    page: number,
    limit: number,
    search: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/dataset?subject=${subj}&channel=${chan}&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (language === 'vi' ? 'Không thể tải dữ liệu sheet' : 'Failed to load sheet data'));
      }

      setDatasetDir(data.datasetDir || 'riskscore/data');
      if (chan === 'DEMOGRAPHICS') {
        setDemographics(data.demographics || []);
        setColumns([
          { key: 'rowNum', label: '#', excelCol: 'A', width: 60, align: 'center' },
          { key: 'subjectId', label: language === 'vi' ? 'Đối tượng (Subject ID)' : 'Subject ID', excelCol: 'B', width: 160, align: 'center' },
          { key: 'gender', label: language === 'vi' ? 'Giới tính' : 'Gender', excelCol: 'C', width: 110, align: 'center' },
          { key: 'age', label: language === 'vi' ? 'Tuổi (năm)' : 'Age (years)', excelCol: 'D', width: 110, align: 'right' },
          { key: 'height', label: language === 'vi' ? 'Chiều cao (cm)' : 'Height (cm)', excelCol: 'E', width: 130, align: 'right' },
          { key: 'weight', label: language === 'vi' ? 'Cân nặng (kg)' : 'Weight (kg)', excelCol: 'F', width: 130, align: 'right' },
          { key: 'bmi', label: language === 'vi' ? 'Chỉ số BMI (kg/m²)' : 'BMI (kg/m²)', excelCol: 'G', width: 140, align: 'right' },
          { key: 'skin', label: language === 'vi' ? 'Phân loại da (Fitzpatrick)' : 'Skin Type (Fitzpatrick)', excelCol: 'H', width: 200, align: 'center' },
          { key: 'sport', label: language === 'vi' ? 'Mức độ thể thao (1-6)' : 'Fitness Level (1-6)', excelCol: 'I', width: 160, align: 'right' }
        ]);
        const demoRows = (data.demographics || []).map((d: SubjectQuest, idx: number) => {
          const bmi = d.height > 0 ? (d.weight / Math.pow(d.height / 100, 2)).toFixed(1) : '-';
          return {
            id: idx + 1,
            rowNum: idx + 1,
            subjectId: d.subjectId,
            gender: d.gender,
            age: d.age,
            height: d.height,
            weight: d.weight,
            bmi,
            skin: language === 'vi' ? `Fitzpatrick nhóm ${d.skin}` : `Fitzpatrick Type ${d.skin}`,
            sport: `${d.sport} / 6`
          };
        });
        setRows(demoRows);
        setPagination({
          page: 1,
          limit: demoRows.length,
          totalRows: demoRows.length,
          totalPages: 1
        });
        const unitAge = language === 'vi' ? ' tuổi' : ' yrs';
        setSummaryStats({
          totalSamples: demoRows.length,
          mean: (demoRows.reduce((acc: number, r: any) => acc + (Number(r.age) || 0), 0) / demoRows.length).toFixed(1) + unitAge,
          min: `${Math.min(...demoRows.map((r: any) => Number(r.age) || 0))}${unitAge}`,
          max: `${Math.max(...demoRows.map((r: any) => Number(r.age) || 0))}${unitAge}`
        });
        setChartPreview([]);
      } else {
        setColumns(data.columns || []);
        setRows(data.rows || []);
        setPagination(data.pagination || { page: 1, limit, totalRows: 0, totalPages: 1 });
        setSummaryStats(data.summaryStats || null);
        setQuest(data.quest || null);
        setChartPreview(data.chartPreview || []);
      }

      setJumpPageInput(String(page));
      setSelectedCell({
        row: 1,
        colKey: data.columns?.[0]?.key || 'rowNum',
        excelCoord: 'A1',
        value: 1
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi khi đọc file dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Đồng bộ dataCategory theo kênh được chọn
  useEffect(() => {
    if (isProcessedChannel(selectedChannel) && dataCategory !== 'PROCESSED') {
      setDataCategory('PROCESSED');
    } else if (isRawChannel(selectedChannel) && dataCategory !== 'RAW') {
      setDataCategory('RAW');
    }
  }, [selectedChannel, dataCategory]);

  useEffect(() => {
    if (isRawChannel(selectedChannel) && selectedChannel !== 'DEMOGRAPHICS' && selectedSubject === 'ALL') {
      setSelectedSubject('S1');
      return;
    }
    fetchSheetData(selectedSubject, selectedChannel, currentPage, pageSize, searchQuery);
  }, [selectedSubject, selectedChannel, currentPage, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSheetData(selectedSubject, selectedChannel, 1, pageSize, searchQuery);
  };

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = Number(jumpPageInput);
    if (!isNaN(p) && p >= 1 && p <= pagination.totalPages) {
      setCurrentPage(p);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  // Sao chép nội dung ô đang chọn
  const handleCopyCell = () => {
    if (selectedCell && selectedCell.value !== undefined) {
      navigator.clipboard.writeText(String(selectedCell.value));
      setCopiedCell(true);
      setTimeout(() => setCopiedCell(false), 2000);
    }
  };

  // Sao chép toàn bộ bảng tính hiện tại dạng TSV (dán trực tiếp vào Excel)
  const handleCopyTable = () => {
    if (rows.length === 0 || columns.length === 0) return;
    const headerRow = columns.map(c => c.label).join('\t');
    const dataRows = rows.map(r => columns.map(c => r[c.key] ?? '').join('\t')).join('\n');
    const tsvContent = `${headerRow}\n${dataRows}`;
    navigator.clipboard.writeText(tsvContent);
    setCopiedTable(true);
    setTimeout(() => setCopiedTable(false), 2000);
  };

  // Xuất file CSV
  const handleExportCSV = () => {
    if (rows.length === 0 || columns.length === 0) return;
    const headerRow = columns.map(c => `"${c.label}"`).join(',');
    const dataRows = rows.map(r => columns.map(c => `"${r[c.key] ?? ''}"`).join(',')).join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(`${headerRow}\n${dataRows}`);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `${selectedSubject}_${selectedChannel}_page${currentPage}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Màu nhãn hoạt động theo đúng chuẩn token trung tính hoặc ngữ nghĩa
  const getActivityBadgeClass = (actName: string) => {
    const act = (actName || '').toUpperCase();
    if (act.includes('NO_ACTIVITY')) return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    if (act.includes('SOCCER')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (act.includes('CYCLING')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (act.includes('WALKING')) return 'bg-cyan-50 text-cyan-800 border-cyan-200';
    if (act.includes('WORKING')) return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    if (act.includes('STAIRS')) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (act.includes('LUNCH') || act.includes('DRIVING')) return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    if (act.includes('BASELINE')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  };

  // Màu mức độ rủi ro (Risk Level / Vital Level) theo DESIGN.md Mục 2.4
  const getRiskBadgeClass = (levelStr: string) => {
    const level = String(levelStr || '').toUpperCase();
    if (level === 'HIGH') return 'bg-red-50 text-red-700 border-red-200';
    if (level === 'MEDIUM') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1440px] mx-auto text-zinc-900 font-sans">

      {/* 1. HEADER BAR: TIÊU ĐỀ DATASET & ĐƯỜNG DẪN THƯ MỤC */}
      <div className="bg-white border border-zinc-200 rounded p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-center text-cyan-700 flex-shrink-0">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">
                {language === 'vi' ? 'Tập dữ liệu' : 'Dataset'} <span className="text-cyan-700">PPG_FieldStudy</span>
              </h2>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-500">
              <FolderOpen size={13} className="text-zinc-400" />
              <span className="font-mono text-zinc-600">{datasetDir}</span>
            </div>
          </div>
        </div>

        {/* Nút thao tác nhanh trên Header: Secondary và Primary theo DESIGN.md Mục 6.4 */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyTable}
            className="h-9 px-3.5 rounded border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 text-sm font-medium transition-colors duration-150 flex items-center gap-1.5"
            title="Sao chép toàn bộ trang dữ liệu hiện tại (dán trực tiếp vào Excel hoặc Google Sheets)"
          >
            {copiedTable ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} className="text-zinc-600" />}
            <span>{copiedTable ? t('data.copied') : t('data.copySheet')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="h-9 px-3.5 rounded bg-cyan-700 text-white hover:bg-cyan-800 text-sm font-medium transition-colors duration-150 flex items-center gap-1.5"
            title="Tải về file CSV của bảng tính hiện tại"
          >
            <Download size={14} />
            <span>{t('data.exportCsv')}</span>
          </button>
        </div>
      </div>

      {/* 2. BỘ CHUYỂN ĐỔI PHÂN LOẠI DỮ LIỆU: DỮ LIỆU ĐÃ XỬ LÝ vs DỮ LIỆU THÔ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Nhóm 1: Dữ liệu đã xử lý */}
        <button
          type="button"
          onClick={() => {
            setDataCategory('PROCESSED');
            if (!isProcessedChannel(selectedChannel)) {
              setSelectedChannel('CLEAN_HEALTH');
              setCurrentPage(1);
              setSearchQuery('');
            }
          }}
          className={`flex items-start gap-3.5 p-3.5 rounded border text-left transition-colors duration-150 ${dataCategory === 'PROCESSED'
              ? 'bg-cyan-50/40 border-cyan-700 ring-1 ring-cyan-700'
              : 'bg-white border-zinc-200 hover:border-zinc-300'
            }`}
        >
          <div
            className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${dataCategory === 'PROCESSED'
                ? 'bg-cyan-100/70 border-cyan-700 text-cyan-800'
                : 'bg-zinc-100 border-zinc-200 text-zinc-500'
              }`}
          >
            <Database size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-zinc-900 leading-snug">
              {t('data.catProcessed')}
            </div>
            <div className="text-xs text-zinc-600 leading-relaxed mt-0.5">
              {t('data.catProcessedDesc')}
            </div>
          </div>
        </button>

        {/* Nhóm 2: Dữ liệu thô (Chưa xử lý) */}
        <button
          type="button"
          onClick={() => {
            setDataCategory('RAW');
            if (isProcessedChannel(selectedChannel)) {
              setSelectedChannel('BVP');
              if (selectedSubject === 'ALL') {
                setSelectedSubject('S1');
              }
              setCurrentPage(1);
              setSearchQuery('');
            }
          }}
          className={`flex items-start gap-3.5 p-3.5 rounded border text-left transition-colors duration-150 ${dataCategory === 'RAW'
              ? 'bg-cyan-50/40 border-cyan-700 ring-1 ring-cyan-700'
              : 'bg-white border-zinc-200 hover:border-zinc-300'
            }`}
        >
          <div
            className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${dataCategory === 'RAW'
                ? 'bg-cyan-100/70 border-cyan-700 text-cyan-800'
                : 'bg-zinc-100 border-zinc-200 text-zinc-500'
              }`}
          >
            <Waves size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-zinc-900 leading-snug">
              {t('data.catRaw')}
            </div>
            <div className="text-xs text-zinc-600 leading-relaxed mt-0.5">
              {t('data.catRawDesc')}
            </div>
          </div>
        </button>
      </div>

      {/* 3. THANH CHỌN SUBJECTS VỚI THÔNG TIN NHÂN KHẨU HỌC */}
      {selectedChannel !== 'CLEAN_HEALTH' && selectedChannel !== 'DEMOGRAPHICS' && (
        <div className="bg-white border border-zinc-200 rounded p-3 flex flex-wrap items-center justify-between gap-3">
          {selectedChannel === 'CLEAN_HEALTH_DETAILED' ? (
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[13px] font-medium text-zinc-600 whitespace-nowrap">
                {t('data.filterSubject')}
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                {['ALL', ...subjectsList].map((sId) => {
                  const isSelected = selectedSubject === sId;
                  return (
                    <button
                      key={sId}
                      type="button"
                      onClick={() => {
                        setSelectedSubject(sId);
                        setCurrentPage(1);
                      }}
                      className={`h-7 px-2.5 rounded text-xs font-medium transition-colors duration-150 ${isSelected
                          ? 'bg-cyan-700 text-white'
                          : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                    >
                      {sId === 'ALL' ? t('data.subjectAll') : sId}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[13px] font-medium text-zinc-600 whitespace-nowrap">
                {t('data.subject')}
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                {subjectsList.map((sId) => {
                  const isSelected = selectedSubject === sId;
                  return (
                    <button
                      key={sId}
                      type="button"
                      onClick={() => {
                        setSelectedSubject(sId);
                        setCurrentPage(1);
                      }}
                      className={`h-7 px-2.5 rounded text-xs font-medium transition-colors duration-150 ${isSelected
                          ? 'bg-cyan-700 text-white'
                          : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                    >
                      {sId}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Thông tin nhân khẩu học tóm tắt của đối tượng đang chọn */}
          {quest && selectedChannel !== 'DEMOGRAPHICS' && selectedChannel !== 'CLEAN_HEALTH' && (
            <div className="flex items-center gap-3 text-xs text-zinc-600 flex-wrap">
              <span className="flex items-center gap-1">
                <User size={13} className="text-zinc-500" />
                <span>{quest.gender} • <strong className="text-zinc-900 font-semibold">{quest.age}</strong> {language === 'vi' ? 'tuổi' : 'yrs'}</span>
              </span>
              <span className="text-zinc-300">•</span>
              <span>{language === 'vi' ? 'Chiều cao:' : 'Height:'} <strong className="text-zinc-900 font-semibold">{quest.height}</strong> cm</span>
              <span className="text-zinc-300">•</span>
              <span>{language === 'vi' ? 'Cân nặng:' : 'Weight:'} <strong className="text-zinc-900 font-semibold">{quest.weight}</strong> kg</span>
              <span className="text-zinc-300">•</span>
              <span className="bg-zinc-100 text-zinc-700 border border-zinc-200 rounded px-2 py-0.5 font-medium">
                {language === 'vi' ? `Fitzpatrick nhóm ${quest.skin}` : `Fitzpatrick Type ${quest.skin}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 4. THANH TABS CHỌN SHEET KÊNH CẢM BIẾN (TƯƠNG TỰ CÁC SHEET TABS TRONG EXCEL) */}
      <div className="bg-zinc-50/80 border border-zinc-200 rounded px-2 pt-1.5 flex items-center justify-between gap-2 select-none">
        <div
          ref={tabsContainerRef}
          className="flex-1 flex items-end gap-1 overflow-x-auto overflow-y-hidden h-10 scrollbar-thin [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-zinc-100 [&::-webkit-scrollbar-thumb]:bg-zinc-300 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400 [&::-webkit-scrollbar-thumb]:rounded"
        >
          <div className="text-xs font-medium text-zinc-500 px-2 flex items-center whitespace-nowrap select-none h-9">
            Sheets:
          </div>

          {activeCategoryTabs.map((tab) => {
            const isActive = selectedChannel === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setSelectedChannel(tab.key);
                  setCurrentPage(1);
                  setSearchQuery('');
                }}
                className={`h-9 px-3 rounded-t border-t border-x text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-colors duration-150 ${
                  isActive
                    ? 'bg-white border-zinc-200 border-b-2 border-b-cyan-700 text-cyan-800 font-semibold'
                    : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70 border-b-2 border-b-transparent'
                }`}
                title={tab.desc}
              >
                <span className={isActive ? 'text-cyan-700' : 'text-zinc-500'}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cụm nút cuộn nhanh thanh tab */}
        <div className="flex items-center gap-0.5 px-1 border-l border-zinc-200 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleTabScroll('left')}
            className="h-7 w-7 rounded bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-600 flex items-center justify-center transition-colors"
            title={language === 'vi' ? 'Cuộn danh sách tabs sang trái' : 'Scroll tabs left'}
            aria-label={language === 'vi' ? 'Cuộn danh sách tabs sang trái' : 'Scroll tabs left'}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            type="button"
            onClick={() => handleTabScroll('right')}
            className="h-7 w-7 rounded bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-600 flex items-center justify-center transition-colors"
            title={language === 'vi' ? 'Cuộn danh sách tabs sang phải' : 'Scroll tabs right'}
            aria-label={language === 'vi' ? 'Cuộn danh sách tabs sang phải' : 'Scroll tabs right'}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* 5. FORMULA BAR VÀ THANH CÔNG CỤ TÍNH TOÁN KIỂU EXCEL */}
      <div className="bg-zinc-50 border border-zinc-200 rounded p-2 flex flex-wrap items-center gap-2 text-xs">
        {/* Name Box (Tọa độ ô ví dụ A1, D14) */}
        <div
          className="h-8 min-w-[56px] px-2.5 rounded bg-white border border-zinc-300 font-mono text-xs font-medium text-zinc-900 flex items-center justify-center select-none"
          title="Tọa độ ô tính đang chọn"
        >
          {selectedCell ? selectedCell.excelCoord : 'A1'}
        </div>

        {/* Biểu tượng hàm fx */}
        <div className="text-zinc-400 font-serif italic font-bold text-sm px-1 select-none">
          fx
        </div>

        {/* Ô hiển thị giá trị hoặc công thức tính toán */}
        <div
          className="flex-1 h-8 px-3 rounded bg-white border border-zinc-300 font-mono text-xs text-zinc-900 flex items-center overflow-hidden text-ellipsis whitespace-nowrap min-w-[200px]"
          title="Giá trị ô đang chọn"
        >
          {selectedCell !== null
            ? String(selectedCell.value)
            : summaryStats
              ? `=AVERAGE(${selectedChannel}_${selectedSubject}): ${summaryStats.mean || '-'}`
              : '=SELECT_CELL()'}
        </div>

        {/* Nút copy giá trị ô đang chọn */}
        <button
          type="button"
          onClick={handleCopyCell}
          disabled={!selectedCell}
          className="h-8 px-3 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Sao chép giá trị ô đang chọn"
        >
          {copiedCell ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} className="text-zinc-500" />}
          <span>{copiedCell ? t('data.copied') : (language === 'vi' ? 'Sao chép ô' : 'Copy Cell')}</span>
        </button>

        {/* Ô tìm kiếm dữ liệu trên sheet */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
          <div className="h-8 px-2.5 rounded bg-white border border-zinc-300 flex items-center gap-1.5 focus-within:border-cyan-700 focus-within:ring-1 focus-within:ring-cyan-700">
            <Search size={13} className="text-zinc-400" />
            <input
              type="text"
              placeholder={t('data.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-zinc-900 w-36 sm:w-44"
            />
          </div>
          <button
            type="submit"
            className="h-8 px-3 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-xs font-medium text-zinc-700 transition-colors duration-150"
          >
            {t('data.filterBtn')}
          </button>
        </form>
      </div>

      {/* 6. THẺ THỐNG KÊ SUMMARY CARDS & MINI WAVEFORM SPARKLINE */}
      {summaryStats && selectedChannel !== 'DEMOGRAPHICS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Tổng số mẫu */}
          <div className="bg-white border border-zinc-200 rounded p-4 flex flex-col justify-between">
            <div className="text-[13px] font-medium text-zinc-600">
              {t('data.statsSamples')}
            </div>
            <div className="font-mono text-2xl sm:text-[28px] font-medium text-zinc-900 tabular-nums mt-1">
              {summaryStats.totalSamples ? summaryStats.totalSamples.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') : '--'}
            </div>
            <div className="text-xs text-zinc-500 font-mono mt-1">
              {t('data.freqPrefix')} <span className="text-zinc-700 font-medium">{summaryStats.sampleRate || '--'}</span> • {summaryStats.durationHours || '--'}
            </div>
          </div>

          {/* Card 2: Giá trị trung bình (Mean) */}
          <div className="bg-white border border-zinc-200 rounded p-4 flex flex-col justify-between">
            <div className="text-[13px] font-medium text-zinc-600">
              {t('data.statsMean')}
            </div>
            <div className="font-mono text-2xl sm:text-[28px] font-medium text-zinc-900 tabular-nums mt-1">
              {summaryStats.mean ?? '--'}
            </div>
            <div className="text-xs text-zinc-500 font-mono mt-1">
              {t('data.minPrefix')} <span className="text-zinc-700 font-medium">{summaryStats.min ?? '--'}</span> • {t('data.maxPrefix')} <span className="text-zinc-700 font-medium">{summaryStats.max ?? '--'}</span>
            </div>
          </div>

          {/* Card 3: Mini Waveform Sparkline Preview */}
          <div className="bg-white border border-zinc-200 rounded p-4 sm:col-span-2 flex flex-col justify-between min-h-[90px]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[13px] font-medium text-zinc-600">
                {t('data.waveform')} ({selectedChannel})
              </span>
              <span className="text-xs text-zinc-500 font-mono tabular-nums">
                {t('data.page')} {pagination.page} / {pagination.totalPages}
              </span>
            </div>
            <div className="w-full h-12">
              {chartPreview.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    key={`chart-${selectedChannel}-${selectedSubject}-${pagination.page}`}
                    data={chartPreview}
                    margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0e7490" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0e7490" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="val"
                      stroke="#0e7490"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#waveGrad)"
                      isAnimationActive={true}
                      animationDuration={700}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-zinc-400 text-xs text-center pt-3 font-normal">
                  Chưa có dữ liệu đồ thị dạng sóng
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. BẢNG TÍNH LƯỚI Ô EXCEL (SPREADSHEET GRID) */}
      <div className="bg-white border border-zinc-200 rounded overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3 text-zinc-500">
            <RefreshCw size={24} className="text-cyan-700 animate-spin" />
            <span className="text-sm font-medium">
              Đang tải dữ liệu {selectedChannel} ({selectedSubject})...
            </span>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-red-50/50">
            <div className="flex items-center justify-center gap-2 text-red-700 font-semibold text-sm">
              <AlertCircle size={18} />
              <span>Không thể tải file dữ liệu</span>
            </div>
            <p className="text-xs text-zinc-600 mt-1 max-w-md mx-auto">{error}</p>
          </div>
        ) : (
          <div
            ref={tableContainerRef}
            className="overflow-x-auto max-h-[580px] overflow-y-auto"
          >
            <table className="w-full border-collapse text-xs min-w-max">
              {/* THEAD: CÓ CHỮ CÁI CỘT A, B, C, D... VÀ TÊN CỘT */}
              <thead className="sticky top-0 z-10 bg-zinc-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                {/* Hàng 1: Chữ cái Excel (A, B, C, D...) */}
                <tr className="border-b border-zinc-200">
                  <th className="w-12 py-1 px-2 bg-zinc-100 border-r border-zinc-200 text-center text-[11px] font-mono font-medium text-zinc-400 select-none">
                    ◢
                  </th>
                  {columns.map((col) => (
                    <th
                      key={`col-letter-${col.key}`}
                      style={{ minWidth: col.width ? `${col.width}px` : '120px' }}
                      className="py-1 px-2 bg-zinc-100 border-r border-zinc-200 text-center text-[11px] font-mono font-medium text-zinc-500 select-none"
                    >
                      {col.excelCol}
                    </th>
                  ))}
                </tr>

                {/* Hàng 2: Tên cột dữ liệu */}
                <tr className="border-b border-zinc-200">
                  <th className="py-2 px-2 bg-zinc-50 border-r border-zinc-200 text-center text-xs font-medium text-zinc-500 select-none">
                    {language === 'vi' ? 'Dòng' : 'Row'}
                  </th>
                  {columns.map((col) => (
                    <th
                      key={`col-name-${col.key}`}
                      style={{ minWidth: col.width ? `${col.width}px` : '120px' }}
                      className={`py-2 px-3 bg-zinc-50 border-r border-zinc-200 text-xs font-medium text-zinc-600 whitespace-nowrap ${col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                    >
                      {getColumnDisplayName(col.key, col.label)}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* TBODY: LƯỚI Ô TÍNH */}
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="text-center py-12 text-zinc-500 text-sm"
                    >
                      {language === 'vi' ? 'Không có dòng dữ liệu nào khớp với điều kiện tìm kiếm.' : 'No data rows matched the search criteria.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rIdx) => {
                    const rowNumber = row.rowNum || (pagination.page - 1) * pagination.limit + rIdx + 1;
                    const isEven = rIdx % 2 === 0;
                    return (
                      <tr
                        key={row.id || `row-${rIdx}`}
                        className={`border-b border-zinc-200 transition-colors duration-75 ${isEven ? 'bg-white' : 'bg-zinc-50/50'
                          } hover:bg-zinc-100/60`}
                      >
                        {/* Cột số dòng Excel (1, 2, 3...) */}
                        <td className="w-12 py-1.5 px-2 text-center bg-zinc-50/90 border-r border-zinc-200 text-xs font-mono text-zinc-400 font-medium select-none">
                          {rowNumber}
                        </td>

                        {/* Các ô dữ liệu */}
                        {columns.map((col) => {
                          const val = row[col.key];
                          const excelCoord = `${col.excelCol}${rowNumber}`;
                          const isCellActive = selectedCell?.excelCoord === excelCoord;

                          // Render đặc biệt cho cột Hoạt động (Activity)
                          if (col.key === 'activity' || col.key === 'activityName') {
                            const badgeStyle = getActivityBadgeClass(val);
                            return (
                              <td
                                key={col.key}
                                style={{ minWidth: col.width ? `${col.width}px` : '120px' }}
                                onClick={() => setSelectedCell({ row: rowNumber, colKey: col.key, excelCoord, value: val })}
                                className={`py-1.5 px-3 border-r border-zinc-200 cursor-pointer ${isCellActive
                                    ? 'outline outline-2 outline-cyan-700 -outline-offset-2 bg-cyan-50/40 relative z-[1]'
                                    : ''
                                  }`}
                              >
                                <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${badgeStyle}`}>
                                  {val}
                                </span>
                              </td>
                            );
                          }

                          // Render đặc biệt cho cột Mức độ rủi ro (Risk Level) và Sinh tồn (Vital Level)
                          if (col.key === 'risk_level' || col.key === 'vital_level') {
                            const badgeStyle = getRiskBadgeClass(val);
                            return (
                              <td
                                key={col.key}
                                style={{ minWidth: col.width ? `${col.width}px` : '120px' }}
                                onClick={() => setSelectedCell({ row: rowNumber, colKey: col.key, excelCoord, value: val })}
                                className={`py-1.5 px-3 border-r border-zinc-200 text-center cursor-pointer ${isCellActive
                                    ? 'outline outline-2 outline-cyan-700 -outline-offset-2 bg-cyan-50/40 relative z-[1]'
                                    : ''
                                  }`}
                              >
                                <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${badgeStyle}`}>
                                  {val}
                                </span>
                              </td>
                            );
                          }

                          // Định dạng font cho số liệu (IBM Plex Mono + tabular-nums) và text (IBM Plex Sans)
                          const isNumeric = col.align === 'right' || !isNaN(Number(val));
                          const isTimestamp = col.key === 'timestamp' || col.key === 'time';

                          return (
                            <td
                              key={col.key}
                              style={{ minWidth: col.width ? `${col.width}px` : '120px' }}
                              onClick={() => setSelectedCell({ row: rowNumber, colKey: col.key, excelCoord, value: val })}
                              className={`py-1.5 px-3 border-r border-zinc-200 whitespace-nowrap cursor-pointer text-sm ${col.align === 'right'
                                  ? 'text-right'
                                  : col.align === 'center'
                                    ? 'text-center'
                                    : 'text-left'
                                } ${isCellActive
                                  ? 'outline outline-2 outline-cyan-700 -outline-offset-2 bg-cyan-50/40 relative z-[1] text-cyan-900 font-semibold'
                                  : isTimestamp
                                    ? 'font-mono text-zinc-500 tabular-nums'
                                    : isNumeric
                                      ? 'font-mono text-zinc-900 tabular-nums'
                                      : 'text-zinc-900'
                                }`}
                            >
                              {val ?? '--'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. PHÂN TRANG VÀ STATUS BAR DƯỚI CÙNG (KIỂU EXCEL STATUS BAR) */}
        <div
          ref={bottomBarRef}
          className="bg-zinc-50 border-t border-zinc-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600"
        >
          {/* Thông tin số dòng & Gợi ý con lăn chuột */}
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              {t('data.totalRows')} <strong className="font-mono text-zinc-900 font-medium">{pagination.totalRows.toLocaleString('vi-VN')}</strong>
            </span>
            <span className="text-zinc-300">•</span>
            <span>
              {t('data.page')}: <strong className="font-mono text-cyan-700 font-medium">{pagination.page}</strong> / {pagination.totalPages}
            </span>
            {selectedCell && (
              <>
                <span className="text-zinc-300">•</span>
                <span>
                  {language === 'vi' ? 'Ô đang chọn:' : 'Selected Cell:'} <strong className="font-mono text-zinc-900 font-medium">{selectedCell.excelCoord}</strong> ({String(selectedCell.value)})
                </span>
              </>
            )}
          </div>

          {/* Điều khiển cuộn ngang & Phân trang */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Cụm nút cuộn ngang nhanh bảng tính */}
            <div className="flex items-center gap-1 bg-white border border-zinc-300 rounded p-0.5">
              <button
                type="button"
                onClick={() => handleScrollHorizontal('left')}
                className="h-7 px-2 rounded text-zinc-700 hover:bg-zinc-100 text-xs font-medium flex items-center gap-1 transition-colors duration-150"
                title={language === 'vi' ? 'Cuộn bảng tính sang trái (hoặc lăn con lăn chuột tại thanh đáy)' : 'Scroll sheet left (or mouse wheel on bottom bar)'}
              >
                {language === 'vi' ? '◀ Trái' : '◀ Left'}
              </button>
              <div className="w-[1px] h-3.5 bg-zinc-200" />
              <button
                type="button"
                onClick={() => handleScrollHorizontal('right')}
                className="h-7 px-2 rounded text-zinc-700 hover:bg-zinc-100 text-xs font-medium flex items-center gap-1 transition-colors duration-150"
                title={language === 'vi' ? 'Cuộn bảng tính sang phải (hoặc lăn con lăn chuột tại thanh đáy)' : 'Scroll sheet right (or mouse wheel on bottom bar)'}
              >
                {language === 'vi' ? 'Phải ▶' : 'Right ▶'}
              </button>
            </div>

            {/* Chọn số dòng mỗi trang */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 px-2.5 rounded bg-white border border-zinc-300 text-xs text-zinc-900 font-medium cursor-pointer focus:outline-none focus:border-cyan-700"
            >
              <option value={50}>50 {language === 'vi' ? 'dòng/trang' : 'rows/page'}</option>
              <option value={100}>100 {language === 'vi' ? 'dòng/trang' : 'rows/page'}</option>
              <option value={200}>200 {language === 'vi' ? 'dòng/trang' : 'rows/page'}</option>
              <option value={500}>500 {language === 'vi' ? 'dòng/trang' : 'rows/page'}</option>
            </select>

            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1 || loading}
              className="h-8 w-8 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 flex items-center justify-center transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              title={language === 'vi' ? 'Về trang đầu' : 'First page'}
              aria-label={language === 'vi' ? 'Về trang đầu' : 'First page'}
            >
              <ChevronsLeft size={14} />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1 || loading}
              className="h-8 w-8 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 flex items-center justify-center transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              title={language === 'vi' ? 'Trang trước' : 'Previous page'}
              aria-label={language === 'vi' ? 'Trang trước' : 'Previous page'}
            >
              <ChevronLeft size={14} />
            </button>

            {/* Nhập số trang nhảy nhanh */}
            <form onSubmit={handleJumpPage} className="flex items-center">
              <input
                type="text"
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                className="h-8 w-11 rounded bg-white border border-zinc-300 text-center font-mono text-xs text-zinc-900 focus:outline-none focus:border-cyan-700"
                title={language === 'vi' ? 'Nhập số trang và nhấn Enter' : 'Enter page number and press Enter'}
                aria-label={language === 'vi' ? 'Nhập số trang' : 'Page number'}
              />
            </form>

            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
              disabled={currentPage >= pagination.totalPages || loading}
              className="h-8 w-8 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 flex items-center justify-center transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              title={language === 'vi' ? 'Trang sau' : 'Next page'}
              aria-label={language === 'vi' ? 'Trang sau' : 'Next page'}
            >
              <ChevronRight size={14} />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(pagination.totalPages)}
              disabled={currentPage >= pagination.totalPages || loading}
              className="h-8 w-8 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 flex items-center justify-center transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              title={language === 'vi' ? 'Đến trang cuối' : 'Last page'}
              aria-label={language === 'vi' ? 'Đến trang cuối' : 'Last page'}
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
