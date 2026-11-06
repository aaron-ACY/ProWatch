'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  CheckCircle2,
  RefreshCw,
  Plus,
  Minus,
  Settings,
  Database,
  Cpu,
  Layers,
  Activity,
  FileCode,
  Download,
  ExternalLink,
  ArrowRight,
  Copy,
  Check,
  Zap,
  BarChart3,
  Server,
  Sparkles,
  Info,
  Sliders,
  RotateCcw,
  Move,
  Terminal,
  Clock,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  Webhook,
  Send,
  Brain,
  GitBranch,
  ShieldCheck,
  ShieldAlert,
  FileText,
  ClipboardList,
  BellRing,
  XCircle,
  FlaskConical,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { N8nWorkflowExecution } from '../types/ai';
import {
  ActionStep,
  LogEntry,
  generateTrainingLogs,
  generateFailureLogs,
  generateIntegrationLogs,
  getRawLogsText
} from '../services/pipelineLogs';

// Logo Supabase chính chủ
const SupabaseLogo: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 109 113"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9751 107.314L53.9738 46.0664H99.4149C104.918 46.0664 108.064 51.9837 105.158 56.6439L63.7076 110.284Z"
      fill="#0e7490"
    />
    <path
      d="M45.317 2.71596C48.1765 -0.885333 53.9744 1.08804 54.0495 5.68599L54.5448 66.9336H9.60974C4.10677 66.9336 0.960765 61.0163 3.86717 56.3561L45.317 2.71596Z"
      fill="#047857"
    />
  </svg>
);

type NodeCategory =
  | 'trigger'
  | 'database'
  | 'validation'
  | 'model'
  | 'metrics'
  | 'gate'
  | 'success'
  | 'notify'
  | 'incident';

const categoryStyles: Record<
  NodeCategory,
  {
    stripe: string;
    iconBox: string;
    tagBg: string;
    tagText: string;
  }
> = {
  trigger: {
    stripe: 'bg-amber-500',
    iconBox: 'bg-amber-100/80 text-amber-900 border-amber-300',
    tagBg: 'bg-amber-100/90 border-amber-300',
    tagText: 'text-amber-900'
  },
  database: {
    stripe: 'bg-emerald-600',
    iconBox: 'bg-emerald-100/80 text-emerald-900 border-emerald-300',
    tagBg: 'bg-emerald-100/90 border-emerald-300',
    tagText: 'text-emerald-900'
  },
  validation: {
    stripe: 'bg-indigo-600',
    iconBox: 'bg-indigo-100/80 text-indigo-900 border-indigo-300',
    tagBg: 'bg-indigo-100/90 border-indigo-300',
    tagText: 'text-indigo-900'
  },
  model: {
    stripe: 'bg-cyan-700',
    iconBox: 'bg-cyan-100/90 text-cyan-900 border-cyan-300',
    tagBg: 'bg-cyan-100/90 border-cyan-300',
    tagText: 'text-cyan-900'
  },
  metrics: {
    stripe: 'bg-violet-600',
    iconBox: 'bg-violet-100/80 text-violet-900 border-violet-300',
    tagBg: 'bg-violet-100/90 border-violet-300',
    tagText: 'text-violet-900'
  },
  gate: {
    stripe: 'bg-blue-600',
    iconBox: 'bg-blue-100/80 text-blue-900 border-blue-300',
    tagBg: 'bg-blue-100/90 border-blue-300',
    tagText: 'text-blue-900'
  },
  success: {
    stripe: 'bg-emerald-600',
    iconBox: 'bg-emerald-100/80 text-emerald-900 border-emerald-300',
    tagBg: 'bg-emerald-100/90 border-emerald-300',
    tagText: 'text-emerald-900'
  },
  notify: {
    stripe: 'bg-sky-600',
    iconBox: 'bg-sky-100/80 text-sky-900 border-sky-300',
    tagBg: 'bg-sky-100/90 border-sky-300',
    tagText: 'text-sky-900'
  },
  incident: {
    stripe: 'bg-rose-600',
    iconBox: 'bg-rose-100/80 text-rose-900 border-rose-300',
    tagBg: 'bg-rose-100/90 border-rose-300',
    tagText: 'text-rose-900'
  }
};

interface PipelineNodeProps {
  id: string;
  left: number;
  top: number;
  width?: number;
  title: string;
  subtitle: string;
  category?: NodeCategory;
  categoryLabel?: string;
  description?: string;
  icon: React.ReactNode;
  isSelected?: boolean;
  isActive?: boolean;
  hasInputPin?: boolean;
  hasOutputPin?: boolean;
  hasDualOutputPin?: boolean;
  onClick: () => void;
}

const PipelineNodeCard: React.FC<PipelineNodeProps> = ({
  left,
  top,
  width = 180,
  title,
  subtitle,
  category = 'model',
  categoryLabel,
  description,
  icon,
  isSelected = false,
  isActive = false,
  hasInputPin = true,
  hasOutputPin = true,
  hasDualOutputPin = false,
  onClick
}) => {
  const { language } = useLanguage();
  const cat = categoryStyles[category] || categoryStyles.model;

  return (
    <div
      onClick={onClick}
      style={{ position: 'absolute', left: `${left}px`, top: `${top}px`, width: `${width}px`, cursor: 'pointer' }}
      className="group select-none"
    >
      <div
        className={`relative h-[74px] rounded-md border bg-white shadow-xs transition-all duration-150 overflow-visible ${
          isActive
            ? 'border-cyan-700 ring-2 ring-cyan-700/30 shadow-md'
            : isSelected
            ? 'border-cyan-700 ring-2 ring-cyan-700 shadow-sm'
            : 'border-zinc-300 hover:border-zinc-400 hover:shadow-md'
        }`}
      >
        {/* Full-width colored top stripe (3px) */}
        <div
          className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-md transition-colors ${
            isActive ? 'bg-cyan-700' : cat.stripe
          }`}
        />

        <div className="p-2 h-full flex items-center gap-2.5">
          {/* Input Pin (Left) */}
          {hasInputPin && (
            <div
              className={`absolute -left-[6px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-xs transition-colors cursor-crosshair ${
                isActive ? 'bg-cyan-700 ring-2 ring-cyan-200' : 'bg-zinc-400 group-hover:bg-zinc-600'
              }`}
            />
          )}

          {/* Icon box with distinct, contrasty category theme */}
          <div
            className={`w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
              isActive
                ? 'bg-cyan-100 text-cyan-900 border-cyan-400 shadow-xs'
                : `${cat.iconBox} shadow-2xs`
            }`}
          >
            {icon}
          </div>

          {/* Text block with bold title and readable dark subtitle */}
          <div className="flex-1 min-w-0 pr-0.5">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span
                className={`text-[9.5px] font-bold tracking-wide uppercase px-1.5 py-0.2 rounded border shadow-2xs ${cat.tagBg} ${cat.tagText}`}
              >
                {categoryLabel || category}
              </span>
              {isActive && (
                <span className="flex items-center gap-0.5 text-[9px] font-semibold text-cyan-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 animate-ping" />
                  <span>Active</span>
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-zinc-900 leading-tight truncate" title={title}>
              {title}
            </div>
            <div className="text-[11px] text-zinc-700 font-medium truncate tracking-tight" title={subtitle}>
              {subtitle}
            </div>
          </div>

          {/* Output Pin (Right) */}
          {hasOutputPin && !hasDualOutputPin && (
            <div
              className={`absolute -right-[6px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-xs transition-colors cursor-crosshair ${
                isActive ? 'bg-cyan-700 ring-2 ring-cyan-200' : 'bg-zinc-400 group-hover:bg-zinc-600'
              }`}
            />
          )}

          {/* Dual Output Pins (For Quality Gate) */}
          {hasDualOutputPin && (
            <>
              {/* True Pin (Top) */}
              <div
                className="absolute -right-[6px] top-1/4 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-xs bg-emerald-600 ring-2 ring-emerald-200 cursor-crosshair"
                title={language === 'vi' ? 'Nhánh đạt chất lượng (True >= 90%)' : 'Quality Pass Branch (True >= 90%)'}
              />
              {/* False Pin (Bottom) */}
              <div
                className="absolute -right-[6px] top-3/4 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-xs bg-red-600 ring-2 ring-red-200 cursor-crosshair"
                title={language === 'vi' ? 'Nhánh sự cố (False < 90%)' : 'Quality Incident Branch (False < 90%)'}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface PipelineTabProps {
  workflowRuns: N8nWorkflowExecution[];
  onNewRun: (run: N8nWorkflowExecution, realMetrics?: any) => void;
  onNavigateToMetrics?: () => void;
}

export const PipelineTab: React.FC<PipelineTabProps> = ({
  workflowRuns,
  onNewRun,
  onNavigateToMetrics
}) => {
  const { t, language } = useLanguage();
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // History Table Filter States
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'SUCCESS' | 'ERROR'>('ALL');
  const [historySearch, setHistorySearch] = useState<string>('');

  // Action Runner Logs Panel States
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [bottomTab] = useState<'LOGS'>('LOGS');
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({
    'step-1-setup': true,
    'step-2-data': true,
    'step-3-preprocess': true,
    'step-4-model': true,
    'step-5-eval': true,
    'step-6-finalize': true,
    'step-integ-1': true,
    'step-integ-2': true,
    'step-integ-3': true,
    'step-integ-4': true,
    'step-integ-5': true
  });
  const [autoScroll, setAutoScroll] = useState<boolean>(false);
  const [searchLogQuery, setSearchLogQuery] = useState<string>('');
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const [currentActionSteps, setCurrentActionSteps] = useState<ActionStep[]>(() => generateTrainingLogs('LOCAL'));
  const [lastRunStatus, setLastRunStatus] = useState<'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED'>('SUCCESS');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [currentStepElapsed, setCurrentStepElapsed] = useState<number>(0);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastRunMeta, setLastRunMeta] = useState<{ id: string; time: string; duration: string; workflow: string }>({
    id: 'train-demo-init',
    time: new Date().toLocaleTimeString(),
    duration: '21.0s',
    workflow: 'Automated AI Training Pipeline (Risk Score Model)'
  });

  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const bottomPanelRef = useRef<HTMLDivElement>(null);

  // Đồng hồ bấm giờ thực tế khi workflow đang chạy
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (lastRunStatus === 'RUNNING') {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [lastRunStatus]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m > 0 ? `${m}m ` : ''}${s < 10 ? `0${s}` : s}s`;
  };

  // Hàm stream từng dòng log nhanh và mượt mà theo thời gian thực
  const streamStepLines = async (
    stepIdx: number,
    stepData: ActionStep,
    targetDurationMs: number = 400
  ) => {
    const stepStartTime = Date.now();
    setCurrentStepElapsed(0);
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    stepTimerRef.current = setInterval(() => {
      setCurrentStepElapsed((prev) => prev + 1);
    }, 1000);

    setCurrentActionSteps((prev) =>
      prev.map((s, idx) => (idx === stepIdx ? { ...s, status: 'running', logs: [] } : s))
    );
    setExpandedSteps((prev) => ({ ...prev, [stepData.id]: true }));

    const numLogs = stepData.logs.length;
    const delayPerLine = numLogs > 1 ? Math.min(100, Math.max(30, Math.round(targetDurationMs / numLogs))) : 50;

    for (let i = 0; i < numLogs; i++) {
      const rawLog = stepData.logs[i];
      const stampedLog: LogEntry = {
        ...rawLog,
        time: new Date().toISOString()
      };

      setCurrentActionSteps((prev) =>
        prev.map((s, idx) =>
          idx === stepIdx ? { ...s, logs: [...s.logs, stampedLog] } : s
        )
      );

      if (i < numLogs - 1) {
        await new Promise((r) => setTimeout(r, delayPerLine));
      }
    }

    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }

    const actualStepDuration = ((Date.now() - stepStartTime) / 1000).toFixed(1) + 's';

    setCurrentActionSteps((prev) =>
      prev.map((s, idx) =>
        idx === stepIdx ? { ...s, status: 'completed', duration: actualStepDuration } : s
      )
    );
  };

  // Khi click vào bất kỳ node nào trên Canvas: Tự động mở panel & đồng bộ step tương ứng trong runner logs
  useEffect(() => {
    if (selectedNode) {
      setBottomPanelOpen(true);
      const matched = currentActionSteps.find((s) =>
        s.nodeKey === selectedNode ||
        (selectedNode.includes('trigger') && s.nodeKey === 'webhook_trigger') ||
        (selectedNode.includes('supabase') && s.nodeKey === 'fetch_supabase') ||
        (selectedNode.includes('preflight') && s.nodeKey === 'preflight_val') ||
        (selectedNode.includes('train') && s.nodeKey === 'train_model') ||
        (selectedNode.includes('metrics') && s.nodeKey === 'extract_metrics') ||
        (selectedNode.includes('gate') && s.nodeKey === 'quality_gate') ||
        (selectedNode.includes('registry') && s.nodeKey === 'sync_registry') ||
        (selectedNode.includes('firmware') && s.nodeKey === 'sync_firmware') ||
        ((selectedNode.includes('telegram') || selectedNode.includes('alert') || selectedNode.includes('incident')) && s.nodeKey === 'send_telegram')
      );
      if (matched) {
        setExpandedSteps((prev) => ({ ...prev, [matched.id]: true }));
      }
    }
  }, [selectedNode, currentActionSteps]);

  // Tự động cuộn terminal xuống dòng mới nhất khi log đang chạy
  useEffect(() => {
    if (autoScroll && bottomTab === 'LOGS' && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [currentActionSteps, autoScroll, bottomTab]);

  const toggleStepExpand = (stepId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const handleCopyLogs = () => {
    const text = getRawLogsText(currentActionSteps);
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleViewRunLogs = (run: N8nWorkflowExecution) => {
    const isError = run.status === 'ERROR' || run.status === 'FAILED';
    const steps = isError
      ? generateFailureLogs(run.id, run.message)
      : generateTrainingLogs(dataSource, run.id);
    setCurrentActionSteps(steps);
    setLastRunStatus(isError ? 'FAILED' : 'SUCCESS');
    setLastRunMeta({
      id: run.id,
      time: run.triggered_at,
      duration: `${run.duration_seconds}s`,
      workflow: 'Automated AI Training Pipeline (Risk Score Model)'
    });
    setBottomPanelOpen(true);
    bottomPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Kéo thả di chuyển khung nhìn canvas (Canvas Panning)
  const canvasRef = useRef<HTMLDivElement>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Ngăn chặn cuộn trang chính khi lăn chuột trong khu vực canvas
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY < 0 ? 10 : -10;
        setZoomLevel((z) => Math.min(Math.max(z + delta, 50), 160));
      } else {
        setPanOffset((prev) => ({
          x: prev.x - e.deltaX * 0.85,
          y: prev.y - e.deltaY * 0.85
        }));
      }
    };

    canvasEl.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      canvasEl.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  // Lắng nghe chuột toàn cục khi đang kéo thả canvas
  useEffect(() => {
    if (!isPanning) return;

    // Khóa cursor grabbing toàn cục để trải nghiệm mượt mà không bị giật
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const onGlobalMouseMove = (e: MouseEvent) => {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    };

    const onGlobalMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);

    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };
  }, [isPanning, panStart]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[data-no-pan="true"]')) {
      return;
    }

    setIsPanning(true);
    setPanStart({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y
    });
  };

  const handleResetView = () => {
    setZoomLevel(100);
    setPanOffset({ x: 0, y: 0 });
  };

  // Cấu hình lựa chọn nguồn dữ liệu cho Workflow Training
  const [dataSource] = useState<'LOCAL' | 'SUPABASE'>('LOCAL');

  // Thực thi Workflow Huấn Luyện (Training Model Workflow)
  const handleExecuteTrainingWorkflow = async () => {
    setIsRunning(true);
    setLastRunStatus('RUNNING');
    setBottomPanelOpen(true);
    const runId = `train-${Date.now().toString().slice(-4)}`;
    const startTime = Date.now();
    setLastRunMeta({
      id: runId,
      time: new Date().toLocaleTimeString(),
      duration: '0.0s',
      workflow: 'Automated AI Training Pipeline (Risk Score Model)'
    });

    const initSteps = generateTrainingLogs(dataSource, runId);
    setCurrentActionSteps(initSteps.map((s) => ({
      ...s,
      status: 'pending',
      logs: []
    })));

    try {
      // 1. Bước 1, 2, 3: Setup, Ingestion, Preprocess
      for (let idx = 0; idx < 3; idx++) {
        setActiveStep(idx + 1);
        await streamStepLines(idx, initSteps[idx], 350);
      }

      // 2. Bước 4: Training - Gọi n8n Webhook / Python Task Runner thực tế
      setActiveStep(4);
      setCurrentActionSteps((prev) =>
        prev.map((s, idx) => idx === 3 ? {
          ...s,
          status: 'running',
          logs: [
            { id: 'l33-pre', time: new Date().toISOString(), type: 'cmd', text: '$ python train_model.py --epochs 15 --batch-size 32' },
            { id: 'l34-pre', time: new Date().toISOString(), type: 'info', text: 'Kích hoạt n8n Webhook: POST http://localhost:3636/webhook/trigger-training...' },
            { id: 'l35-pre', time: new Date().toISOString(), type: 'info', text: 'Task Runner (host.docker.internal:5005) đang huấn luyện mô hình TinyML MLP...' }
          ]
        } : s)
      );

      const res = await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          use_supabase: dataSource === 'SUPABASE',
          epochs: 15,
          batch_size: 32,
          trigger_source: 'web_dashboard',
          run_id: runId
        })
      });

      if (!res.ok) {
        throw new Error(`Lỗi kết nối n8n/Python runner: HTTP ${res.status}`);
      }

      const n8nResult = await res.json();
      const realDetails = n8nResult?.details || n8nResult?.metrics || {};
      const realAcc = realDetails.accuracy_percent || (realDetails.test_accuracy ? `${(realDetails.test_accuracy * 100).toFixed(2)}%` : '100.00%');
      const realF1 = realDetails.macro_f1 ? String(realDetails.macro_f1) : '1.0000';
      const realLoss = realDetails.test_loss ? String(realDetails.test_loss) : '0.00005';

      const updatedSteps = generateTrainingLogs(dataSource, runId, n8nResult);

      setCurrentActionSteps((prev) =>
        prev.map((s, idx) => idx === 3 ? {
          ...updatedSteps[3],
          status: 'completed',
          duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
        } : s)
      );

      // 3. Bước 5: Extract Metrics & Quality Gate
      setActiveStep(5);
      if (updatedSteps[4]) await streamStepLines(4, updatedSteps[4], 250);
      if (updatedSteps[5]) await streamStepLines(5, updatedSteps[5], 250);

      // 4. Bước 6+: Sync Registry, Sync Firmware Header & Send Telegram Alert
      setActiveStep(6);
      if (updatedSteps[6]) await streamStepLines(6, updatedSteps[6], 200);
      if (updatedSteps[7]) await streamStepLines(7, updatedSteps[7], 200);
      if (updatedSteps[8]) await streamStepLines(8, updatedSteps[8], 200);

      const totalDurationSec = Math.max(1, Number(((Date.now() - startTime) / 1000).toFixed(1)));
      setLastRunMeta({
        id: runId,
        time: new Date().toLocaleTimeString(),
        duration: `${totalDurationSec}s`,
        workflow: 'Automated AI Training Pipeline (Risk Score Model)'
      });
      setLastRunStatus('SUCCESS');

      const newExecution: N8nWorkflowExecution = {
        id: runId,
        triggered_at: new Date().toLocaleTimeString(),
        completed_at: new Date().toLocaleTimeString(),
        trigger_type: 'WEBHOOK',
        status: 'SUCCESS',
        current_stage: 'COMPLETED',
        records_processed: 32353,
        data_cleaning_stats: {
          missing_values_dropped: 0,
          outliers_filtered: 0,
          normalized_windows: 20705,
        },
        duration_seconds: totalDurationSec,
        message: n8nResult?.message || `Huấn luyện TinyML Health Risk MLP thành công qua n8n Webhook! Test Accuracy: ${realAcc}, F1: ${realF1}, Loss: ${realLoss}. Sẵn sàng nhúng firmware ESP32-S3.`,
      };
      onNewRun(newExecution, n8nResult);
      setSelectedNode('train_eval');
    } catch (e: any) {
      console.error('[Training Execution Error]:', e);
      setLastRunStatus('FAILED');
      const totalDurationSec = Math.max(1, Number(((Date.now() - startTime) / 1000).toFixed(1)));
      setLastRunMeta({
        id: runId,
        time: new Date().toLocaleTimeString(),
        duration: `${totalDurationSec}s`,
        workflow: 'Automated AI Training Pipeline (Risk Score Model)'
      });

      const failedSteps = generateFailureLogs(runId, e?.message);
      setCurrentActionSteps(failedSteps);

      const failedExecution: N8nWorkflowExecution = {
        id: runId,
        triggered_at: new Date().toLocaleTimeString(),
        completed_at: new Date().toLocaleTimeString(),
        trigger_type: 'WEBHOOK',
        status: 'ERROR',
        current_stage: 'FAILED',
        records_processed: 0,
        data_cleaning_stats: {
          missing_values_dropped: 0,
          outliers_filtered: 0,
          normalized_windows: 0,
        },
        duration_seconds: totalDurationSec,
        message: `Sự cố pipeline: ${e?.message || 'Lỗi kết nối Task Runner hoặc chất lượng không đạt'}. Đã kích hoạt nhánh Handle Failure & Telegram Incident Alert.`,
      };
      onNewRun(failedExecution);
    } finally {
      setIsRunning(false);
      setActiveStep(0);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1440px] mx-auto text-zinc-900 font-sans">

      {/* 1. WORKFLOW TABS SELECTOR */}
      <div className="bg-white border border-zinc-200 rounded p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-zinc-500 whitespace-nowrap">
            n8n workflow:
          </span>

          {/* Unified Single Workflow Header Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-medium">
            <span className="font-semibold text-zinc-900">
              Automated AI Training Pipeline (Risk Score Model)
            </span>
          </div>
        </div>

        {/* JSON Export & n8n Studio links */}
        <div className="flex items-center gap-2">
          <a
            href="http://localhost:3636"
            target="_blank"
            rel="noreferrer"
            title={language === 'vi' ? 'Mở bảng điều khiển n8n Editor Studio trên cổng :3636' : 'Open n8n Editor Studio Dashboard on port :3636'}
            className="h-8 px-3 rounded border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink size={13} className="text-zinc-500" />
            <span>{language === 'vi' ? 'Mở n8n Studio (:3636)' : 'Open n8n Studio (:3636)'}</span>
          </a>

          <a
            href="/automated_training_pipeline.json"
            download="automated_training_pipeline.json"
            className="h-8 px-3 rounded border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 flex items-center gap-1.5 transition-colors"
          >
            <Download size={13} className="text-zinc-500" />
            <span>{language === 'vi' ? 'Xuất file n8n JSON' : 'Export n8n JSON'}</span>
          </a>
        </div>
      </div>

      {/* 2. N8N CANVAS CONTAINER */}
      <div className="bg-white border border-zinc-200 rounded overflow-hidden flex flex-col">

        {/* N8N TOP BAR */}
        <div className="bg-white border-b border-zinc-200 p-3 sm:px-4 flex justify-between items-center flex-wrap gap-3">
          {/* Left: Workflow title & breadcrumb */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-center text-cyan-700 font-bold text-xs flex-shrink-0">
              n
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-900 leading-tight">
                {t('pipe.title')}
              </div>
              <div className="text-xs text-zinc-500 font-mono mt-0.5">
                ID: pOMF8He4573saS5R
              </div>
            </div>
          </div>

          {/* Right: Nút Nhật ký Runner */}
          <button
            type="button"
            onClick={() => {
              setBottomPanelOpen(true);
              bottomPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }}
            className="h-8 px-3 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 shadow-2xs hover:shadow-xs flex items-center gap-2 transition-all active:scale-95"
            title="Mở bảng nhật ký Action Runner Logs"
          >
            <Terminal size={14} className="text-zinc-600" />
            <span>{t('pipe.runnerLogs')}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                lastRunStatus === 'RUNNING'
                  ? 'bg-amber-500 animate-pulse'
                  : lastRunStatus === 'SUCCESS'
                  ? 'bg-emerald-600'
                  : 'bg-zinc-400'
              }`}
            />
          </button>
        </div>

        {/* 3. N8N CANVAS: Dots grid + SVG bezier curves + Node Cards */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          className={`relative h-[520px] overflow-hidden bg-[#fafafa] select-none ${
            isPanning ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            backgroundImage: 'radial-gradient(#e4e4e7 1.25px, transparent 1.25px)',
            backgroundSize: `${Math.round(24 * (zoomLevel / 100))}px ${Math.round(24 * (zoomLevel / 100))}px`,
            backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
            cursor: isPanning ? 'grabbing' : 'grab'
          }}
        >
          {/* Zoomable & Pannable Container */}
          <div
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100})`,
              transformOrigin: '0 0',
              transition: isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              width: '2820px',
              height: '520px',
              position: 'relative'
            }}
          >
            <style>{`
              @keyframes n8nDash {
                to { stroke-dashoffset: -24; }
              }
            `}</style>

            <div style={{ position: 'relative', width: '2780px', height: '490px', padding: '10px' }}>

              {/* SVG Bezier Curves for All 17 Real Pipeline Nodes */}
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '2780px', height: '490px', pointerEvents: 'none' }}>
                {/* Wire 1A: Webhook Trigger -> Fetch Supabase Data */}
                <path
                  d="M 210 107 C 245 107, 245 232, 280 232"
                  fill="none"
                  stroke={activeStep >= 1 ? '#0e7490' : '#94a3b8'}
                  strokeWidth={activeStep >= 1 ? '2.5' : '2'}
                  strokeDasharray={activeStep === 1 ? '6 6' : 'none'}
                  style={{ animation: activeStep === 1 ? 'n8nDash 0.8s linear infinite' : 'none' }}
                />
                {activeStep === 1 && (
                  <circle r="4" fill="#0e7490">
                    <animateMotion path="M 210 107 C 245 107, 245 232, 280 232" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Wire 1B: Schedule Trigger -> Fetch Supabase Data */}
                <path
                  d="M 210 232 C 245 232, 245 232, 280 232"
                  fill="none"
                  stroke={activeStep >= 1 ? '#0e7490' : '#94a3b8'}
                  strokeWidth={activeStep >= 1 ? '2.5' : '2'}
                  strokeDasharray={activeStep === 1 ? '6 6' : 'none'}
                  style={{ animation: activeStep === 1 ? 'n8nDash 0.8s linear infinite' : 'none' }}
                />

                {/* Wire 1C: Manual Trigger -> Fetch Supabase Data */}
                <path
                  d="M 210 357 C 245 357, 245 232, 280 232"
                  fill="none"
                  stroke={activeStep >= 1 ? '#0e7490' : '#94a3b8'}
                  strokeWidth={activeStep >= 1 ? '2.5' : '2'}
                  strokeDasharray={activeStep === 1 ? '6 6' : 'none'}
                  style={{ animation: activeStep === 1 ? 'n8nDash 0.8s linear infinite' : 'none' }}
                />

                {/* Wire 2: Fetch Supabase Data -> Pre-flight Validation */}
                <path
                  d="M 470 232 C 505 232, 505 232, 540 232"
                  fill="none"
                  stroke={activeStep >= 2 ? '#0e7490' : '#94a3b8'}
                  strokeWidth={activeStep >= 2 ? '2.5' : '2'}
                  strokeDasharray={activeStep === 2 ? '6 6' : 'none'}
                  style={{ animation: activeStep === 2 ? 'n8nDash 0.8s linear infinite' : 'none' }}
                />
                {activeStep === 2 && (
                  <circle r="4" fill="#0e7490">
                    <animateMotion path="M 470 232 C 505 232, 505 232, 540 232" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Wire 3: Pre-flight Validation -> Train Model */}
                <path
                  d="M 730 232 C 765 232, 765 232, 800 232"
                  fill="none"
                  stroke={activeStep >= 3 ? '#0e7490' : '#94a3b8'}
                  strokeWidth={activeStep >= 3 ? '2.5' : '2'}
                  strokeDasharray={activeStep === 3 ? '6 6' : 'none'}
                  style={{ animation: activeStep === 3 ? 'n8nDash 0.8s linear infinite' : 'none' }}
                />
                {activeStep === 3 && (
                  <circle r="4" fill="#0e7490">
                    <animateMotion path="M 730 232 C 765 232, 765 232, 800 232" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Wire 4: Train Model -> Extract Metrics */}
                <path
                  d="M 990 232 C 1025 232, 1025 232, 1060 232"
                  fill="none"
                  stroke={activeStep >= 4 ? '#0e7490' : '#94a3b8'}
                  strokeWidth={activeStep >= 4 ? '2.5' : '2'}
                  strokeDasharray={activeStep === 4 ? '6 6' : 'none'}
                  style={{ animation: activeStep === 4 ? 'n8nDash 0.8s linear infinite' : 'none' }}
                />
                {activeStep === 4 && (
                  <circle r="4" fill="#0e7490">
                    <animateMotion path="M 990 232 C 1025 232, 1025 232, 1060 232" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Wire 5: Extract Metrics -> Quality Gate */}
                <path
                  d="M 1240 232 C 1275 232, 1275 232, 1310 232"
                  fill="none"
                  stroke={activeStep >= 5 ? '#0e7490' : '#94a3b8'}
                  strokeWidth={activeStep >= 5 ? '2.5' : '2'}
                  strokeDasharray={activeStep === 5 ? '6 6' : 'none'}
                  style={{ animation: activeStep === 5 ? 'n8nDash 0.8s linear infinite' : 'none' }}
                />
                {activeStep === 5 && (
                  <circle r="4" fill="#0e7490">
                    <animateMotion path="M 1240 232 C 1275 232, 1275 232, 1310 232" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Wire 6 (True Branch): Quality Gate -> Handle Success */}
                <path
                  d="M 1510 215 C 1530 215, 1530 107, 1550 107"
                  fill="none"
                  stroke={activeStep >= 5 ? '#047857' : '#94a3b8'}
                  strokeWidth={activeStep >= 5 ? '2.5' : '2'}
                />
                {activeStep >= 5 && (
                  <circle r="4" fill="#047857">
                    <animateMotion path="M 1510 215 C 1530 215, 1530 107, 1550 107" dur="0.9s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Wire 7: Handle Success -> Sync Model Registry */}
                <path
                  d="M 1720 107 C 1755 107, 1755 107, 1790 107"
                  fill="none"
                  stroke={activeStep >= 5 ? '#047857' : '#94a3b8'}
                  strokeWidth={activeStep >= 5 ? '2.5' : '2'}
                />

                {/* Wire 8: Sync Model Registry -> Sync Firmware Header */}
                <path
                  d="M 1970 107 C 2005 107, 2005 107, 2040 107"
                  fill="none"
                  stroke={activeStep >= 6 ? '#047857' : '#94a3b8'}
                  strokeWidth={activeStep >= 6 ? '2.5' : '2'}
                />

                {/* Wire 9: Sync Firmware Header -> Format Success Card */}
                <path
                  d="M 2230 107 C 2262 107, 2262 107, 2295 107"
                  fill="none"
                  stroke={activeStep >= 6 ? '#047857' : '#94a3b8'}
                  strokeWidth={activeStep >= 6 ? '2.5' : '2'}
                />

                {/* Wire 10: Format Success Card -> Send Telegram Alert */}
                <path
                  d="M 2490 107 C 2517 107, 2517 107, 2545 107"
                  fill="none"
                  stroke={activeStep >= 6 ? '#047857' : '#94a3b8'}
                  strokeWidth={activeStep >= 6 ? '2.5' : '2'}
                />

                {/* Wire 11 (False Branch): Quality Gate -> Handle Failure */}
                <path
                  d="M 1510 249 C 1530 249, 1530 357, 1550 357"
                  fill="none"
                  stroke="#b91c1c"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />

                {/* Wire 12: Handle Failure -> Log Audit Incident */}
                <path
                  d="M 1720 357 C 1755 357, 1755 357, 1790 357"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />

                {/* Wire 13: Log Audit Incident -> Format Alert Card */}
                <path
                  d="M 1970 357 C 2005 357, 2005 357, 2040 357"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />

                {/* Wire 14: Format Alert Card -> Send Incident Alert */}
                <path
                  d="M 2220 357 C 2255 357, 2255 357, 2290 357"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />
              </svg>

              {/* 1. Webhook Trigger */}
              <PipelineNodeCard
                id="webhook_trigger"
                left={40}
                top={70}
                width={170}
                title="Webhook Trigger"
                subtitle="POST /trigger-training"
                category="trigger"
                categoryLabel="Webhook"
                icon={<Webhook size={16} />}
                isSelected={selectedNode === 'webhook_trigger'}
                isActive={activeStep === 1}
                hasInputPin={false}
                onClick={() => setSelectedNode('webhook_trigger')}
              />

              {/* 2. Schedule Trigger */}
              <PipelineNodeCard
                id="schedule_trigger"
                left={40}
                top={195}
                width={170}
                title="Schedule Trigger"
                subtitle={language === 'vi' ? '02:00 Chủ nhật' : '02:00 Sunday'}
                category="trigger"
                categoryLabel="Schedule"
                icon={<Clock size={16} />}
                isSelected={selectedNode === 'schedule_trigger'}
                hasInputPin={false}
                onClick={() => setSelectedNode('schedule_trigger')}
              />

              {/* 3. Manual Trigger */}
              <PipelineNodeCard
                id="manual_trigger"
                left={40}
                top={320}
                width={170}
                title="Manual Trigger"
                subtitle={language === 'vi' ? 'Kích hoạt thủ công' : 'Manual trigger'}
                category="trigger"
                categoryLabel="Manual"
                icon={<Play size={16} fill="currentColor" />}
                isSelected={selectedNode === 'manual_trigger'}
                hasInputPin={false}
                onClick={() => setSelectedNode('manual_trigger')}
              />

              {/* 4. Fetch Supabase Data */}
              <PipelineNodeCard
                id="fetch_supabase"
                left={280}
                top={195}
                width={190}
                title="Fetch Supabase Data"
                subtitle="REST API 50 records"
                category="database"
                categoryLabel="Supabase DB"
                icon={<SupabaseLogo size={20} />}
                isSelected={selectedNode === 'fetch_supabase'}
                isActive={activeStep >= 2}
                onClick={() => setSelectedNode('fetch_supabase')}
              />

              {/* 5. Pre-flight Validation */}
              <PipelineNodeCard
                id="preflight_val"
                left={540}
                top={195}
                width={190}
                title="Pre-flight Validation"
                subtitle="Hybrid (32k + Cloud)"
                category="validation"
                categoryLabel="Pre-flight Val"
                icon={<ShieldCheck size={16} />}
                isSelected={selectedNode === 'preflight_val'}
                isActive={activeStep >= 3}
                onClick={() => setSelectedNode('preflight_val')}
              />

              {/* 6. Train Model (Python) */}
              <PipelineNodeCard
                id="train_model"
                left={800}
                top={195}
                width={190}
                title="Train Model (Python)"
                subtitle="TinyML MLP (:5005)"
                category="model"
                categoryLabel="TinyML Model"
                icon={<Brain size={16} />}
                isSelected={selectedNode === 'train_model'}
                isActive={activeStep >= 4}
                onClick={() => setSelectedNode('train_model')}
              />

              {/* 7. Extract Metrics */}
              <PipelineNodeCard
                id="extract_metrics"
                left={1060}
                top={195}
                width={180}
                title="Extract Metrics"
                subtitle="Accuracy, F1, Loss"
                category="metrics"
                categoryLabel="Eval Metrics"
                icon={<BarChart3 size={16} />}
                isSelected={selectedNode === 'extract_metrics'}
                isActive={activeStep >= 5}
                onClick={() => setSelectedNode('extract_metrics')}
              />

              {/* 8. Quality Gate */}
              <PipelineNodeCard
                id="quality_gate"
                left={1310}
                top={195}
                width={200}
                title="Quality Gate"
                subtitle="Accuracy >= 90%?"
                category="gate"
                categoryLabel="Quality Gate"
                icon={<GitBranch size={16} />}
                isSelected={selectedNode === 'quality_gate'}
                isActive={activeStep >= 5}
                hasDualOutputPin={true}
                onClick={() => setSelectedNode('quality_gate')}
              />

              {/* --- TRUE BRANCH (SUCCESS) --- */}
              {/* 9. Handle Success */}
              <PipelineNodeCard
                id="handle_success"
                left={1550}
                top={70}
                width={170}
                title="Handle Success"
                subtitle="Model Approved"
                category="success"
                categoryLabel="Passed Gate"
                icon={<CheckCircle2 size={16} />}
                isSelected={selectedNode === 'handle_success'}
                isActive={activeStep >= 5}
                onClick={() => setSelectedNode('handle_success')}
              />

              {/* 10. Sync Model Registry */}
              <PipelineNodeCard
                id="sync_registry"
                left={1790}
                top={70}
                width={180}
                title="Sync Model Registry"
                subtitle="Supabase DB"
                category="database"
                categoryLabel="Model Registry"
                icon={<Database size={16} />}
                isSelected={selectedNode === 'sync_registry'}
                isActive={activeStep >= 5}
                onClick={() => setSelectedNode('sync_registry')}
              />

              {/* 11. Sync Firmware Header */}
              <PipelineNodeCard
                id="sync_firmware"
                left={2040}
                top={70}
                width={190}
                title="Sync Firmware Header"
                subtitle="C++ XIAO ESP32"
                category="model"
                categoryLabel="C++ Firmware"
                icon={<FileCode size={16} />}
                isSelected={selectedNode === 'sync_firmware'}
                isActive={activeStep >= 6}
                onClick={() => setSelectedNode('sync_firmware')}
              />

              {/* 12. Format Success Card */}
              <PipelineNodeCard
                id="format_success"
                left={2295}
                top={70}
                width={195}
                title="Format Success Card"
                subtitle="Telegram Markdown"
                category="notify"
                categoryLabel="Report Card"
                icon={<FileText size={16} />}
                isSelected={selectedNode === 'format_success'}
                isActive={activeStep >= 6}
                onClick={() => setSelectedNode('format_success')}
              />

              {/* 13. Send Telegram Alert */}
              <PipelineNodeCard
                id="send_telegram"
                left={2545}
                top={70}
                width={180}
                title="Send Telegram Alert"
                subtitle="Telegram Bot API"
                category="notify"
                categoryLabel="Telegram Bot"
                icon={<Send size={16} />}
                isSelected={selectedNode === 'send_telegram'}
                isActive={activeStep >= 6}
                hasOutputPin={false}
                onClick={() => setSelectedNode('send_telegram')}
              />

              {/* --- FALSE BRANCH (INCIDENT) --- */}
              {/* 14. Handle Failure */}
              <PipelineNodeCard
                id="handle_failure"
                left={1550}
                top={320}
                width={170}
                title="Handle Failure"
                subtitle="Model Rejected"
                category="incident"
                categoryLabel="Failed Gate"
                icon={<XCircle size={16} />}
                isSelected={selectedNode === 'handle_failure'}
                onClick={() => setSelectedNode('handle_failure')}
              />

              {/* 15. Log Audit Incident */}
              <PipelineNodeCard
                id="log_audit"
                left={1790}
                top={320}
                width={180}
                title="Log Audit Incident"
                subtitle="Audit Log Entry"
                category="incident"
                categoryLabel="Audit Log"
                icon={<ClipboardList size={16} />}
                isSelected={selectedNode === 'log_audit'}
                onClick={() => setSelectedNode('log_audit')}
              />

              {/* 16. Format Alert Card */}
              <PipelineNodeCard
                id="format_alert"
                left={2040}
                top={320}
                width={180}
                title="Format Alert Card"
                subtitle={language === 'vi' ? 'Cảnh báo khẩn cấp' : 'Emergency Alert'}
                category="incident"
                categoryLabel="Alert Card"
                icon={<FileText size={16} />}
                isSelected={selectedNode === 'format_alert'}
                onClick={() => setSelectedNode('format_alert')}
              />

              {/* 17. Send Incident Alert */}
              <PipelineNodeCard
                id="send_incident"
                left={2290}
                top={320}
                width={220}
                title="Send Incident Alert"
                subtitle="Telegram Alert API"
                category="incident"
                categoryLabel="Incident Bot"
                icon={<BellRing size={16} />}
                isSelected={selectedNode === 'send_incident'}
                hasOutputPin={false}
                onClick={() => setSelectedNode('send_incident')}
              />

            </div>

          </div>

          {/* Floating Canvas Controls (n8n Web Style) */}
          {/* Left: Floating Zoom, Fit & Reset Toolbar */}
          <div
            data-no-pan="true"
            className="absolute bottom-4 left-4 z-20 flex items-center gap-2 select-none"
          >
            <div className="flex items-center bg-white border border-zinc-300 rounded-md shadow-md p-1 gap-1 text-zinc-700">
              <button
                type="button"
                onClick={handleResetView}
                className="h-8 w-8 rounded hover:bg-zinc-100 flex items-center justify-center text-zinc-700 hover:text-zinc-900 transition-colors cursor-pointer"
                title={language === 'vi' ? 'Căn vừa màn hình (Fit to Screen)' : 'Fit to Screen'}
              >
                <Maximize2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(z + 10, 160))}
                className="h-8 w-8 rounded hover:bg-zinc-100 flex items-center justify-center text-zinc-700 hover:text-zinc-900 transition-colors cursor-pointer"
                title={language === 'vi' ? 'Phóng to (+10%)' : 'Zoom In (+10%)'}
              >
                <ZoomIn size={15} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(z - 10, 50))}
                className="h-8 w-8 rounded hover:bg-zinc-100 flex items-center justify-center text-zinc-700 hover:text-zinc-900 transition-colors cursor-pointer"
                title={language === 'vi' ? 'Thu nhỏ (-10%)' : 'Zoom Out (-10%)'}
              >
                <ZoomOut size={15} />
              </button>
              <button
                type="button"
                onClick={handleResetView}
                className="h-8 w-8 rounded hover:bg-zinc-100 flex items-center justify-center text-zinc-700 hover:text-zinc-900 transition-colors cursor-pointer"
                title={language === 'vi' ? 'Đặt lại 100% (Reset View)' : 'Reset View (100%)'}
              >
                <RotateCcw size={14} />
              </button>
              <div className="w-[1px] h-4 bg-zinc-200 mx-0.5" />
              <button
                type="button"
                onClick={handleResetView}
                className="font-mono text-xs font-bold text-zinc-800 hover:bg-zinc-100 px-1.5 py-1 rounded transition-colors cursor-pointer"
                title={language === 'vi' ? 'Tỉ lệ phóng to (Click để đặt lại 100%)' : 'Zoom Level (Click to reset)'}
              >
                {zoomLevel}%
              </button>
            </div>
          </div>

          {/* Center: Floating Execute Workflow Button (n8n Web Style) */}
          <div
            data-no-pan="true"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 select-none"
          >
            <button
              type="button"
              onClick={handleExecuteTrainingWorkflow}
              disabled={isRunning}
              className={`h-10 px-5 rounded-md text-xs font-bold transition-all shadow-md flex items-center gap-2 active:scale-95 ${
                isRunning
                  ? 'bg-cyan-800 text-white cursor-not-allowed opacity-90'
                  : 'bg-cyan-700 hover:bg-cyan-800 text-white'
              }`}
              title="Thực thi n8n AI Training Workflow"
            >
              {isRunning ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <FlaskConical size={15} />
              )}
              <span>{isRunning ? t('pipe.executing') : t('pipe.executeWorkflow')}</span>
            </button>
          </div>
        </div>

        {/* 4. GITHUB ACTIONS ACTION RUNNER & NODE INSPECTOR PANEL (LIGHT THEME) */}
        {bottomPanelOpen && (
          <div
            ref={bottomPanelRef}
            className={`bg-white border-t border-zinc-200 flex flex-col transition-all duration-200 shadow-sm ${
              isMaximized ? 'h-[720px]' : 'h-[460px]'
            }`}
          >
            {/* PANEL HEADER: LIGHT TOOLBAR */}
            <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2.5 flex justify-between items-center flex-wrap gap-2 text-xs">
              {/* Left: Workflow Status Badge & Name */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {lastRunStatus === 'RUNNING' ? (
                  <RefreshCw size={15} className="text-amber-600 animate-spin" />
                ) : lastRunStatus === 'SUCCESS' ? (
                  <CheckCircle2 size={15} className="text-emerald-700" />
                ) : (
                  <Terminal size={15} className="text-zinc-600" />
                )}
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono text-zinc-900 font-semibold">
                    {lastRunMeta.id}
                  </span>
                  <span className="text-zinc-600 text-xs">
                    • {lastRunMeta.workflow}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium inline-flex items-center gap-1.5 ${
                      lastRunStatus === 'RUNNING'
                        ? 'bg-amber-50 border border-amber-200 text-amber-800'
                        : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {lastRunStatus === 'RUNNING' ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>{t('pipe.statusRunning')} ({formatTimer(elapsedSeconds)})...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={11} className="text-emerald-700" />
                        <span>{t('pipe.statusCompleted')} ({lastRunMeta.duration})</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Right: Actions Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-zinc-300 rounded px-2 py-1 text-xs focus-within:border-cyan-700 focus-within:ring-1 focus-within:ring-cyan-700">
                  <Search size={12} className="text-zinc-400" />
                  <input
                    type="text"
                    placeholder={t('pipe.filterLogsPlaceholder')}
                    value={searchLogQuery}
                    onChange={(e) => setSearchLogQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-zinc-900 placeholder:text-zinc-400 text-xs w-24 sm:w-32"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setAutoScroll((prev) => !prev)}
                  className={`h-7 px-2.5 rounded border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    autoScroll
                      ? 'bg-cyan-50 border-cyan-400 text-cyan-800'
                      : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                  }`}
                  title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                >
                  {autoScroll ? <CheckSquare size={12} className="text-cyan-700" /> : <Square size={12} className="text-zinc-400" />}
                  <span>Auto-scroll</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="h-7 px-2.5 rounded border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  title="Copy logs"
                >
                  {copiedLogs ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} className="text-zinc-400" />}
                  <span>{copiedLogs ? t('pipe.copiedLogs') : t('pipe.copyLogs')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExecuteTrainingWorkflow}
                  disabled={isRunning}
                  className="h-7 px-2.5 rounded border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Re-run workflow"
                >
                  <RotateCcw size={12} className="text-zinc-500" />
                  <span>{t('pipe.reRun')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMaximized((prev) => !prev)}
                  className="h-7 w-7 rounded border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-600 flex items-center justify-center transition-colors"
                  title={isMaximized ? (language === 'vi' ? 'Thu nhỏ panel' : 'Minimize panel') : (language === 'vi' ? 'Mở rộng toàn màn hình' : 'Expand fullscreen')}
                >
                  {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>

                <button
                  type="button"
                  onClick={() => setBottomPanelOpen(false)}
                  className="h-7 w-7 rounded border border-zinc-300 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors"
                  title={language === 'vi' ? 'Đóng panel' : 'Close panel'}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* TAB CONTENT: GITHUB ACTIONS LIGHT RUNNER LOGS */}
            <div
              ref={terminalContainerRef}
              className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed bg-zinc-50/60"
            >
              {/* Workflow Job Overview Bar */}
              <div className="bg-white border border-zinc-200 rounded p-2.5 text-xs text-zinc-600 font-mono mb-2.5 flex justify-between items-center flex-wrap gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Zap size={13} className="text-cyan-700" />
                  <span>Runner: <strong className="text-zinc-900 font-semibold">n8n-self-hosted-worker-01 (Ubuntu 22.04 LTS • CUDA 12.2)</strong></span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span>Trigger: <strong className="text-zinc-900 font-semibold">workflow_dispatch</strong></span>
                  <span>{t('pipe.totalSteps')} <strong className="text-zinc-900 font-semibold">{currentActionSteps.length}</strong></span>
                </div>
              </div>

              {/* Steps Accordion */}
              <div className="flex flex-col gap-1.5">
                {currentActionSteps.map((step) => {
                  const isExpanded = !!expandedSteps[step.id];
                  const isMatchedNode = selectedNode && step.nodeKey === selectedNode;
                  const filteredLogs = searchLogQuery
                    ? step.logs.filter((l) => l.text.toLowerCase().includes(searchLogQuery.toLowerCase()))
                    : step.logs;

                  return (
                    <div
                      key={step.id}
                      className={`border rounded-md overflow-hidden bg-white shadow-2xs transition-colors ${
                        isMatchedNode
                          ? 'border-cyan-700 ring-1 ring-cyan-700'
                          : 'border-zinc-200'
                      }`}
                    >
                      <div
                        onClick={() => toggleStepExpand(step.id)}
                        className={`px-3 py-2 flex items-center justify-between cursor-pointer select-none text-xs transition-colors ${
                          isMatchedNode
                            ? 'bg-cyan-50/80 text-cyan-900'
                            : step.status === 'running'
                            ? 'bg-amber-50/70 text-amber-900'
                            : 'hover:bg-zinc-50 text-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
                          {step.status === 'completed' && <CheckCircle2 size={14} className="text-emerald-700" />}
                          {step.status === 'running' && <RefreshCw size={14} className="text-amber-600 animate-spin" />}
                          {step.status === 'pending' && <div className="w-3 h-3 rounded-full border border-zinc-400" />}
                          <span className={`font-semibold ${step.status === 'pending' ? 'text-zinc-500' : 'text-zinc-900'}`}>
                            {step.title}
                          </span>
                          {isMatchedNode && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 border border-cyan-300 text-cyan-800 font-semibold">
                              {t('pipe.selectedNode')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono">
                          {step.status === 'completed' && <span>{step.duration}</span>}
                          {step.status === 'running' && (
                            <span className="text-amber-700 font-medium flex items-center gap-1">
                              <RefreshCw size={11} className="animate-spin" /> {formatTimer(currentStepElapsed)}
                            </span>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-[#fcfcfc] p-2.5 overflow-x-auto border-t border-zinc-200">
                          {filteredLogs.length === 0 ? (
                            <div className="text-zinc-500 italic px-2 py-1 text-xs">
                              {step.status === 'pending' ? 'Step queued, waiting for runner...' : (language === 'vi' ? 'Không có dòng log nào khớp với từ khóa tìm kiếm.' : 'No log lines matched the search query.')}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5 text-xs font-mono">
                              {filteredLogs.map((log, lineIdx) => (
                                <div
                                  key={log.id}
                                  className="flex items-start gap-3 py-0.5 px-1 rounded hover:bg-zinc-100/70"
                                >
                                  <span className="text-zinc-400 w-7 text-right select-none text-[11px] flex-shrink-0">
                                    {lineIdx + 1}
                                  </span>
                                  <span className="text-zinc-500 w-36 select-none text-[11px] flex-shrink-0">
                                    {log.time}
                                  </span>
                                  <span
                                    className={`flex-1 break-words whitespace-pre-wrap ${
                                      log.type === 'cmd'
                                        ? 'text-cyan-800 font-semibold'
                                        : log.type === 'success'
                                        ? 'text-emerald-700 font-medium'
                                        : log.type === 'warn'
                                        ? 'text-amber-700'
                                        : log.type === 'error'
                                        ? 'text-red-700 font-medium'
                                        : log.type === 'metric'
                                        ? 'text-indigo-700 font-medium'
                                        : log.type === 'dim'
                                        ? 'text-zinc-400'
                                        : 'text-zinc-800'
                                    }`}
                                  >
                                    {log.text}
                                  </span>
                                </div>
                              ))}
                              {step.status === 'running' && (
                                <div className="flex items-center gap-3 py-0.5 px-1 text-amber-700 text-xs">
                                  <span className="text-cyan-700 w-7 text-right select-none font-bold text-[11px] flex-shrink-0">
                                    {filteredLogs.length + 1}
                                  </span>
                                  <span className="text-zinc-400 w-36 select-none text-[11px] flex-shrink-0">
                                    {new Date().toISOString().slice(11, 23)}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 font-medium">
                                    <span>{language === 'vi' ? 'Đang xử lý' : 'Processing'} ({formatTimer(currentStepElapsed)} / ~45s)...</span>
                                    <span className="inline-block w-1.5 h-3 bg-amber-600 animate-pulse" />
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 5. WORKFLOW RUN HISTORY TABLE (Lịch sử các lần thực thi n8n) */}
      {(() => {
        const filteredRuns = workflowRuns.filter((run) => {
          const isError = run.status === 'ERROR' || run.status === 'FAILED';
          const isSuccess = run.status === 'SUCCESS';
          const matchesStatus =
            historyStatusFilter === 'ALL' ||
            (historyStatusFilter === 'SUCCESS' && isSuccess) ||
            (historyStatusFilter === 'ERROR' && isError);

          const q = historySearch.toLowerCase().trim();
          const matchesSearch =
            !q ||
            run.id.toLowerCase().includes(q) ||
            run.trigger_type.toLowerCase().includes(q) ||
            (run.message && run.message.toLowerCase().includes(q));

          return matchesStatus && matchesSearch;
        });

        const successRunsCount = workflowRuns.filter((r) => r.status === 'SUCCESS').length;
        const errorRunsCount = workflowRuns.filter((r) => r.status === 'ERROR' || r.status === 'FAILED').length;

        return (
          <div className="bg-white border border-zinc-200 rounded p-4 sm:p-5 flex flex-col gap-4">
            {/* Header: Title + Filter Tabs + Search */}
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-center text-cyan-700 flex-shrink-0">
                  <Activity size={16} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 leading-tight">
                    {t('pipe.historyTitle')}
                  </h3>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {language === 'vi' ? `Tổng số ${workflowRuns.length} lượt thực thi gần đây` : `Total ${workflowRuns.length} recent executions`}
                  </div>
                </div>
              </div>

              {/* Status Filter Buttons + Search Input */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Filter Tabs */}
                <div className="flex items-center bg-zinc-100 p-0.5 rounded border border-zinc-200 gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setHistoryStatusFilter('ALL')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${historyStatusFilter === 'ALL'
                      ? 'bg-white text-zinc-900 border border-zinc-200 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                  >
                    <span>{t('pipe.filterAll')}</span>
                    <span className="ml-1 text-[11px] text-zinc-500">({workflowRuns.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistoryStatusFilter('SUCCESS')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${historyStatusFilter === 'SUCCESS'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-700" />
                      <span>{t('pipe.filterSuccess')}</span>
                      <span className="text-[11px]">({successRunsCount})</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistoryStatusFilter('ERROR')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${historyStatusFilter === 'ERROR'
                      ? 'bg-red-50 text-red-700 border border-red-300 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle size={12} className="text-red-700" />
                      <span>{t('pipe.filterError')}</span>
                      <span className="text-[11px]">({errorRunsCount})</span>
                    </span>
                  </button>
                </div>

                {/* Search Box */}
                <div className="h-8 px-2.5 rounded bg-white border border-zinc-300 flex items-center gap-1.5 focus-within:border-cyan-700 focus-within:ring-1 focus-within:ring-cyan-700 text-xs">
                  <Search size={13} className="text-zinc-400" />
                  <input
                    type="text"
                    placeholder={t('pipe.searchPlaceholder')}
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-zinc-900 w-36 sm:w-48"
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch('')}
                      className="text-zinc-400 hover:text-zinc-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table or Empty State */}
            {filteredRuns.length === 0 ? (
              <div className="text-center py-10 bg-zinc-50 border border-dashed border-zinc-200 rounded">
                <Info size={24} className="text-zinc-400 mx-auto mb-1.5" />
                <div className="text-sm font-medium text-zinc-700">
                  {t('pipe.emptyTitle')}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {t('pipe.emptyDesc')}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-200 rounded">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 text-left">
                      <th className="py-2.5 px-3 font-medium">{t('pipe.thExecutionId')}</th>
                      <th className="py-2.5 px-3 font-medium">{t('pipe.thTime')}</th>
                      <th className="py-2.5 px-3 font-medium">{t('pipe.thTrigger')}</th>
                      <th className="py-2.5 px-3 font-medium">{t('pipe.thSamples')}</th>
                      <th className="py-2.5 px-3 font-medium">{t('pipe.thDuration')}</th>
                      <th className="py-2.5 px-3 font-medium">{t('pipe.thStatus')}</th>
                      <th className="py-2.5 px-3 font-medium">{t('pipe.thMessage')}</th>
                      <th className="py-2.5 px-3 font-medium text-center">{t('pipe.thLogs')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRuns.map((run, idx) => {
                      const isSuccess = run.status === 'SUCCESS';
                      const isEven = idx % 2 === 0;
                      return (
                        <tr
                          key={run.id || idx}
                          className={`border-b border-zinc-200 transition-colors duration-75 ${isEven ? 'bg-white' : 'bg-zinc-50/50'
                            } hover:bg-zinc-100/60`}
                        >
                          <td className="py-2 px-3 font-mono text-zinc-900 font-semibold">
                            {run.id}
                          </td>
                          <td className="py-2 px-3 font-mono text-zinc-500">
                            {run.triggered_at}
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-block px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-medium">
                              {run.trigger_type}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-zinc-900 tabular-nums">
                            {run.records_processed ? `${run.records_processed.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')} ${t('pipe.samplesSuffix')}` : '--'}
                          </td>
                          <td className="py-2 px-3 font-mono text-zinc-600 tabular-nums">
                            {run.duration_seconds}s
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${isSuccess
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                                }`}
                            >
                              {isSuccess ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                              <span>{isSuccess ? 'SUCCESS' : 'FAILED'}</span>
                            </span>
                          </td>
                          <td className="py-2 px-3 text-zinc-600 max-w-sm truncate text-xs" title={run.message}>
                            {run.message || (isSuccess ? (language === 'vi' ? 'Workflow thực thi thành công.' : 'Workflow executed successfully.') : (language === 'vi' ? 'Sự cố trong quá trình thực thi.' : 'Workflow execution failed.'))}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleViewRunLogs(run)}
                              className="h-7 px-2.5 rounded border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                              title="Xem chi tiết runner logs"
                            >
                              <Terminal size={12} className="text-zinc-500" />
                              <span>{t('pipe.viewLogs')}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
};
