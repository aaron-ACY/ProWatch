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
  SlidersHorizontal,
  ChevronDown,
  Gauge,
  Clock,
  Sparkles,
  Check
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
import { useLanguage } from '@/context/LanguageContext';

interface ModelsTabProps {
  models: AIModel[];
}

export const ModelsTab: React.FC<ModelsTabProps> = ({ models }) => {
  const { t, language } = useLanguage();
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0]?.id || '');
  const activeModel = models.find((m) => m.id === selectedModelId) || models[0];

  // Đồng bộ selectedModelId khi danh sách models thay đổi (ví dụ n8n vừa train xong model mới)
  useEffect(() => {
    if (models.length > 0 && !models.some((m) => m.id === selectedModelId)) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);

  // Format nhãn confusion matrix theo ngôn ngữ
  const getFormattedMatrixLabel = (label: string, lang: 'vi' | 'en') => {
    if (lang === 'vi') return label;
    if (label.includes('Low')) return 'Low';
    if (label.includes('Medium')) return 'Medium';
    if (label.includes('High')) return 'High';
    return label;
  };

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
      { metric: language === 'vi' ? 'Độ chính xác (Acc)' : 'Accuracy (Acc)', current: acc, baseline: 90 },
      { metric: language === 'vi' ? 'Tốc độ suy luận' : 'Inference Speed', current: speedScore, baseline: 88 },
      { metric: language === 'vi' ? 'Tiết kiệm RAM' : 'RAM Efficiency', current: ramScore, baseline: 82 },
      { metric: language === 'vi' ? 'Gọn nhẹ Size' : 'Compact Size', current: sizeScore, baseline: 80 },
      { metric: 'F1-Score', current: f1, baseline: 88 },
      { metric: language === 'vi' ? 'Độ thu hồi (Recall)' : 'Recall', current: recall, baseline: 87 }
    ];
  };

  const radarData = calcRadarData(activeModel);
  const matrixLabels = activeModel.metrics.confusion_matrix.labels;
  const numLabels = matrixLabels.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none">

      {/* 1. HERO HEADER: Nền trắng, viền zinc, thanh lịch theo DESIGN.md */}
      <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight leading-snug truncate">
            {activeModel.name}
          </h1>

          <div className="flex items-center gap-2 text-xs text-zinc-600 flex-wrap">
            <span className="flex items-center gap-1">
              <span>{t('models.version')}</span>
              <code className="font-mono font-semibold px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-800 text-[11px]">
                {activeModel.version}
              </code>
            </span>
            <span className="text-zinc-300">•</span>
            <span className="flex items-center gap-1">
              <span>{t('models.algorithm')}</span>
              <code className="font-mono font-medium px-1.5 py-0.5 rounded bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px]">
                {activeModel.algorithm.includes('TinyML MLP') ? 'TinyML MLP' : activeModel.algorithm}
              </code>
            </span>
            <span className="text-zinc-300">•</span>
            <span className="flex items-center gap-1 text-zinc-500">
              <Clock size={12} className="text-zinc-400" />
              <span>{t('models.trained')}</span>
              <span className="font-mono text-zinc-700 font-medium">
                {activeModel.trained_at ? activeModel.trained_at.replace('T', ' ').split('.')[0] : '2026-10-29 20:50:30'}
              </span>
            </span>
            {activeModel.training_samples && (
              <>
                <span className="text-zinc-300">•</span>
                <span className="text-zinc-500">
                  {t('models.samples')} <span className="font-mono font-medium text-zinc-700">{activeModel.training_samples.toLocaleString()}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Bộ chọn phiên bản (Model Selector) */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <label htmlFor="model-select" className="text-xs font-medium text-zinc-600">
            {t('models.selectVersion')}
          </label>
          <div className="relative">
            <select
              id="model-select"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="appearance-none bg-white border border-zinc-300 text-zinc-900 text-xs font-medium rounded-md py-2 pl-3 pr-8 shadow-2xs hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-700/20 focus:border-cyan-700 cursor-pointer min-w-[280px] transition-colors"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} className="text-zinc-900 bg-white">
                  {m.name} ({m.version})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. 6 THÔNG SỐ ĐÁNH GIÁ MÔ HÌNH CỐT LÕI (CORE KPIS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <Gauge size={16} className="text-cyan-700" />
              <span>{t('models.coreKpisTitle')}</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {t('models.coreKpisSubtitle')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Card 1: Accuracy */}
          <div className="bg-white border border-zinc-200 rounded-md p-4 shadow-xs hover:border-zinc-300 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-600">
                {t('models.kpiAccuracy')}
              </span>
              <div
                className="w-7 h-7 rounded border flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(35, 191, 92, 0.1)',
                  borderColor: 'rgba(35, 191, 92, 0.35)',
                  color: '#23BF5C'
                }}
              >
                <Award size={15} />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-mono text-3xl font-semibold tabular-nums" style={{ color: '#23BF5C' }}>
                {(activeModel.benchmarks.accuracy * 100).toFixed(1)}%
              </span>
            </div>
            {/* Progress bar phẳng theo DESIGN.md */}
            <div className="w-full h-1.5 bg-zinc-100 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, activeModel.benchmarks.accuracy * 100)}%`,
                  backgroundColor: '#23BF5C'
                }}
              />
            </div>
          </div>

          {/* Card 2: Inference Time */}
          <div className="bg-white border border-zinc-200 rounded-md p-4 shadow-xs hover:border-zinc-300 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-600">
                {t('models.kpiInference')}
              </span>
              <div className="w-7 h-7 rounded bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center flex-shrink-0">
                <Zap size={15} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="font-mono text-3xl font-semibold text-zinc-900 tabular-nums">
                {activeModel.benchmarks.inference_time.split(' ')[0]}
              </span>
              <span className="font-mono text-xs text-zinc-500 font-medium">
                ms / sample
              </span>
            </div>
            <div className="mt-2.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-50 border border-cyan-200 text-cyan-800">
                {t('models.realtimeReady')}
              </span>
            </div>
          </div>

          {/* Card 3: Model Size */}
          <div className="bg-white border border-zinc-200 rounded-md p-4 shadow-xs hover:border-zinc-300 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-600">
                {t('models.kpiModelSize')}
              </span>
              <div className="w-7 h-7 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center flex-shrink-0">
                <HardDrive size={15} />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-mono text-2xl font-semibold text-zinc-900 tabular-nums">
                {activeModel.benchmarks.model_size.split('(')[0].trim()}
              </span>
            </div>
            <div className="mt-2.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 border border-zinc-200 text-zinc-700">
                {activeModel.benchmarks.model_size.includes('(') ? activeModel.benchmarks.model_size.split('(')[1].replace(')', '') : 'Edge / Cloud'}
              </span>
            </div>
          </div>

          {/* Card 4: RAM Usage */}
          <div className="bg-white border border-zinc-200 rounded-md p-4 shadow-xs hover:border-zinc-300 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-600">
                {t('models.kpiRam')}
              </span>
              <div className="w-7 h-7 rounded bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Cpu size={15} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="font-mono text-3xl font-semibold text-zinc-900 tabular-nums">
                {activeModel.benchmarks.ram_usage.split(' ')[0]}
              </span>
              <span className="font-mono text-xs text-zinc-500 font-medium">
                {activeModel.benchmarks.ram_usage.split(' ')[1] || 'KB'}
              </span>
            </div>
            <div className="mt-2.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 border border-amber-200 text-amber-800">
                {t('models.ramUsageDetail')}
              </span>
            </div>
          </div>

          {/* Card 5: Preprocessing */}
          <div className="bg-white border border-zinc-200 rounded-md p-4 shadow-xs hover:border-zinc-300 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-600">
                {t('models.kpiPreproc')}
              </span>
              <div className="w-7 h-7 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center flex-shrink-0">
                <Layers size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="bg-zinc-50 border border-zinc-200 rounded p-2 text-xs font-mono font-medium text-zinc-800 leading-relaxed line-clamp-2" title={activeModel.benchmarks.preprocessing}>
                {language === 'en' ? activeModel.benchmarks.preprocessing.replace('đặc trưng sinh tồn', 'vital features') : activeModel.benchmarks.preprocessing}
              </div>
            </div>
          </div>

          {/* Card 6: Normalization */}
          <div className="bg-white border border-zinc-200 rounded-md p-4 shadow-xs hover:border-zinc-300 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-600">
                {t('models.kpiNorm')}
              </span>
              <div className="w-7 h-7 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center flex-shrink-0">
                <Filter size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="bg-zinc-50 border border-zinc-200 rounded p-2 text-xs font-mono font-medium text-zinc-800 leading-relaxed line-clamp-2" title={activeModel.benchmarks.normalization}>
                {language === 'en' ? activeModel.benchmarks.normalization.replace('Fit trên Train Set', 'Fit on Train Set') : activeModel.benchmarks.normalization}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. ROW: RADAR CHART & CONFUSION MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Radar Chart: Đánh giá đa chiều */}
        <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-xs flex flex-col h-[430px]">
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <BarChart3 size={16} className="text-cyan-700" />
                <span>{t('models.radarTitle')}</span>
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-zinc-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-700" />
                  <span>{activeModel.name.split(' ')[0]}</span>
                </span>
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span>Baseline</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#e4e4e7" />
                <PolarAngleAxis dataKey="metric" stroke="#52525b" fontSize={11} tick={{ fill: '#52525b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={10} tick={{ fill: '#71717a' }} />
                <Radar
                  name={activeModel.name}
                  dataKey="current"
                  stroke="#0e7490"
                  fill="#0e7490"
                  fillOpacity={0.2}
                />
                <Radar
                  name="Baseline Model"
                  dataKey="baseline"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.08}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e4e4e7',
                    color: '#18181b',
                    borderRadius: '6px',
                    fontSize: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confusion Matrix */}
        <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-xs flex flex-col justify-between h-[430px]">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              {t('models.cmTitle')}
            </h3>
          </div>

          <div className="my-auto py-2 overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-center text-xs">
              <thead>
                <tr>
                  <th className="w-2/5 py-2 px-3 text-left text-xs font-medium text-zinc-500 truncate border-r border-b border-zinc-200">
                    {t('models.cmActualPred')}
                  </th>
                  {matrixLabels.map((l, idx) => (
                    <th
                      key={l}
                      className={`py-2 px-2 text-center text-xs font-semibold text-zinc-700 bg-zinc-50/70 border-b border-zinc-200 truncate ${idx < matrixLabels.length - 1 ? 'border-r border-zinc-200' : ''
                        }`}
                      title={l}
                    >
                      {getFormattedMatrixLabel(l, language)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeModel.metrics.confusion_matrix.matrix.map((row, rIdx) => {
                  const isLastRow = rIdx === activeModel.metrics.confusion_matrix.matrix.length - 1;
                  return (
                    <tr key={rIdx}>
                      <td
                        className={`py-2.5 px-3 text-left text-xs font-semibold text-zinc-700 truncate border-r border-zinc-200 ${!isLastRow ? 'border-b border-zinc-200' : ''
                          }`}
                        title={matrixLabels[rIdx]}
                      >
                        {getFormattedMatrixLabel(matrixLabels[rIdx], language)}
                      </td>
                      {row.map((val, cIdx) => {
                        const isDiagonal = rIdx === cIdx;
                        const isLastCol = cIdx === row.length - 1;
                        return (
                          <td
                            key={cIdx}
                            className={`py-2.5 px-2 font-mono text-xs transition-colors ${!isLastRow ? 'border-b border-zinc-200' : ''
                              } ${!isLastCol ? 'border-r border-zinc-200' : ''
                              } ${isDiagonal
                                ? 'bg-emerald-50/80 text-emerald-800 font-bold'
                                : val > 0
                                  ? 'bg-red-50/80 text-red-700 font-medium'
                                  : 'bg-zinc-50/40 text-zinc-400'
                              }`}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-zinc-200 pt-3 flex items-center justify-between text-xs text-zinc-600 flex-wrap gap-2">
            <span>
              Precision: <strong className="font-mono font-semibold text-zinc-900 ml-1">{(activeModel.metrics.precision * 100).toFixed(1)}%</strong>
            </span>
            <span>
              Recall: <strong className="font-mono font-semibold text-zinc-900 ml-1">{(activeModel.metrics.recall * 100).toFixed(1)}%</strong>
            </span>
            <span>
              F1-score: <strong className="font-mono font-semibold text-zinc-900 ml-1">{(activeModel.metrics.f1_score * 100).toFixed(1)}%</strong>
            </span>
          </div>
        </div>

      </div>

      {/* 4. COMPARISON TABLE ACROSS ALL MODELS */}
      <div className="bg-white border border-zinc-200 rounded-md shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 flex justify-between items-center bg-white">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              {language === 'vi' ? 'Bảng tổng hợp benchmark kỹ thuật (Full model benchmark matrix)' : 'Full Model Benchmark Matrix'}
            </h3>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-medium">
                <th className="py-2.5 px-3.5 whitespace-nowrap">{t('models.thModel')}</th>
                <th className="py-2.5 px-3 whitespace-nowrap">{t('models.thPreproc')}</th>
                <th className="py-2.5 px-3 whitespace-nowrap">{t('models.thNorm')}</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">{t('models.thSize')}</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">{t('models.thRam')}</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">{t('models.thLatency')}</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">{t('models.thAcc')}</th>
                <th className="py-2.5 px-3.5 text-center whitespace-nowrap">{t('models.thStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {models.map((m) => {
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
                    className="hover:bg-zinc-50/80 transition-colors"
                  >
                    {/* 1. Model & Architecture */}
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-zinc-900 truncate" title={m.name}>
                        {m.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5">
                        <code className="font-mono text-zinc-700 bg-zinc-100 border border-zinc-200 px-1 py-0.2 rounded text-[10px]">
                          {m.version}
                        </code>
                        <span>•</span>
                        <span>{m.algorithm.includes('TinyML MLP') ? 'TinyML MLP' : m.algorithm}</span>
                      </div>
                    </td>

                    {/* 2. Preprocessing */}
                    <td className="py-3 px-3">
                      <div className="font-mono text-zinc-800 text-[11px] truncate max-w-[160px]" title={m.benchmarks.preprocessing}>
                        {prepMain}
                      </div>
                      {prepSub && (
                        <div className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[160px]" title={prepSub}>
                          {prepSub}
                        </div>
                      )}
                    </td>

                    {/* 3. Normalization */}
                    <td className="py-3 px-3">
                      <div className="font-mono text-zinc-800 text-[11px] truncate max-w-[150px]" title={m.benchmarks.normalization}>
                        {normMain}
                      </div>
                      {normSub && (
                        <div className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[150px]" title={normSub}>
                          {language === 'en' ? normSub.replace('Fit trên Train Set', 'Fit on Train Set') : normSub}
                        </div>
                      )}
                    </td>

                    {/* 4. Size */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="font-mono font-medium text-zinc-800 text-xs">
                        {sizeVal}
                      </div>
                      {sizeTag && (
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {sizeTag}
                        </div>
                      )}
                    </td>

                    {/* 5. RAM */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="font-mono font-medium text-zinc-800 text-xs">
                        {ramVal}
                      </div>
                    </td>

                    {/* 6. Latency */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="font-mono font-medium text-zinc-800 text-xs">
                        {infVal.split('/')[0].trim()}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        ms
                      </div>
                    </td>

                    {/* 7. Accuracy (Màu xanh chuẩn #23BF5C) */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="font-mono font-bold text-sm" style={{ color: '#23BF5C' }}>
                        {(m.benchmarks.accuracy * 100).toFixed(1)}%
                      </span>
                    </td>

                    {/* 8. Status (Màu xanh chuẩn #23BF5C cho Active) */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      {m.is_active ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border"
                          style={{
                            backgroundColor: 'rgba(35, 191, 92, 0.08)',
                            borderColor: 'rgba(35, 191, 92, 0.35)',
                            color: '#23BF5C'
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#23BF5C' }} />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                          <span>Archived</span>
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
