'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table as TableIcon,
  Search,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  RefreshCw,
  FolderOpen,
  Activity,
  Heart,
  Zap,
  Thermometer,
  Compass,
  FileSpreadsheet,
  Tag,
  Sun,
  Moon,
  User,
  Sliders,
  ExternalLink,
  Info,
  Sparkles,
  Radio
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

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
  const [demographics, setDemographics] = useState<SubjectQuest[]>([]);

  // Tương tác ô tính Excel (Active Cell)
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    colKey: string;
    excelCoord: string;
    value: any;
  } | null>(null);
  const [copiedCell, setCopiedCell] = useState<boolean>(false);
  const [copiedTable, setCopiedTable] = useState<boolean>(false);
  const [sheetTheme, setSheetTheme] = useState<'dark' | 'light'>('dark');
  const isDark = sheetTheme === 'dark';

  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const bottomBarRef = React.useRef<HTMLDivElement>(null);

  // Cuộn ngang bằng con lăn chuột khi di chuột vào vùng thanh cuộn đáy hoặc vùng footer
  useEffect(() => {
    const tableEl = tableContainerRef.current;
    if (!tableEl) return;

    const handleTableWheel = (e: WheelEvent) => {
      const rect = tableEl.getBoundingClientRect();
      const isNearBottomScrollbar = e.clientY >= rect.bottom - 60;

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
  }, [loading]);

  useEffect(() => {
    const bottomEl = bottomBarRef.current;
    const tableEl = tableContainerRef.current;
    if (!bottomEl || !tableEl) return;

    const handleBottomWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        tableEl.scrollLeft += e.deltaY * 1.6;
      }
    };

    bottomEl.addEventListener('wheel', handleBottomWheel, { passive: false });
    return () => {
      bottomEl.removeEventListener('wheel', handleBottomWheel);
    };
  }, [loading]);

  // Nút bấm cuộn ngang nhanh sang trái hoặc phải
  const handleScrollHorizontal = (direction: 'left' | 'right') => {
    if (tableContainerRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      tableContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
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
      badge: '6 Features • Z-Score',
      icon: <Activity size={14} />,
      desc: 'Tập dữ liệu sạch huấn luyện AI (6 đặc trưng + risk_level: Low, Medium, High)'
    },
    {
      key: 'CLEAN_HEALTH_DETAILED',
      label: 'clean_health_detailed.csv (19 cột)',
      badge: 'NEWS2 • 19 Cột',
      icon: <FileSpreadsheet size={14} />,
      desc: 'Tập dữ liệu chi tiết đầy đủ 19 trường (NEWS2, BMI, vital_score, label_driver)'
    }
  ];

  // Danh mục 2: Dữ liệu thô - Chưa xử lý (Raw Sensor Signals & Ground Truth)
  const rawChannels = [
    { key: 'BVP', label: 'BVP.csv (PPG 64Hz)', badge: '64 Hz', icon: <Activity size={14} />, desc: 'Biên độ sóng quang học PPG 64Hz' },
    { key: 'HR', label: 'HR.csv (Heart Rate 1Hz)', badge: '1 Hz', icon: <Heart size={14} />, desc: 'Nhịp tim theo thời gian 1Hz' },
    { key: 'ACC', label: 'ACC.csv (Gia tốc 32Hz)', badge: '32 Hz', icon: <Compass size={14} />, desc: 'Cảm biến gia tốc 3 trục X, Y, Z 32Hz' },
    { key: 'EDA', label: 'EDA.csv (Điện trở da 4Hz)', badge: '4 Hz', icon: <Zap size={14} />, desc: 'Điện trở dẫn truyền da Galvanic 4Hz' },
    { key: 'TEMP', label: 'TEMP.csv (Nhiệt độ 4Hz)', badge: '4 Hz', icon: <Thermometer size={14} />, desc: 'Nhiệt độ da cơ thể 4Hz' },
    { key: 'ACTIVITIES', label: 'Activities (Nhãn vận động)', badge: 'Ground Truth', icon: <Tag size={14} />, desc: 'Các giai đoạn hoạt động lâm sàng' },
    { key: 'DEMOGRAPHICS', label: 'Demographics (15 Subjects)', badge: '15 Subjects', icon: <User size={14} />, desc: 'Thông tin nhân khẩu học 15 đối tượng nghiên cứu' }
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
        throw new Error(data.error || 'Không thể tải dữ liệu sheet');
      }

      setDatasetDir(data.datasetDir || 'D:\Spring\smart-watch\model\riskscore');
      if (chan === 'DEMOGRAPHICS') {
        setDemographics(data.demographics || []);
        // Tạo columns và rows cho Demographics sheet
        setColumns([
          { key: 'rowNum', label: '#', excelCol: 'A', width: 60, align: 'center' },
          { key: 'subjectId', label: 'Đối tượng (Subject ID)', excelCol: 'B', width: 160, align: 'center' },
          { key: 'gender', label: 'Giới tính', excelCol: 'C', width: 110, align: 'center' },
          { key: 'age', label: 'Tuổi (Năm)', excelCol: 'D', width: 110, align: 'right' },
          { key: 'height', label: 'Chiều cao (cm)', excelCol: 'E', width: 130, align: 'right' },
          { key: 'weight', label: 'Cân nặng (kg)', excelCol: 'F', width: 130, align: 'right' },
          { key: 'bmi', label: 'Chỉ số BMI (kg/m²)', excelCol: 'G', width: 140, align: 'right' },
          { key: 'skin', label: 'Phân loại da (Fitzpatrick Scale)', excelCol: 'H', width: 220, align: 'center' },
          { key: 'sport', label: 'Mức độ thể thao (1-6)', excelCol: 'I', width: 160, align: 'right' }
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
            skin: `Fitzpatrick Type ${d.skin}`,
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
        setSummaryStats({
          totalSubjects: demoRows.length,
          avgAge: (demoRows.reduce((acc: number, r: any) => acc + (Number(r.age) || 0), 0) / demoRows.length).toFixed(1) + ' tuổi',
          avgWeight: (demoRows.reduce((acc: number, r: any) => acc + (Number(r.weight) || 0), 0) / demoRows.length).toFixed(1) + ' kg'
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
      // Tự động chọn ô A1
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
    // Nếu chuyển sang kênh thô (khác Demographics) mà subject vẫn là ALL, tự động chuyển về S1
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

  // Hàm chọn màu badge cho nhãn hoạt động (hỗ trợ cả Dark và Light)
  const getActivityBadgeColor = (actName: string) => {
    const act = (actName || '').toUpperCase();
    if (act.includes('NO_ACTIVITY')) return isDark ? { bg: 'rgba(100, 116, 139, 0.25)', text: '#94a3b8', border: '#475569' } : { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    if (act.includes('SOCCER')) return isDark ? { bg: 'rgba(239, 68, 68, 0.25)', text: '#fca5a5', border: '#ef4444' } : { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
    if (act.includes('CYCLING')) return isDark ? { bg: 'rgba(249, 115, 22, 0.25)', text: '#fdba74', border: '#f97316' } : { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' };
    if (act.includes('WALKING')) return isDark ? { bg: 'rgba(56, 189, 248, 0.25)', text: '#7dd3fc', border: '#0284c7' } : { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
    if (act.includes('WORKING')) return isDark ? { bg: 'rgba(168, 85, 247, 0.25)', text: '#d8b4fe', border: '#a855f7' } : { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' };
    if (act.includes('STAIRS')) return isDark ? { bg: 'rgba(234, 179, 8, 0.25)', text: '#fde047', border: '#ca8a04' } : { bg: '#fef9c3', text: '#a16207', border: '#fef08a' };
    if (act.includes('LUNCH') || act.includes('DRIVING')) return isDark ? { bg: 'rgba(236, 72, 153, 0.25)', text: '#f472b6', border: '#db2777' } : { bg: '#fce7f3', text: '#be185d', border: '#fbcfe8' };
    if (act.includes('BASELINE')) return isDark ? { bg: 'rgba(34, 197, 94, 0.25)', text: '#86efac', border: '#16a34a' } : { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
    return isDark ? { bg: 'rgba(148, 163, 184, 0.2)', text: '#cbd5e1', border: '#64748b' } : { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1440px', margin: '0 auto' }}>

      {/* 1. HEADER BAR: TIÊU ĐỀ DATASET & ĐƯỜNG DẪN THƯ MỤC */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#11141c',
        border: '1px solid #1e2433',
        borderRadius: '16px',
        padding: '1.2rem 1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 124, 65, 0.18)',
            border: '1px solid #107c41',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#107c41',
            boxShadow: '0 0 15px rgba(16, 124, 65, 0.25)'
          }}>
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
                PPG_FieldStudy <span style={{ color: '#107c41', fontWeight: 700 }}>Data Sheet Studio</span>
              </h2>
              <span style={{
                fontSize: '0.68rem',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: dataCategory === 'PROCESSED' ? 'rgba(16, 124, 65, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                color: dataCategory === 'PROCESSED' ? '#22c55e' : '#38bdf8',
                fontWeight: 700,
                border: dataCategory === 'PROCESSED' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)'
              }}>
                {dataCategory === 'PROCESSED' ? 'Dữ liệu đã xử lý • 32,353 Mẫu AI Train' : 'Dữ liệu thô • 15 Đối tượng • 7 Kênh đo gốc'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.75rem' }}>
              <FolderOpen size={13} color="#64748b" />
              <span style={{ fontFamily: 'ui-monospace, monospace', color: '#38bdf8' }}>{datasetDir}</span>
            </div>
          </div>
        </div>

        {/* Nút thao tác nhanh trên Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={handleCopyTable}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: copiedTable ? '#22c55e' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              color: copiedTable ? '#fff' : '#e2e8f0',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Sao chép toàn bộ trang dữ liệu hiện tại (Dán trực tiếp vào Excel / Google Sheets)"
          >
            {copiedTable ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedTable ? 'Đã sao chép TSV' : 'Copy Sheet'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#107c41',
              border: '1px solid #1e8e4f',
              borderRadius: '8px',
              padding: '0.5rem 0.95rem',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 124, 65, 0.3)',
              transition: 'all 0.2s ease'
            }}
            title="Tải về file CSV của bảng tính hiện tại"
          >
            <Download size={14} />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* 2. BỘ CHUYỂN ĐỔI PHÂN LOẠI DỮ LIỆU: DỮ LIỆU ĐÃ XỬ LÝ vs DỮ LIỆU THÔ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '0.85rem'
      }}>
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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.85rem 1.15rem',
            borderRadius: '12px',
            border: dataCategory === 'PROCESSED' ? '1.5px solid #22c55e' : '1px solid #1e2433',
            backgroundColor: dataCategory === 'PROCESSED' ? 'rgba(34, 197, 94, 0.08)' : '#11141c',
            cursor: 'pointer',
            textAlign: 'left',
            position: 'relative',
            transition: 'all 0.2s ease',
            boxShadow: dataCategory === 'PROCESSED' ? '0 0 20px rgba(34, 197, 94, 0.12)' : 'none'
          }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: dataCategory === 'PROCESSED' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: dataCategory === 'PROCESSED' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: dataCategory === 'PROCESSED' ? '#22c55e' : '#64748b',
            flexShrink: 0
          }}>
            <Sparkles size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.92rem',
                fontWeight: 800,
                color: dataCategory === 'PROCESSED' ? '#f8fafc' : '#94a3b8',
                letterSpacing: '-0.01em'
              }}>
                Dữ Liệu Đã Xử Lý (Processed Data)
              </span>
              <span style={{
                fontSize: '0.65rem',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: dataCategory === 'PROCESSED' ? 'rgba(34, 197, 94, 0.22)' : 'rgba(255, 255, 255, 0.06)',
                color: dataCategory === 'PROCESSED' ? '#4ade80' : '#64748b',
                fontWeight: 700,
                border: dataCategory === 'PROCESSED' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid transparent',
                whiteSpace: 'nowrap'
              }}>
                2 Files • AI Ready
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.35 }}>
              Dữ liệu đã qua tiền xử lý, khử nhiễu, chuẩn hóa Z-Score & gán nhãn phân tầng rủi ro sức khỏe
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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.85rem 1.15rem',
            borderRadius: '12px',
            border: dataCategory === 'RAW' ? '1.5px solid #38bdf8' : '1px solid #1e2433',
            backgroundColor: dataCategory === 'RAW' ? 'rgba(56, 189, 248, 0.08)' : '#11141c',
            cursor: 'pointer',
            textAlign: 'left',
            position: 'relative',
            transition: 'all 0.2s ease',
            boxShadow: dataCategory === 'RAW' ? '0 0 20px rgba(56, 189, 248, 0.12)' : 'none'
          }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: dataCategory === 'RAW' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: dataCategory === 'RAW' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: dataCategory === 'RAW' ? '#38bdf8' : '#64748b',
            flexShrink: 0
          }}>
            <Radio size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.92rem',
                fontWeight: 800,
                color: dataCategory === 'RAW' ? '#f8fafc' : '#94a3b8',
                letterSpacing: '-0.01em'
              }}>
                Dữ Liệu Thô - Chưa Xử Lý (Raw Sensor Data)
              </span>
              <span style={{
                fontSize: '0.65rem',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: dataCategory === 'RAW' ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255, 255, 255, 0.06)',
                color: dataCategory === 'RAW' ? '#38bdf8' : '#64748b',
                fontWeight: 700,
                border: dataCategory === 'RAW' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                whiteSpace: 'nowrap'
              }}>
                7 Kênh • Tín Hiệu Gốc
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.35 }}>
              Tín hiệu cảm biến vật lý gốc từ thiết bị đo Empatica E4 (PPG 64Hz, HR, ACC 32Hz, EDA, TEMP, S1–S15)
            </div>
          </div>
        </button>
      </div>

      {/* 3. THANH CHỌN SUBJECTS VỚI THÔNG TIN NHÂN KHẨU HỌC HOẶC TẬP TRAIN */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#131722',
        border: '1px solid #1f2739',
        borderRadius: '12px',
        padding: '0.65rem 1rem',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}>
        {selectedChannel === 'CLEAN_HEALTH' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: '#4ade80',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              Tập dữ liệu AI Train (32,353 mẫu chuẩn hóa)
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Dữ liệu tổng hợp từ 15 đối tượng thực nghiệm WESAD (6 đặc trưng + nhãn risk_level: Low, Medium, High)
            </span>
          </div>
        ) : selectedChannel === 'CLEAN_HEALTH_DETAILED' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Lọc theo Đối tượng:
            </span>
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '2px' }}>
              {['ALL', ...subjectsList].map((sId) => {
                const isSelected = selectedSubject === sId;
                return (
                  <button
                    key={sId}
                    onClick={() => {
                      setSelectedSubject(sId);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '7px',
                      border: isSelected ? '1px solid #107c41' : '1px solid rgba(255,255,255,0.06)',
                      backgroundColor: isSelected ? '#107c41' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 800 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {sId === 'ALL' ? 'Tất cả (All 15)' : sId}
                  </button>
                );
              })}
            </div>
          </div>
        ) : selectedChannel === 'DEMOGRAPHICS' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              Demographics (15 Subjects)
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Hồ sơ khảo sát nhân khẩu học, chiều cao, cân nặng, BMI và phân loại da Fitzpatrick của 15 đối tượng nghiên cứu
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Đối tượng (Subject):
            </span>
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '2px' }}>
              {subjectsList.map((sId) => {
                const isSelected = selectedSubject === sId;
                return (
                  <button
                    key={sId}
                    onClick={() => {
                      setSelectedSubject(sId);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '7px',
                      border: isSelected ? '1px solid #0284c7' : '1px solid rgba(255,255,255,0.06)',
                      backgroundColor: isSelected ? '#0284c7' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 800 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={13} color="#38bdf8" />
              <span>{quest.gender} • <strong>{quest.age}</strong> tuổi</span>
            </span>
            <span>•</span>
            <span>Chiều cao: <strong>{quest.height}</strong> cm</span>
            <span>•</span>
            <span>Cân nặng: <strong>{quest.weight}</strong> kg</span>
            <span>•</span>
            <span style={{
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              padding: '2px 7px',
              borderRadius: '4px',
              fontWeight: 600
            }}>
              Fitzpatrick Type {quest.skin}
            </span>
          </div>
        )}
      </div>

      {/* 4. THANH TABS CHỌN SHEET KÊNH CẢM BIẾN (TƯƠNG TỰ CÁC SHEET TABS TRONG EXCEL) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        backgroundColor: '#0c0f17',
        border: '1px solid #1f2739',
        borderBottom: dataCategory === 'PROCESSED' ? '2px solid #107c41' : '2px solid #0284c7',
        borderRadius: '12px 12px 0 0',
        padding: '0.4rem 0.5rem 0 0.5rem',
        overflowX: 'auto'
      }}>
        <div style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: dataCategory === 'PROCESSED' ? '#4ade80' : '#38bdf8',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          padding: '0.5rem 0.65rem',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          whiteSpace: 'nowrap'
        }}>
          {dataCategory === 'PROCESSED' ? (
            <>
              <Sparkles size={12} />
              <span>Sheets Đã Xử Lý:</span>
            </>
          ) : (
            <>
              <Radio size={12} />
              <span>Sheets Cảm Biến Gốc:</span>
            </>
          )}
        </div>

        {activeCategoryTabs.map((tab) => {
          const isActive = selectedChannel === tab.key;
          const activeBorderColor = dataCategory === 'PROCESSED' ? '#22c55e' : '#38bdf8';
          const activeIconColor = dataCategory === 'PROCESSED' ? '#22c55e' : '#38bdf8';
          return (
            <button
              key={tab.key}
              onClick={() => {
                setSelectedChannel(tab.key);
                setCurrentPage(1);
                setSearchQuery('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1rem',
                border: isActive ? (dataCategory === 'PROCESSED' ? '1px solid #107c41' : '1px solid #0284c7') : '1px solid transparent',
                borderBottom: isActive ? `3px solid ${activeBorderColor}` : '1px solid transparent',
                borderRadius: '8px 8px 0 0',
                backgroundColor: isActive ? '#161d2b' : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                fontSize: '0.8rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              title={tab.desc}
            >
              <span style={{ color: isActive ? activeIconColor : '#64748b' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. FORMULA BAR VÀ THANH CÔNG CỤ TÍNH TOÁN KIỂU EXCEL */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        backgroundColor: isDark ? '#11141c' : '#f8fafc',
        border: isDark ? '1px solid #1e2433' : '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '0.5rem 0.85rem',
        flexWrap: 'wrap',
        boxShadow: isDark ? '0 4px 15px rgba(0, 0, 0, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Name Box (Tọa độ ô ví dụ D14) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#1a202c' : '#ffffff',
          border: isDark ? '1px solid #2d3748' : '1px solid #cbd5e1',
          borderRadius: '4px',
          padding: '0.25rem 0.65rem',
          color: isDark ? '#4ade80' : '#107c41',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.8rem',
          fontWeight: 800,
          minWidth: '55px',
          boxShadow: isDark ? 'none' : 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
        }}>
          {selectedCell ? selectedCell.excelCoord : 'A1'}
        </div>

        {/* Biểu tượng hàm fx */}
        <div style={{
          color: isDark ? '#94a3b8' : '#64748b',
          fontWeight: 900,
          fontSize: '0.88rem',
          fontFamily: 'serif',
          fontStyle: 'italic',
          userSelect: 'none'
        }}>
          fx
        </div>

        {/* Ô hiển thị giá trị hoặc công thức tính toán */}
        <div style={{
          flex: 1,
          backgroundColor: isDark ? '#1a202c' : '#ffffff',
          border: isDark ? '1px solid #2d3748' : '1px solid #cbd5e1',
          borderRadius: '4px',
          padding: '0.25rem 0.65rem',
          color: isDark ? '#f8fafc' : '#0f172a',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.8rem',
          minWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          boxShadow: isDark ? 'none' : 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
        }}>
          {selectedCell !== null
            ? String(selectedCell.value)
            : summaryStats
              ? `=AVERAGE(${selectedChannel}_${selectedSubject}): ${summaryStats.mean || '-'}`
              : '=SELECT_CELL()'}
        </div>

        {/* Nút chuyển đổi Giao diện Tối / Sáng */}
        <button
          type="button"
          onClick={() => setSheetTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '4px',
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
            color: isDark ? '#facc15' : '#475569',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title={isDark ? "Đang bật Nền Tối (dễ nhìn, tương phản cao). Bấm để chuyển sang Nền Trắng" : "Đang bật Nền Trắng. Bấm để chuyển sang Nền Tối dịu mắt"}
        >
          {isDark ? <Sun size={13} color="#facc15" /> : <Moon size={13} color="#64748b" />}
          <span>{isDark ? 'Nền Tối (Dễ nhìn)' : 'Nền Trắng'}</span>
        </button>

        {/* Nút copy giá trị ô đang chọn */}
        <button
          onClick={handleCopyCell}
          disabled={!selectedCell}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '4px',
            backgroundColor: copiedCell ? (isDark ? '#166534' : '#107c41') : (isDark ? '#1a202c' : '#ffffff'),
            border: isDark ? '1px solid #2d3748' : '1px solid #cbd5e1',
            color: copiedCell ? '#ffffff' : (isDark ? '#cbd5e1' : '#334155'),
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: selectedCell ? 'pointer' : 'not-allowed',
            boxShadow: isDark ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}
          title="Sao chép giá trị ô đang chọn"
        >
          {copiedCell ? <Check size={12} /> : <Copy size={12} />}
          <span>{copiedCell ? 'Đã copy' : 'Copy ô'}</span>
        </button>

        {/* Ô tìm kiếm dữ liệu trên sheet */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            backgroundColor: isDark ? '#1a202c' : '#ffffff',
            border: isDark ? '1px solid #2d3748' : '1px solid #cbd5e1',
            borderRadius: '4px',
            padding: '0.2rem 0.5rem',
            boxShadow: isDark ? 'none' : 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
          }}>
            <Search size={12} color={isDark ? '#94a3b8' : '#64748b'} />
            <input
              type="text"
              placeholder="Lọc / Tìm kiếm giá trị..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: '0.75rem',
                width: '140px'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: '4px',
              backgroundColor: isDark ? '#22c55e' : '#f1f5f9',
              border: isDark ? '1px solid #16a34a' : '1px solid #cbd5e1',
              color: isDark ? '#ffffff' : '#1e293b',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Lọc
          </button>
        </form>
      </div>

      {/* 5. THẺ THỐNG KÊ SUMMARY CARDS & MINI WAVEFORM SPARKLINE */}
      {summaryStats && selectedChannel !== 'DEMOGRAPHICS' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem'
        }}>
          {/* Card 1: Tổng số mẫu */}
          <div style={{
            backgroundColor: '#11141c',
            border: '1px solid #1f2739',
            borderRadius: '10px',
            padding: '0.85rem 1rem'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Tổng số mẫu (Total Samples)
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
              {summaryStats.totalSamples ? summaryStats.totalSamples.toLocaleString('vi-VN') : '-'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '0.2rem' }}>
              Tần số: <strong>{summaryStats.sampleRate || '-'}</strong> • {summaryStats.durationHours || '-'}
            </div>
          </div>

          {/* Card 2: Giá trị trung bình (Mean) */}
          <div style={{
            backgroundColor: '#11141c',
            border: '1px solid #1f2739',
            borderRadius: '10px',
            padding: '0.85rem 1rem'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Giá trị Trung Bình (Mean)
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#22c55e', marginTop: '0.25rem' }}>
              {summaryStats.mean ?? '-'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Min: <strong>{summaryStats.min}</strong> • Max: <strong>{summaryStats.max}</strong>
            </div>
          </div>

          {/* Card 3: Mini Waveform Sparkline Preview */}
          <div style={{
            backgroundColor: '#11141c',
            border: '1px solid #1f2739',
            borderRadius: '10px',
            padding: '0.65rem 1rem',
            gridColumn: 'span 2',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '85px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                Waveform Preview (Dạng sóng tín hiệu {selectedChannel})
              </span>
              <span style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 700 }}>
                Trang {pagination.page} / {pagination.totalPages}
              </span>
            </div>
            <div style={{ width: '100%', height: '52px' }}>
              {chartPreview.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartPreview} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#107c41" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#107c41" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="val" stroke="#22c55e" strokeWidth={1.5} fillOpacity={1} fill="url(#waveGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ color: '#475569', fontSize: '0.72rem', textAlign: 'center', paddingTop: '15px' }}>
                  Không có dữ liệu preview sóng
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. BẢNG TÍNH LƯỚI Ô EXCEL (SPREADSHEET GRID) */}
      <div style={{
        backgroundColor: isDark ? '#0b0f19' : '#ffffff',
        border: isDark ? '1px solid #1e2433' : '1px solid #cbd5e1',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.5)' : '0 4px 20px rgba(0, 0, 0, 0.08)'
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            gap: '1rem',
            color: '#94a3b8'
          }}>
            <RefreshCw size={28} color="#22c55e" style={{ animation: 'spinSlow 1s linear infinite' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Đang tải Sheet dữ liệu {selectedChannel} ({selectedSubject})...
            </span>
          </div>
        ) : error ? (
          <div style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            color: '#f87171'
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>Không thể mở file dữ liệu</div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>{error}</p>
          </div>
        ) : (
          <div ref={tableContainerRef} className={`spreadsheet-scroll ${isDark ? 'spreadsheet-scroll-dark' : 'spreadsheet-scroll-light'}`} style={{ overflowX: 'auto', maxHeight: '580px', overflowY: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.78rem',
              color: '#e2e8f0'
            }}>
              {/* THEAD KIỂU EXCEL: CÓ CHỮ CÁI CỘT A, B, C, D... */}
              <thead style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: isDark ? '#131926' : '#f1f5f9',
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.06)'
              }}>
                {/* Hàng 1: Chữ cái Excel (A, B, C, D...) */}
                <tr style={{ borderBottom: isDark ? '1px solid #1e2536' : '1px solid #cbd5e1' }}>
                  <th style={{
                    width: '45px',
                    padding: '4px 6px',
                    backgroundColor: isDark ? '#161c28' : '#e2e8f0',
                    borderRight: isDark ? '1px solid #1e2536' : '1px solid #cbd5e1',
                    color: isDark ? '#64748b' : '#64748b',
                    fontSize: '0.68rem',
                    textAlign: 'center',
                    userSelect: 'none'
                  }}>
                    ◢
                  </th>
                  {columns.map((col) => (
                    <th
                      key={`col-letter-${col.key}`}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: isDark ? '#161c28' : '#f1f5f9',
                        borderRight: isDark ? '1px solid #1e2536' : '1px solid #cbd5e1',
                        color: isDark ? '#94a3b8' : '#475569',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        userSelect: 'none'
                      }}
                    >
                      {col.excelCol}
                    </th>
                  ))}
                </tr>

                {/* Hàng 2: Tên cột dữ liệu */}
                <tr style={{ borderBottom: isDark ? '2px solid #22c55e' : '2px solid #107c41' }}>
                  <th style={{
                    padding: '8px 6px',
                    backgroundColor: isDark ? '#131926' : '#f1f5f9',
                    borderRight: isDark ? '1px solid #1e2536' : '1px solid #cbd5e1',
                    color: isDark ? '#94a3b8' : '#475569',
                    fontSize: '0.72rem',
                    textAlign: 'center',
                    userSelect: 'none'
                  }}>
                    Row
                  </th>
                  {columns.map((col) => (
                    <th
                      key={`col-name-${col.key}`}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: isDark ? '#131926' : '#f8fafc',
                        borderRight: isDark ? '1px solid #1e2536' : '1px solid #cbd5e1',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textAlign: col.align || 'left',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* TBODY: LƯỚI Ô TÍNH */}
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      Không có dòng nào khớp với từ khóa tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rIdx) => {
                    const rowNumber = row.rowNum || (pagination.page - 1) * pagination.limit + rIdx + 1;
                    const isEven = rIdx % 2 === 0;
                    return (
                      <tr
                        key={row.id || `row-${rIdx}`}
                        style={{
                          backgroundColor: isDark
                            ? (isEven ? '#0b0f19' : '#101624')
                            : (isEven ? '#ffffff' : '#f8fafc'),
                          borderBottom: isDark ? '1px solid #182030' : '1px solid #e2e8f0',
                          transition: 'background-color 0.1s ease'
                        }}
                      >
                        {/* Cột số dòng Excel (1, 2, 3...) */}
                        <td style={{
                          padding: '4px 6px',
                          textAlign: 'center',
                          backgroundColor: isDark ? '#141a26' : '#f1f5f9',
                          borderRight: isDark ? '1px solid #1e2536' : '1px solid #cbd5e1',
                          color: isDark ? '#64748b' : '#64748b',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          userSelect: 'none'
                        }}>
                          {rowNumber}
                        </td>

                        {/* Các ô dữ liệu */}
                        {columns.map((col) => {
                          const val = row[col.key];
                          const excelCoord = `${col.excelCol}${rowNumber}`;
                          const isCellActive = selectedCell?.excelCoord === excelCoord;

                          // Render đặc biệt cho cột Hoạt động (Activity)
                          if (col.key === 'activity' || col.key === 'activityName') {
                            const badgeStyle = getActivityBadgeColor(val);
                            return (
                              <td
                                key={col.key}
                                onClick={() => setSelectedCell({ row: rowNumber, colKey: col.key, excelCoord, value: val })}
                                style={{
                                  padding: '4px 10px',
                                  borderRight: isDark ? '1px solid #182030' : '1px solid #e2e8f0',
                                  textAlign: col.align || 'left',
                                  outline: isCellActive ? (isDark ? '2px solid #22c55e' : '2px solid #107c41') : 'none',
                                  outlineOffset: '-2px',
                                  cursor: 'pointer'
                                }}
                              >
                                <span style={{
                                  display: 'inline-block',
                                  padding: '1px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: badgeStyle.bg,
                                  color: badgeStyle.text,
                                  border: `1px solid ${badgeStyle.border}`,
                                  fontSize: '0.68rem',
                                  fontWeight: 700
                                }}>
                                  {val}
                                </span>
                              </td>
                            );
                          }

                          // Render đặc biệt cho cột Mức độ rủi ro (Risk Level) và Sinh tồn (Vital Level)
                          if (col.key === 'risk_level' || col.key === 'vital_level') {
                            const level = String(val || '').toUpperCase();
                            let badge = isDark
                              ? { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80', border: '#16a34a' }
                              : { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
                            if (level === 'MEDIUM') {
                              badge = isDark
                                ? { bg: 'rgba(245, 158, 11, 0.25)', text: '#fbbf24', border: '#d97706' }
                                : { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' };
                            } else if (level === 'HIGH') {
                              badge = isDark
                                ? { bg: 'rgba(239, 68, 68, 0.25)', text: '#f87171', border: '#dc2626' }
                                : { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
                            }
                            return (
                              <td
                                key={col.key}
                                onClick={() => setSelectedCell({ row: rowNumber, colKey: col.key, excelCoord, value: val })}
                                style={{
                                  padding: '4px 8px',
                                  borderRight: isDark ? '1px solid #182030' : '1px solid #e2e8f0',
                                  textAlign: 'center',
                                  outline: isCellActive ? (isDark ? '2px solid #22c55e' : '2px solid #107c41') : 'none',
                                  outlineOffset: '-2px',
                                  cursor: 'pointer'
                                }}
                              >
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: badge.bg,
                                  color: badge.text,
                                  border: `1px solid ${badge.border}`,
                                  fontSize: '0.72rem',
                                  fontWeight: 800
                                }}>
                                  {val}
                                </span>
                              </td>
                            );
                          }

                          // Xác định màu sắc hiển thị cho thông số
                          const getCellTextColor = () => {
                            if (isCellActive) return isDark ? '#4ade80' : '#107c41';
                            if (col.align === 'right') {
                              // Cột số đo lường, float, nhịp tim: sáng rõ, tương phản cao
                              return isDark ? '#38bdf8' : '#0284c7';
                            }
                            if (col.key === 'timestamp' || col.key === 'time') {
                              return isDark ? '#a7f3d0' : '#047857';
                            }
                            return isDark ? '#f1f5f9' : '#0f172a';
                          };

                          return (
                            <td
                              key={col.key}
                              onClick={() => setSelectedCell({ row: rowNumber, colKey: col.key, excelCoord, value: val })}
                              style={{
                                padding: '5px 10px',
                                borderRight: isDark ? '1px solid #182030' : '1px solid #e2e8f0',
                                textAlign: col.align || 'left',
                                color: getCellTextColor(),
                                fontWeight: isCellActive ? 700 : (col.align === 'right' ? 600 : 500),
                                outline: isCellActive ? (isDark ? '2px solid #22c55e' : '2px solid #107c41') : 'none',
                                backgroundColor: isCellActive
                                  ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(16, 124, 65, 0.08)')
                                  : 'transparent',
                                outlineOffset: '-2px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {val ?? '-'}
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
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.65rem 1rem',
            backgroundColor: isDark ? '#11141c' : '#f8fafc',
            borderTop: isDark ? '1px solid #1e2433' : '1px solid #cbd5e1',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          {/* Thông tin số dòng & Gợi ý con lăn chuột */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#475569', flexWrap: 'wrap' }}>
            <span>
              Tổng số dòng: <strong style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{pagination.totalRows.toLocaleString('vi-VN')}</strong>
            </span>
            <span>•</span>
            <span>
              Trang: <strong style={{ color: isDark ? '#4ade80' : '#107c41' }}>{pagination.page}</strong> / {pagination.totalPages}
            </span>
            {selectedCell && (
              <>
                <span>•</span>
                <span style={{ color: '#38bdf8' }}>
                  Ô đang chọn: <strong>{selectedCell.excelCoord}</strong> ({selectedCell.value})
                </span>
              </>
            )}
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
              color: '#4ade80',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: 600,
              border: isDark ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(34, 197, 94, 0.2)'
            }}>
              <span>🖱️ Di chuột vào thanh đáy để dùng con lăn cuộn ngang ⇄</span>
            </span>
          </div>

          {/* Điều khiển cuộn ngang & Phân trang */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Cụm nút cuộn ngang nhanh bảng tính */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              backgroundColor: isDark ? '#1a202c' : '#ffffff',
              border: isDark ? '1px solid #2d3748' : '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '2px'
            }}>
              <button
                onClick={() => handleScrollHorizontal('left')}
                style={{
                  padding: '0.22rem 0.5rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: isDark ? '#cbd5e1' : '#334155',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
                title="Cuộn bảng tính sang trái (hoặc lăn con lăn chuột tại thanh đáy)"
              >
                ◀ Cuộn trái
              </button>
              <div style={{ width: '1px', height: '12px', backgroundColor: isDark ? '#2d3748' : '#cbd5e1' }} />
              <button
                onClick={() => handleScrollHorizontal('right')}
                style={{
                  padding: '0.22rem 0.5rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: isDark ? '#cbd5e1' : '#334155',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
                title="Cuộn bảng tính sang phải (hoặc lăn con lăn chuột tại thanh đáy)"
              >
                Cuộn phải ▶
              </button>
            </div>
            {/* Chọn số dòng mỗi trang */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                backgroundColor: isDark ? '#1a202c' : '#ffffff',
                border: isDark ? '1px solid #2d3748' : '1px solid #cbd5e1',
                color: isDark ? '#f8fafc' : '#0f172a',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            >
              <option value={50}>50 dòng/trang</option>
              <option value={100}>100 dòng/trang</option>
              <option value={200}>200 dòng/trang</option>
              <option value={500}>500 dòng/trang</option>
            </select>

            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1 || loading}
              style={{
                padding: '0.25rem 0.45rem',
                borderRadius: '4px',
                backgroundColor: isDark ? '#1a202c' : '#ffffff',
                border: isDark ? '1px solid #2d3748' : '1px solid #cbd5e1',
                color: currentPage <= 1 ? (isDark ? '#4b5563' : '#94a3b8') : (isDark ? '#e2e8f0' : '#334155'),
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
              }}
              title="Về trang đầu"
            >
              <ChevronsLeft size={14} />
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1 || loading}
              style={{
                padding: '0.25rem 0.45rem',
                borderRadius: '4px',
                backgroundColor: isDark ? '#1a202c' : '#ffffff',
                border: isDark ? '1px solid #2d3748' : '1px solid #cbd5e1',
                color: currentPage <= 1 ? (isDark ? '#4b5563' : '#94a3b8') : (isDark ? '#e2e8f0' : '#334155'),
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
              }}
              title="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Nhập số trang nhảy nhanh */}
            <form onSubmit={handleJumpPage} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <input
                type="text"
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                style={{
                  width: '42px',
                  backgroundColor: isDark ? '#1a202c' : '#ffffff',
                  border: isDark ? '1px solid #2d3748' : '1px solid #cbd5e1',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  textAlign: 'center',
                  fontSize: '0.72rem',
                  padding: '0.25rem 0',
                  borderRadius: '4px'
                }}
              />
            </form>

            <button
              onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
              disabled={currentPage >= pagination.totalPages || loading}
              style={{
                padding: '0.25rem 0.45rem',
                borderRadius: '4px',
                backgroundColor: isDark ? '#1a202c' : '#ffffff',
                border: isDark ? '1px solid #2d3748' : '1px solid #cbd5e1',
                color: currentPage >= pagination.totalPages ? (isDark ? '#4b5563' : '#94a3b8') : (isDark ? '#e2e8f0' : '#334155'),
                cursor: currentPage >= pagination.totalPages ? 'not-allowed' : 'pointer'
              }}
              title="Trang sau"
            >
              <ChevronRight size={14} />
            </button>

            <button
              onClick={() => setCurrentPage(pagination.totalPages)}
              disabled={currentPage >= pagination.totalPages || loading}
              style={{
                padding: '0.25rem 0.45rem',
                borderRadius: '4px',
                backgroundColor: isDark ? '#1a202c' : '#ffffff',
                border: isDark ? '1px solid #2d3748' : '1px solid #cbd5e1',
                color: currentPage >= pagination.totalPages ? (isDark ? '#4b5563' : '#94a3b8') : (isDark ? '#e2e8f0' : '#334155'),
                cursor: currentPage >= pagination.totalPages ? 'not-allowed' : 'pointer'
              }}
              title="Đến trang cuối"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
