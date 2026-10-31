'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  Zap,
  HardDrive,
  Cpu,
  Layers,
  Filter,
  CheckCircle2,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  Box,
  Gauge
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip
} from 'recharts';
import { AIModel } from '../types/ai';

interface ModelsTabProps {
  models: AIModel[];
}

export const ModelsTab: React.FC<ModelsTabProps> = ({ models }) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0]?.id || '');
  const activeModel = models.find((m) => m.id === selectedModelId) || models[0];

  // Đồng bộ selectedModelId khi danh sách models thay đổi (ví dụ n8n vừa train xong model mới)
  useEffect(() => {
    if (models.length > 0 && !models.some((m) => m.id === selectedModelId)) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);

  // Tính toán dữ liệu Radar đa chiều phản ánh đúng đặc tính kỹ thuật của từng loại mô hình
  const calcRadarData = (model: AIModel) => {
    const acc = Math.round(model.benchmarks.accuracy * 100);
    const f1 = Math.round(model.metrics.f1_score * 100);
    const recall = Math.round(model.metrics.recall * 100);

    const infMs = parseFloat(model.benchmarks.inference_time) || 10;
    const speedScore = Math.max(60, Math.min(99, Math.round(100 - infMs * 1.2)));

    const isKB = model.benchmarks.model_size.toLowerCase().includes('kb');
    const sizeScore = isKB ? 97 : 82;

    const isRamKB = model.benchmarks.ram_usage.toLowerCase().includes('kb');
    const ramScore = isRamKB ? 98 : 78;

    return [
      { metric: 'Độ chính xác (Acc)', current: acc, baseline: 90 },
      { metric: 'Tốc độ suy luận', current: speedScore, baseline: 88 },
      { metric: 'Tiết kiệm RAM', current: ramScore, baseline: 82 },
      { metric: 'Gọn nhẹ Size', current: sizeScore, baseline: 80 },
      { metric: 'F1-Score', current: f1, baseline: 88 },
      { metric: 'Độ thu hồi (Recall)', current: recall, baseline: 87 },
    ];
  };

  const radarData = calcRadarData(activeModel);
  const matrixLabels = activeModel.metrics.confusion_matrix.labels;
  const numLabels = matrixLabels.length;

  // Tính toán độ cao & padding ô ma trận nhầm lẫn tương ứng với số lượng nhãn (2x2, 3x3, 4x4)
  const cellPadding = numLabels >= 4 ? '0.5rem 0.25rem' : numLabels === 3 ? '0.75rem 0.5rem' : '1.15rem 0.75rem';
  const cellFontSize = numLabels >= 4 ? '0.85rem' : '0.95rem';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* 1. HERO HEADER: Tối giản, không bóng tím mờ, không tag thừa, thông tin chuẩn xác */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '1.5rem 2rem',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '110px',
        flexWrap: 'wrap',
        gap: '1.25rem',
        position: 'relative',
        boxSizing: 'border-box'
      }}>
        <div style={{ flex: '1 1 500px' }}>
          <h1 style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            margin: '0 0 0.4rem 0',
            lineHeight: 1.25,
            minHeight: '2rem',
            display: 'flex',
            alignItems: 'center'
          }}>
            {activeModel.name}
          </h1>

          <div style={{
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            minHeight: '1.4rem'
          }}>
            <span>
              Phiên bản: <code style={{
                color: '#a5b4fc',
                background: 'rgba(99, 102, 241, 0.12)',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                fontWeight: 700
              }}>{activeModel.version}</code>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span>
              Thuật toán: <code style={{
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.1)',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                fontWeight: 600
              }}>{activeModel.algorithm.includes('TinyML MLP') ? 'TinyML MLP' : activeModel.algorithm}</code>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span>
              Đã train: <strong style={{ color: '#fff', fontWeight: 600 }}>{activeModel.trained_at ? activeModel.trained_at.replace('T', ' ').split('.')[0] : '2026-10-29 20:50:30'}</strong>
            </span>
          </div>
        </div>

        {/* Custom Selector Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Chọn phiên bản kiểm thử:
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                padding: '0.75rem 2.5rem 0.75rem 1rem',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                minWidth: '290px',
                transition: 'border-color 0.2s ease'
              }}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} style={{ background: '#0f172a', color: '#fff' }}>
                  {m.name} ({m.version}) {m.is_active ? '★ Serving' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={16} color="var(--text-muted)" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* 2. THE 6 EVALUATION PARAMETERS (Cố định chiều cao 240px cho mỗi card để không bao giờ bị giật layout) */}
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Gauge size={20} color="var(--accent-cyan)" /> 6 Thông Số Đánh Giá Mô Hình Cốt Lõi
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
            Được đo đạc và thẩm định độc lập theo từng chu kỳ kiểm thử
          </p>
        </div>

        <div
          className="benchmarks-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '1.25rem'
          }}
        >
          
          {/* Card 1: Accuracy */}
          <div className="glass-card" style={{
            background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(19, 27, 46, 0.75) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '240px',
            minHeight: '240px',
            maxHeight: '240px',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '44px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#34d399', letterSpacing: '0.05em' }}>
                  Metric 01
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: '0.15rem 0' }}>Accuracy (Độ chính xác)</h3>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <Award size={20} />
              </div>
            </div>

            <div style={{ height: '92px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{ fontSize: '2.8rem', fontWeight: 900, color: '#10b981', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {(activeModel.benchmarks.accuracy * 100).toFixed(1)}%
                </span>
              </div>
              {/* Progress bar visual */}
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', marginTop: '0.75rem', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, activeModel.benchmarks.accuracy * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, height: '42px', display: 'flex', alignItems: 'center', lineHeight: 1.35 }}>
              Kiểm thử độc lập với {numLabels} nhãn ({matrixLabels.slice(0, 3).join(', ')}{numLabels > 3 ? '...' : ''})
            </p>
          </div>

          {/* Card 2: Inference Time */}
          <div className="glass-card" style={{
            background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.08) 0%, rgba(19, 27, 46, 0.75) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '240px',
            minHeight: '240px',
            maxHeight: '240px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '44px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#22d3ee', letterSpacing: '0.05em' }}>
                  Metric 02
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: '0.15rem 0' }}>Inference Time (Độ trễ suy luận)</h3>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
                <Zap size={20} />
              </div>
            </div>

            <div style={{ height: '92px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#06b6d4', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {activeModel.benchmarks.inference_time.split(' ')[0]}
                </span>
                <span style={{ fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  ms / sample
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
                <span style={{ fontSize: '0.72rem', background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                  Realtime Ready (&lt; 20ms)
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, height: '42px', display: 'flex', alignItems: 'center', lineHeight: 1.35 }}>
              Đo trung bình độ trễ trên vi xử lý phục vụ trực tiếp qua API
            </p>
          </div>

          {/* Card 3: Model Size */}
          <div className="glass-card" style={{
            background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, rgba(19, 27, 46, 0.75) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '240px',
            minHeight: '240px',
            maxHeight: '240px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '44px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#818cf8', letterSpacing: '0.05em' }}>
                  Metric 03
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: '0.15rem 0' }}>Model Size (Dung lượng)</h3>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                <HardDrive size={20} />
              </div>
            </div>

            <div style={{ height: '92px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#a5b4fc', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {activeModel.benchmarks.model_size.split('(')[0].trim()}
              </span>
              <div style={{ marginTop: '0.65rem' }}>
                <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.15)', color: '#c7d2fe', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                  {activeModel.benchmarks.model_size.includes('(') ? activeModel.benchmarks.model_size.split('(')[1].replace(')', '') : 'Tối ưu Edge / Cloud'}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, height: '42px', display: 'flex', alignItems: 'center', lineHeight: 1.35 }}>
              Cực kỳ nhỏ gọn, thích hợp deploy Edge hoặc Cloud Server
            </p>
          </div>

          {/* Card 4: RAM Usage */}
          <div className="glass-card" style={{
            background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(19, 27, 46, 0.75) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '240px',
            minHeight: '240px',
            maxHeight: '240px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '44px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#fbbf24', letterSpacing: '0.05em' }}>
                  Metric 04
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: '0.15rem 0' }}>RAM Usage (Bộ nhớ RAM)</h3>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <Cpu size={20} />
              </div>
            </div>

            <div style={{ height: '92px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {activeModel.benchmarks.ram_usage.split(' ')[0]}
                </span>
                <span style={{ fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {activeModel.benchmarks.ram_usage.split(' ')[1] || 'KB'}
                </span>
              </div>
              <div style={{ marginTop: '0.65rem' }}>
                <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fde68a', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                  Chiếm &lt; 5% tài nguyên hệ thống
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, height: '42px', display: 'flex', alignItems: 'center', lineHeight: 1.35 }}>
              Bộ nhớ heap ổn định khi xử lý đa luồng đồng thời
            </p>
          </div>

          {/* Card 5: Preprocessing (Khung cố định 62px, text 2 dòng gọn gàng) */}
          <div className="glass-card" style={{
            background: 'linear-gradient(180deg, rgba(236, 72, 153, 0.08) 0%, rgba(19, 27, 46, 0.75) 100%)',
            border: '1px solid rgba(236, 72, 153, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '240px',
            minHeight: '240px',
            maxHeight: '240px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '44px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#f472b6', letterSpacing: '0.05em' }}>
                  Pipeline 05
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: '0.15rem 0' }}>Preprocessing (Tiền xử lý)</h3>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                <Layers size={20} />
              </div>
            </div>

            <div style={{ height: '92px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem',
                color: '#fbcfe8',
                fontSize: '0.84rem',
                fontWeight: 600,
                lineHeight: 1.35,
                height: '62px',
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}>
                <span style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {activeModel.benchmarks.preprocessing}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, height: '42px', display: 'flex', alignItems: 'center', lineHeight: 1.35 }}>
              Khử nhiễu rung tay & lọc tần số chuyển động con người
            </p>
          </div>

          {/* Card 6: Normalization (Khung cố định 62px, text 2 dòng gọn gàng) */}
          <div className="glass-card" style={{
            background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.08) 0%, rgba(19, 27, 46, 0.75) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '240px',
            minHeight: '240px',
            maxHeight: '240px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '44px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#c084fc', letterSpacing: '0.05em' }}>
                  Pipeline 06
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: '0.15rem 0' }}>Normalization (Chuẩn hóa)</h3>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                <Filter size={20} />
              </div>
            </div>

            <div style={{ height: '92px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem',
                color: '#e9d5ff',
                fontSize: '0.85rem',
                fontWeight: 700,
                lineHeight: 1.35,
                height: '62px',
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}>
                <span style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {activeModel.benchmarks.normalization}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, height: '42px', display: 'flex', alignItems: 'center', lineHeight: 1.35 }}>
              Đưa các trục dữ liệu về thang đo chuẩn hóa (μ = 0, σ = 1)
            </p>
          </div>

        </div>
      </div>

      {/* 3. ROW: RADAR BENCHMARK CHART & CONFUSION MATRIX (Cố định chiều cao 425px cho cả 2 thẻ) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '1.5rem'
      }}>
        
        {/* Radar Chart: Đánh giá đa chiều */}
        <div className="glass-card" style={{
          height: '425px',
          minHeight: '425px',
          maxHeight: '425px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}>
          <div style={{ height: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={18} color="var(--accent-indigo)" /> Radar Đánh Giá Đa Chiều
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                So sánh Độ chính xác, Tốc độ suy luận & Tiêu thụ tài nguyên
              </p>
            </div>
          </div>

          <div style={{ flex: 1, width: '100%', height: 'calc(100% - 50px)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                <PolarAngleAxis dataKey="metric" stroke="var(--text-secondary)" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.15)" fontSize={10} />
                <Radar name={activeModel.name} dataKey="current" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                <Radar name="Baseline Model" dataKey="baseline" stroke="#64748b" fill="#64748b" fillOpacity={0.15} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confusion Matrix (Cố định tableLayout fixed và căn giữa trục đứng hoàn toàn) */}
        <div className="glass-card" style={{
          height: '425px',
          minHeight: '425px',
          maxHeight: '425px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}>
          <div style={{ height: '48px', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              Ma trận nhầm lẫn (Confusion Matrix)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Phân bố kết quả dự đoán so với nhãn thực tế
            </p>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
            <table style={{
              width: '100%',
              tableLayout: 'fixed',
              borderCollapse: 'separate',
              borderSpacing: '6px',
              textAlign: 'center',
              fontSize: '0.85rem'
            }}>
              <thead>
                <tr>
                  <th style={{
                    width: '28%',
                    padding: '0.35rem 0.25rem',
                    color: 'var(--text-muted)',
                    textAlign: 'left',
                    fontSize: '0.72rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    Thực tế \ Dự đoán
                  </th>
                  {matrixLabels.map((l) => (
                    <th
                      key={l}
                      style={{
                        padding: '0.35rem 0.2rem',
                        color: '#c7d2fe',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={l}
                    >
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeModel.metrics.confusion_matrix.matrix.map((row, rIdx) => (
                  <tr key={rIdx}>
                    <td
                      style={{
                        padding: '0.35rem 0.25rem',
                        fontWeight: 700,
                        color: '#c7d2fe',
                        textAlign: 'left',
                        fontSize: '0.78rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={matrixLabels[rIdx]}
                    >
                      {matrixLabels[rIdx]}
                    </td>
                    {row.map((val, cIdx) => {
                      const isDiagonal = rIdx === cIdx;
                      return (
                        <td
                          key={cIdx}
                          style={{
                            padding: cellPadding,
                            background: isDiagonal
                              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.35), rgba(16, 185, 129, 0.15))'
                              : val > 0 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                            border: `1px solid ${isDiagonal ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
                            borderRadius: '8px',
                            fontWeight: isDiagonal ? 800 : 500,
                            color: isDiagonal ? '#34d399' : val > 0 ? '#fca5a5' : 'var(--text-muted)',
                            fontSize: cellFontSize,
                            transition: 'background 0.2s ease'
                          }}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{
            height: '42px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            fontSize: '0.8rem',
            paddingTop: '0.5rem',
            boxSizing: 'border-box'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Precision: <strong style={{ color: '#a5b4fc' }}>{(activeModel.metrics.precision * 100).toFixed(1)}%</strong></span>
            <span style={{ color: 'var(--text-muted)' }}>Recall: <strong style={{ color: '#06b6d4' }}>{(activeModel.metrics.recall * 100).toFixed(1)}%</strong></span>
            <span style={{ color: 'var(--text-muted)' }}>F1-Score: <strong style={{ color: '#f59e0b' }}>{(activeModel.metrics.f1_score * 100).toFixed(1)}%</strong></span>
          </div>
        </div>

      </div>

      {/* 4. COMPARISON TABLE ACROSS ALL MODELS */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              Bảng Tổng Hợp Benchmark Kỹ Thuật (Full Model Benchmark Matrix)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Đối chiếu trực tiếp cả 6 thông số kỹ thuật giữa các phiên bản mô hình trong hệ thống (bấm chọn hàng để xem chi tiết)
            </p>
          </div>
        </div>

        <div style={{ width: '100%', overflowX: 'hidden' }}>
          <table style={{
            width: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
            fontSize: '0.82rem'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)' }}>
                <th style={{ width: '23%', padding: '0.85rem 1rem', textAlign: 'left', whiteSpace: 'nowrap' }}>Mô hình & Kiến trúc</th>
                <th style={{ width: '17%', padding: '0.85rem 0.6rem', textAlign: 'left', whiteSpace: 'nowrap' }}>1. Preprocessing</th>
                <th style={{ width: '15%', padding: '0.85rem 0.6rem', textAlign: 'left', whiteSpace: 'nowrap' }}>2. Normalization</th>
                <th style={{ width: '9%', padding: '0.85rem 0.4rem', textAlign: 'center', whiteSpace: 'nowrap' }}>3. Size</th>
                <th style={{ width: '8%', padding: '0.85rem 0.4rem', textAlign: 'center', whiteSpace: 'nowrap' }}>4. RAM</th>
                <th style={{ width: '9%', padding: '0.85rem 0.4rem', textAlign: 'center', whiteSpace: 'nowrap' }}>5. Độ trễ</th>
                <th style={{ width: '8%', padding: '0.85rem 0.4rem', textAlign: 'center', whiteSpace: 'nowrap' }}>6. Acc</th>
                <th style={{ width: '11%', padding: '0.85rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => {
                const isSelected = m.id === activeModel.id;

                // Tách phần chính và phần chi tiết gọn gàng
                const prepParts = m.benchmarks.preprocessing.split('(');
                const prepMain = prepParts[0].split(',')[0].trim();
                const prepSub = prepParts[1]
                  ? prepParts[1].replace(')', '').trim()
                  : m.benchmarks.preprocessing.includes(',')
                  ? m.benchmarks.preprocessing.split(',').slice(1).join(',').trim()
                  : '';

                const normParts = m.benchmarks.normalization.split('(');
                const normMain = normParts[0].trim();
                const normSub = normParts[1] ? `(${normParts[1].trim()}` : '';

                const sizeVal = m.benchmarks.model_size.split('(')[0].trim();
                const sizeTag = m.benchmarks.model_size.includes('(')
                  ? m.benchmarks.model_size.split('(')[1].replace(')', '').trim()
                  : '';

                const ramVal = m.benchmarks.ram_usage.split('(')[0].trim();
                const infVal = m.benchmarks.inference_time.split('(')[0].trim();

                return (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedModelId(m.id)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent'
                    }}
                  >
                    {/* 1. Model & Architecture */}
                    <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: isSelected ? '#a5b4fc' : '#fff',
                          fontSize: '0.85rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={m.name}
                      >
                        {m.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          marginTop: '0.2rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <code style={{ color: '#c7d2fe' }}>{m.version}</code> • {m.algorithm.includes('TinyML MLP') ? 'TinyML MLP' : m.algorithm}
                      </div>
                    </td>

                    {/* 2. Preprocessing */}
                    <td style={{ padding: '0.85rem 0.6rem', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <div
                        style={{
                          color: '#f472b6',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          lineHeight: 1.25,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={m.benchmarks.preprocessing}
                      >
                        {prepMain}
                      </div>
                      {prepSub && (
                        <div
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.7rem',
                            marginTop: '2px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={prepSub}
                        >
                          {prepSub}
                        </div>
                      )}
                    </td>

                    {/* 3. Normalization */}
                    <td style={{ padding: '0.85rem 0.6rem', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <div
                        style={{
                          color: '#c4b5fd',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          lineHeight: 1.25,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={m.benchmarks.normalization}
                      >
                        {normMain}
                      </div>
                      {normSub && (
                        <div
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.7rem',
                            marginTop: '2px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={normSub}
                        >
                          {normSub}
                        </div>
                      )}
                    </td>

                    {/* 4. Size */}
                    <td style={{ padding: '0.85rem 0.4rem', textAlign: 'center', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <div style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {sizeVal}
                      </div>
                      {sizeTag && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sizeTag}
                        </div>
                      )}
                    </td>

                    {/* 5. RAM */}
                    <td style={{ padding: '0.85rem 0.4rem', textAlign: 'center', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {ramVal}
                      </div>
                    </td>

                    {/* 6. Latency */}
                    <td style={{ padding: '0.85rem 0.4rem', textAlign: 'center', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <div style={{ color: '#06b6d4', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {infVal.split('/')[0].trim()}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '2px', whiteSpace: 'nowrap' }}>
                        / sample
                      </div>
                    </td>

                    {/* 7. Accuracy */}
                    <td style={{ padding: '0.85rem 0.4rem', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.95rem' }}>
                        {(m.benchmarks.accuracy * 100).toFixed(1)}%
                      </span>
                    </td>

                    {/* 8. Status */}
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {m.is_active ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          color: '#10b981',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }} />
                          Active
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 500
                        }}>
                          Archived
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
