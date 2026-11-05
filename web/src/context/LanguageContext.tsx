'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'vi' | 'en';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const dictionary: Record<Language, Record<string, string>> = {
  vi: {
    // ----------------- NAVBAR -----------------
    'nav.prototype': 'Prototype',
    'nav.datasheet': 'Data Sheet',
    'nav.history': 'Lịch sử đo',
    'nav.pipeline': 'Tự động hóa n8n',
    'nav.models': 'Đánh giá AI & Metrics',
    'nav.mobile': 'Run Mobile',

    // ----------------- PROTOTYPE TAB -----------------
    'proto.title': 'PROWATCH 3D DIGITAL TWIN & HARDWARE PROTOTYPE',
    'proto.subtitle': 'Mô hình 3D tương tác phần cứng • Trực tiếp thao tác phím cảm ứng, công tắc nguồn & mặt đồng hồ Pip-Boy',
    'proto.view': 'GÓC NHÌN:',
    'proto.viewPerspective': 'Góc 3D (3/4)',
    'proto.viewFront': 'Mặt trước',
    'proto.viewBack': 'Mặt sau',
    'proto.viewSide': 'Cạnh bên',
    'proto.rotate360': 'Xoay 360°',
    'proto.canvasHint': 'Kéo chuột để xoay 360° • Cuộn để phóng to/thu nhỏ',
    'proto.exploded': 'TÁCH LỚP LINH KIỆN (EXPLODED):',
    'proto.strapColor': 'MÀU DÂY ĐEO SILICONE:',
    'proto.strapObsidian': 'Đen Obsidian',
    'proto.strapMidnight': 'Xanh Midnight',
    'proto.strapNavy': 'Xanh Navy',
    'proto.strapCrimson': 'Đỏ Crimson',
    'proto.detailHeader': 'CHI TIẾT LINH KIỆN PHẦN CỨNG',
    'proto.detailSubtitle': 'Chọn linh kiện để xem thông số kỹ thuật chi tiết',
    'proto.listHeader': 'DANH MỤC LINH KIỆN THIẾT BỊ',
    'proto.specHeader': 'Thông số kỹ thuật phần cứng',
    'proto.firmwareRole': 'Vai trò Firmware (ESP-IDF / Arduino):',
    'proto.connectionBus': 'Chuẩn kết nối Bus & Chân tín hiệu:',
    'proto.emptyDetail': 'Nhấp vào một linh kiện trong danh sách để xem chi tiết kỹ thuật',

    // ----------------- DATA SHEET TAB -----------------
    'data.title': 'Data Sheet & Kho dữ liệu cảm biến WESAD PPG',
    'data.subtitle': 'Dữ liệu đo đạc thực nghiệm từ 15 đối tượng (S1–S15) với cảm biến quang học PPG và gia tốc kế 3 trục',
    'data.catProcessed': 'Dữ liệu đã xử lý (Processed data)',
    'data.catProcessedDesc': 'Dữ liệu đã qua tiền xử lý, khử nhiễu, chuẩn hóa Z-score và gán nhãn phân tầng rủi ro sức khỏe',
    'data.catRaw': 'Dữ liệu thô cảm biến (Raw sensor data)',
    'data.catRawDesc': 'Tín hiệu cảm biến vật lý (PPG 64Hz, HR, ACC 32Hz, EDA, TEMP, S1–S15)',
    'data.filterSubject': 'Lọc theo đối tượng:',
    'data.subjectAll': 'Tất cả (15 đối tượng)',
    'data.subject': 'Đối tượng:',
    'data.statsHeader': 'Thông số thống kê tập dữ liệu',
    'data.statsSamples': 'Tổng số mẫu dữ liệu',
    'data.statsSampling': 'Tần số lấy mẫu',
    'data.statsFeatures': 'Số trường đặc trưng',
    'data.statsQuality': 'Chất lượng tín hiệu',
    'data.searchPlaceholder': 'Tìm kiếm trong tập dữ liệu...',
    'data.exportCSV': 'Xuất CSV',
    'data.totalRows': 'Tổng số dòng:',
    'data.page': 'Trang',
    'data.jumpTo': 'Đến trang',
    'data.copySheet': 'Sao chép bảng tính',
    'data.copied': 'Đã sao chép',
    'data.exportCsv': 'Xuất file CSV',
    'data.statsMean': 'Giá trị trung bình',
    'data.freqPrefix': 'Tần số:',
    'data.minPrefix': 'Tối thiểu:',
    'data.maxPrefix': 'Tối đa:',
    'data.waveform': 'Dạng sóng tín hiệu',
    'data.filterBtn': 'Lọc',

    // ----------------- HISTORY TAB -----------------
    'history.title': 'Lịch sử đo dữ liệu cảm biến',
    'history.subtitle': 'Truy vấn dữ liệu thời gian thực',
    'history.synced': 'Đồng bộ lúc',
    'history.total': 'Tổng số',
    'history.records': 'bản ghi',
    'history.refresh': 'Làm mới',
    'history.loading': 'Đang tải...',
    'history.export': 'Xuất CSV',
    'history.search': 'Tìm theo ID, thời gian...',
    'history.filterAll': 'Tất cả trạng thái',
    'history.statusNormal': 'Bình thường (Ổn định)',
    'history.statusWarning': 'Cảnh báo (Nhịp tim / SpO2)',
    'history.thRecord': 'Bản ghi',
    'history.thDevice': 'Device ID',
    'history.thTime': 'Thời điểm',
    'history.thHeartRate': 'Nhịp tim (BPM)',
    'history.thSpo2': 'SpO₂ (%)',
    'history.thAccel': 'Gia tốc MPU6050',
    'history.thStatus': 'Trạng thái',
    'history.noData': 'Không tìm thấy bản ghi đo lường nào phù hợp.',

    // ----------------- PIPELINE TAB -----------------
    'pipe.title': 'Quy trình tự động hóa: Huấn luyện TinyML & Tích hợp Firmware',
    'pipe.subtitle': 'Quy trình 17 node n8n điều phối: Thu thập dữ liệu → Tiền xử lý → Train TinyML MLP → Quality Gate → Xuất Header C',
    'pipe.runnerLogs': 'Nhật ký runner',
    'pipe.executeWorkflow': 'Thực thi quy trình n8n',
    'pipe.executing': 'Đang thực thi quy trình...',
    'pipe.historyTitle': 'Lịch sử thực thi n8n workflows',
    'pipe.historySubtitle': 'Tổng số các lượt thực thi gần đây',
    'pipe.thExecutionId': 'Execution ID',
    'pipe.thWorkflow': 'Quy trình',
    'pipe.thTrigger': 'Kích hoạt',
    'pipe.thTime': 'Thời gian',
    'pipe.thDuration': 'Thời lượng',
    'pipe.thSamples': 'Số mẫu xử lý',
    'pipe.thStatus': 'Trạng thái',
    'pipe.thMessage': 'Thông điệp / Kết quả',
    'pipe.thLogs': 'Runner logs',
    'pipe.viewLogs': 'Xem logs',
    'pipe.statusSuccess': 'Thành công',
    'pipe.statusFailed': 'Sự cố',
    'pipe.statusRunning': 'Đang chạy',
    'pipe.filterAll': 'Tất cả',
    'pipe.filterSuccess': 'Thành công',
    'pipe.filterError': 'Sự cố',
    'pipe.searchPlaceholder': 'Tìm mã, trigger, kết quả...',
    'pipe.emptyTitle': 'Không tìm thấy lượt chạy nào',
    'pipe.emptyDesc': 'Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.',
    'pipe.samplesSuffix': 'mẫu',
    'pipe.filterLogsPlaceholder': 'Lọc logs...',
    'pipe.autoScroll': 'Auto-scroll',
    'pipe.copyLogs': 'Sao chép',
    'pipe.copiedLogs': 'Đã sao chép',
    'pipe.reRun': 'Chạy lại',
    'pipe.selectedNode': 'Đang chọn Node',
    'pipe.statusCompleted': 'Hoàn tất',
    'pipe.totalSteps': 'Tổng số bước:',
    'pipe.closePanel': 'Đóng panel',
    'pipe.expandPanel': 'Mở rộng toàn màn hình',
    'pipe.minimizePanel': 'Thu nhỏ panel',

    // ----------------- MODELS TAB -----------------
    'models.version': 'Phiên bản:',
    'models.algorithm': 'Thuật toán:',
    'models.trained': 'Đã train:',
    'models.samples': 'Mẫu:',
    'models.selectVersion': 'Chọn phiên bản kiểm thử:',
    'models.coreKpisTitle': '6 thông số đánh giá mô hình cốt lõi',
    'models.coreKpisSubtitle': 'Đo đạc và thẩm định độc lập theo từng chu kỳ kiểm thử',
    'models.kpiAccuracy': 'Accuracy (Độ chính xác)',
    'models.kpiInference': 'Inference time (Độ trễ suy luận)',
    'models.kpiModelSize': 'Model size (Dung lượng)',
    'models.kpiRam': 'RAM usage (Bộ nhớ RAM)',
    'models.kpiPreproc': 'Preprocessing (Phương pháp xử lý)',
    'models.kpiNorm': 'Normalization (Chuẩn hóa tham số)',
    'models.realtimeReady': 'Realtime ready (< 20ms)',
    'models.ramUsageDetail': 'Chiếm < 5% tài nguyên SRAM',
    'models.radarTitle': 'Radar đánh giá đa chiều',
    'models.cmTitle': 'Ma trận nhầm lẫn (Confusion Matrix)',
    'models.cmActualPred': 'Thực tế \\ Dự đoán',
    'models.cmLow': 'Low (Thấp)',
    'models.cmMed': 'Medium (Vừa)',
    'models.cmHigh': 'High (Cao)',
    'models.precision': 'Precision:',
    'models.recall': 'Recall:',
    'models.f1': 'F1-score:',
    'models.tblTitle': 'Bảng so sánh kiến trúc & phương pháp tiền xử lý',
    'models.thModel': 'Mô hình & kiến trúc',
    'models.thPreproc': '1. Preprocessing',
    'models.thNorm': '2. Normalization',
    'models.thSize': '3. Size',
    'models.thRam': '4. RAM',
    'models.thLatency': '5. Độ trễ',
    'models.thAcc': '6. Acc',
    'models.thStatus': 'Trạng thái',

    // ----------------- MOBILE TAB -----------------
    'mobile.title': 'Trình giả lập ProWatch Mobile App',
    'mobile.subtitle': 'Trải nghiệm và tương tác trực tiếp ứng dụng ProWatch Health trên khung điện thoại mô phỏng',
    'mobile.zoomOut': 'Thu nhỏ tỉ lệ',
    'mobile.fitScreen': 'Vừa màn hình',
    'mobile.zoomIn': 'Phóng to tỉ lệ',
    'mobile.center': 'Căn giữa',
    'mobile.showFeed': 'Hiện bảng tin',
    'mobile.reload': 'Tải lại',
    'mobile.fullscreen': 'Toàn màn hình (F11)',
    'mobile.exitFullscreen': 'Thoát toàn màn hình (Esc)',
    'mobile.newTab': 'Tab riêng',
    'mobile.launching': 'Đang khởi chạy ProWatch Health...',
    'mobile.retry': 'Thử lại',
    'mobile.openPort': 'Mở cổng 8085 ↗',
    'mobile.statusTitle': 'Trạng thái kết nối & Vận hành',
    'mobile.statusDesc': 'Ứng dụng di động đang chạy trực tiếp từ mã nguồn React Native (Expo Web) tại cổng 8085. Bạn có thể tương tác đầy đủ như trên điện thoại thật: chuyển đổi các tab, xem chỉ số sinh tồn và trạng thái thiết bị.',
    'mobile.port': 'Cổng phục vụ',
    'mobile.framework': 'Framework',
    'mobile.database': 'Cơ sở dữ liệu',
    'mobile.aiModel': 'Model AI',
    'mobile.modulesTitle': 'Các phân hệ tính năng trên Mobile App',
    'mobile.modVitals': 'Tổng quan sinh tồn:',
    'mobile.modVitalsDesc': 'Hiển thị Nhịp tim (BPM) và Oxy trong máu (SpO2) từ cảm biến quang học MAX30102.',
    'mobile.modSleep': 'Hoạt động & Giấc ngủ:',
    'mobile.modSleepDesc': 'Theo dõi bước chân tích lũy, calo tiêu hao và chu kỳ ngủ.',
    'mobile.modHar': 'Nhận diện vận động AI:',
    'mobile.modHarDesc': 'Phân loại hành vi thời gian thực từ cảm biến gia tốc MPU6050.',
    'mobile.modSecurity': 'Bảo mật & Cài đặt:',
    'mobile.modSecurityDesc': 'Xác thực đa yếu tố (MFA), cài đặt ngưỡng cảnh báo nhịp tim bất thường.',
    'mobile.downloadApk': 'Tải APK',
    'mobile.downloadModalTitle': 'Tải Ứng Dụng ProWatch Health (APK)',
    'mobile.scanQrDesc': 'Quét mã QR bằng camera hoặc trình duyệt điện thoại để tự động tải trực tiếp file APK phiên bản mới nhất từ GitHub Releases.',
    'mobile.directDownload': 'Tải trực tiếp APK',
    'mobile.viewReleases': 'Xem trên GitHub Releases',
    'mobile.scanTip': 'Hỗ trợ Android 8.0+ (ARM64)',

    // ----------------- FOOTER -----------------
    'footer.copyright': '© 2026 ProWatch AI Studio. All rights reserved.',
  },
  en: {
    // ----------------- NAVBAR -----------------
    'nav.prototype': 'Prototype',
    'nav.datasheet': 'Data Sheet',
    'nav.history': 'History',
    'nav.pipeline': 'n8n Automation',
    'nav.models': 'AI & Metrics',
    'nav.mobile': 'Run Mobile',

    // ----------------- PROTOTYPE TAB -----------------
    'proto.title': 'PROWATCH 3D DIGITAL TWIN & HARDWARE PROTOTYPE',
    'proto.subtitle': 'Interactive 3D Hardware Model • Live touch keys, mechanical power switch & Pip-Boy watch face',
    'proto.view': 'CAMERA VIEW:',
    'proto.viewPerspective': 'Perspective (3/4)',
    'proto.viewFront': 'Front',
    'proto.viewBack': 'Back Sensor',
    'proto.viewSide': 'Side',
    'proto.rotate360': 'Rotate 360°',
    'proto.canvasHint': 'Drag to rotate 360° • Scroll to zoom in/out',
    'proto.exploded': 'EXPLODED VIEW PROGRESS:',
    'proto.strapColor': 'SILICONE STRAP COLOR:',
    'proto.strapObsidian': 'Obsidian Black',
    'proto.strapMidnight': 'Midnight Blue',
    'proto.strapNavy': 'Navy Blue',
    'proto.strapCrimson': 'Crimson Red',
    'proto.detailHeader': 'HARDWARE COMPONENT DETAILS',
    'proto.detailSubtitle': 'Select a component to inspect technical specifications',
    'proto.listHeader': 'HARDWARE COMPONENT DIRECTORY',
    'proto.specHeader': 'Hardware Technical Specifications',
    'proto.firmwareRole': 'Firmware Role (ESP-IDF / Arduino):',
    'proto.connectionBus': 'Connection Bus & Signal Pins:',
    'proto.emptyDetail': 'Click on a component in the list to view its engineering specifications',

    // ----------------- DATA SHEET TAB -----------------
    'data.title': 'Data Sheet & WESAD PPG Sensor Repository',
    'data.subtitle': 'Empirical physiological dataset from 15 subjects (S1–S15) with optical PPG and 3-axis accelerometer',
    'data.catProcessed': 'Processed Dataset (ML-Ready)',
    'data.catProcessedDesc': 'Preprocessed, noise-filtered, Z-score normalized data with clinical health risk stratification labels',
    'data.catRaw': 'Raw Sensor Data (Raw Streams)',
    'data.catRawDesc': 'Physical sensor signals (PPG 64Hz, HR, ACC 32Hz, EDA, TEMP, S1–S15)',
    'data.filterSubject': 'Filter by Subject:',
    'data.subjectAll': 'All (15 Subjects)',
    'data.subject': 'Subject:',
    'data.statsHeader': 'Dataset Statistical Overview',
    'data.statsSamples': 'Total Samples',
    'data.statsSampling': 'Sampling Rate',
    'data.statsFeatures': 'Feature Fields',
    'data.statsQuality': 'Signal Quality',
    'data.searchPlaceholder': 'Search in dataset...',
    'data.exportCSV': 'Export CSV',
    'data.totalRows': 'Total Rows:',
    'data.page': 'Page',
    'data.jumpTo': 'Jump to',
    'data.copySheet': 'Copy Sheet',
    'data.copied': 'Copied',
    'data.exportCsv': 'Export CSV',
    'data.statsMean': 'Mean Value',
    'data.freqPrefix': 'Frequency:',
    'data.minPrefix': 'Min:',
    'data.maxPrefix': 'Max:',
    'data.waveform': 'Signal Waveform',
    'data.filterBtn': 'Filter',

    // ----------------- HISTORY TAB -----------------
    'history.title': 'Sensor Measurement History',
    'history.subtitle': 'Real-time database query',
    'history.synced': 'Synced at',
    'history.total': 'Total',
    'history.records': 'records',
    'history.refresh': 'Refresh',
    'history.loading': 'Loading...',
    'history.export': 'Export CSV',
    'history.search': 'Search by ID, timestamp...',
    'history.filterAll': 'All statuses',
    'history.statusNormal': 'Normal (Stable)',
    'history.statusWarning': 'Warning (Heart Rate / SpO2)',
    'history.thRecord': 'Record',
    'history.thDevice': 'Device ID',
    'history.thTime': 'Timestamp',
    'history.thHeartRate': 'Heart Rate (BPM)',
    'history.thSpo2': 'SpO₂ (%)',
    'history.thAccel': 'MPU6050 Accel',
    'history.thStatus': 'Status',
    'history.noData': 'No matching measurement records found.',

    // ----------------- PIPELINE TAB -----------------
    'pipe.title': 'Automation Workflow: TinyML Training & Firmware Deployment',
    'pipe.subtitle': '17-node n8n orchestrator: Ingestion → Preprocessing → Train TinyML MLP → Quality Gate → C Header Export',
    'pipe.runnerLogs': 'Runner Logs',
    'pipe.executeWorkflow': 'Execute workflow',
    'pipe.executing': 'Executing workflow...',
    'pipe.historyTitle': 'n8n Workflow Execution History',
    'pipe.historySubtitle': 'Total recent execution runs',
    'pipe.thExecutionId': 'Execution ID',
    'pipe.thWorkflow': 'Workflow',
    'pipe.thTrigger': 'Trigger',
    'pipe.thTime': 'Timestamp',
    'pipe.thDuration': 'Duration',
    'pipe.thSamples': 'Processed Samples',
    'pipe.thStatus': 'Status',
    'pipe.thMessage': 'Message / Result',
    'pipe.thLogs': 'Runner logs',
    'pipe.viewLogs': 'View logs',
    'pipe.statusSuccess': 'Success',
    'pipe.statusFailed': 'Failed',
    'pipe.statusRunning': 'Running',
    'pipe.filterAll': 'All',
    'pipe.filterSuccess': 'Success',
    'pipe.filterError': 'Failed',
    'pipe.searchPlaceholder': 'Search ID, trigger, result...',
    'pipe.emptyTitle': 'No execution runs found',
    'pipe.emptyDesc': 'Try changing the status filter or search query.',
    'pipe.samplesSuffix': 'samples',
    'pipe.filterLogsPlaceholder': 'Filter logs...',
    'pipe.autoScroll': 'Auto-scroll',
    'pipe.copyLogs': 'Copy',
    'pipe.copiedLogs': 'Copied',
    'pipe.reRun': 'Re-run',
    'pipe.selectedNode': 'Selected Node',
    'pipe.statusCompleted': 'Completed',
    'pipe.totalSteps': 'Total steps:',
    'pipe.closePanel': 'Close panel',
    'pipe.expandPanel': 'Expand fullscreen',
    'pipe.minimizePanel': 'Minimize panel',

    // ----------------- MODELS TAB -----------------
    'models.version': 'Version:',
    'models.algorithm': 'Algorithm:',
    'models.trained': 'Trained:',
    'models.samples': 'Samples:',
    'models.selectVersion': 'Select Model Evaluation Version:',
    'models.coreKpisTitle': '6 Core Model Evaluation KPIs',
    'models.coreKpisSubtitle': 'Independently measured and benchmarked per test cycle',
    'models.kpiAccuracy': 'Accuracy',
    'models.kpiInference': 'Inference Latency',
    'models.kpiModelSize': 'Model Size',
    'models.kpiRam': 'RAM Usage',
    'models.kpiPreproc': 'Preprocessing Method',
    'models.kpiNorm': 'Parameter Normalization',
    'models.realtimeReady': 'Realtime ready (< 20ms)',
    'models.ramUsageDetail': 'Uses < 5% SRAM capacity',
    'models.radarTitle': 'Multidimensional Radar Evaluation',
    'models.cmTitle': 'Confusion Matrix',
    'models.cmActualPred': 'Actual \\ Predicted',
    'models.cmLow': 'Low',
    'models.cmMed': 'Medium',
    'models.cmHigh': 'High',
    'models.precision': 'Precision:',
    'models.recall': 'Recall:',
    'models.f1': 'F1-score:',
    'models.tblTitle': 'Architecture Comparison & Preprocessing Methods',
    'models.thModel': 'Model & Architecture',
    'models.thPreproc': '1. Preprocessing',
    'models.thNorm': '2. Normalization',
    'models.thSize': '3. Size',
    'models.thRam': '4. RAM',
    'models.thLatency': '5. Latency',
    'models.thAcc': '6. Acc',
    'models.thStatus': 'Status',

    // ----------------- MOBILE TAB -----------------
    'mobile.title': 'ProWatch Mobile App Simulator',
    'mobile.subtitle': 'Experience and interact directly with ProWatch Health app on a simulated phone chassis',
    'mobile.zoomOut': 'Zoom Out',
    'mobile.fitScreen': 'Fit Screen',
    'mobile.zoomIn': 'Zoom In',
    'mobile.center': 'Center',
    'mobile.showFeed': 'Show Info',
    'mobile.reload': 'Reload',
    'mobile.fullscreen': 'Fullscreen (F11)',
    'mobile.exitFullscreen': 'Exit Fullscreen (Esc)',
    'mobile.newTab': 'Open in Tab',
    'mobile.launching': 'Launching ProWatch Health...',
    'mobile.retry': 'Retry',
    'mobile.openPort': 'Open :8085 ↗',
    'mobile.statusTitle': 'Connection & Runtime Status',
    'mobile.statusDesc': 'Mobile app is running directly from React Native (Expo Web) source code at port 8085. Fully interactive: switch tabs, inspect vital signs, and monitor device health.',
    'mobile.port': 'Serving Port',
    'mobile.framework': 'Framework',
    'mobile.database': 'Database',
    'mobile.aiModel': 'AI Model',
    'mobile.modulesTitle': 'Mobile App Feature Modules',
    'mobile.modVitals': 'Vital Signs Overview:',
    'mobile.modVitalsDesc': 'Displays Heart Rate (BPM) and Blood Oxygen (SpO2) from optical MAX30102 sensor.',
    'mobile.modSleep': 'Activity & Sleep:',
    'mobile.modSleepDesc': 'Tracks cumulative step counts, burned calories, and sleep cycles.',
    'mobile.modHar': 'AI Activity Recognition:',
    'mobile.modHarDesc': 'Real-time human activity classification from MPU6050 accelerometer.',
    'mobile.modSecurity': 'Security & Settings:',
    'mobile.modSecurityDesc': 'Multi-factor authentication (MFA) and customizable abnormal vital warning thresholds.',
    'mobile.downloadApk': 'Download APK',
    'mobile.downloadModalTitle': 'Download ProWatch Health App (APK)',
    'mobile.scanQrDesc': 'Scan the QR code with your phone camera or browser to automatically download the latest APK release directly from GitHub Releases.',
    'mobile.directDownload': 'Direct Download APK',
    'mobile.viewReleases': 'View GitHub Releases',
    'mobile.scanTip': 'Requires Android 8.0+ (ARM64)',

    // ----------------- FOOTER -----------------
    'footer.copyright': '© 2026 ProWatch AI Studio. All rights reserved.',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('vi');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('prowatch_lang') as Language;
      if (saved === 'vi' || saved === 'en') {
        setLanguageState(saved);
      }
    } catch {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('prowatch_lang', lang);
    } catch {}
  };

  const t = (key: string): string => {
    return dictionary[language]?.[key] || dictionary['vi']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

// SVG Cờ Việt Nam chuẩn theo tỉ lệ Quốc kỳ (viewBox 24x16)
export const FlagVN: React.FC<{ className?: string }> = ({ className = 'w-4 h-2.5' }) => (
  <svg
    className={`inline-block overflow-hidden rounded-[2px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.12)] flex-shrink-0 ${className}`}
    viewBox="0 0 24 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="24" height="16" fill="#DA251D" />
    <polygon
      points="12,3.2 13.01,6.32 16.29,6.32 13.64,8.25 14.65,11.37 12,9.44 9.35,11.37 10.36,8.25 7.71,6.32 10.99,6.32"
      fill="#FFFF00"
    />
  </svg>
);

// SVG Cờ Anh (Union Jack) sắc nét (viewBox 24x16)
export const FlagEN: React.FC<{ className?: string }> = ({ className = 'w-4 h-2.5' }) => (
  <svg
    className={`inline-block overflow-hidden rounded-[2px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.12)] flex-shrink-0 ${className}`}
    viewBox="0 0 24 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="24" height="16" fill="#012169" />
    <path d="M0 0L24 16M24 0L0 16" stroke="#FFFFFF" strokeWidth="3" />
    <path d="M0 0L24 16M24 0L0 16" stroke="#C8102E" strokeWidth="1.2" />
    <path d="M12 0V16M0 8H24" stroke="#FFFFFF" strokeWidth="5" />
    <path d="M12 0V16M0 8H24" stroke="#C8102E" strokeWidth="3" />
  </svg>
);
