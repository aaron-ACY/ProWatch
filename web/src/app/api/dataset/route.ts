import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export const dynamic = 'force-dynamic';

function resolveDatasetDir(): string {
  const candidateDirs = [
    path.resolve(process.cwd(), '../model/riskscore/data'),
    path.resolve(process.cwd(), 'model/riskscore/data'),
    'D:/Spring/smart-watch/model/riskscore/data',
    'D:/kì 6/doc/data/PPG_FieldStudy'
  ];
  for (const d of candidateDirs) {
    if (fs.existsSync(d)) {
      return d;
    }
  }
  return path.resolve(process.cwd(), '../model/riskscore/data');
}

export interface SubjectQuest {
  subjectId: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  skin: number;
  sport: number;
}

export interface ActivitySegment {
  name: string;
  startSec: number;
}

// Helper đọc file quest.csv của một subject
function parseQuestFile(subjectDir: string, subjectId: string): SubjectQuest {
  const questPath = path.join(subjectDir, `${subjectId}_quest.csv`);
  const result: SubjectQuest = {
    subjectId,
    age: 0,
    gender: 'unknown',
    height: 0,
    weight: 0,
    skin: 0,
    sport: 0
  };

  if (!fs.existsSync(questPath)) return result;

  try {
    const content = fs.readFileSync(questPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.replace(/^#\s*/, '').trim();
      if (!trimmed) continue;
      const [key, val] = trimmed.split(',').map(s => s.trim());
      if (!key || !val) continue;

      if (key === 'AGE') result.age = Number(val) || 0;
      else if (key === 'GENDER') result.gender = val.toLowerCase() === 'm' ? 'Nam' : 'Nữ';
      else if (key === 'HEIGHT') result.height = Number(val) || 0;
      else if (key === 'WEIGHT') result.weight = Number(val) || 0;
      else if (key === 'SKIN') result.skin = Number(val) || 0;
      else if (key === 'SPORT') result.sport = Number(val) || 0;
    }
  } catch (err) {
    console.error(`Error reading quest for ${subjectId}:`, err);
  }

  return result;
}

// Helper đọc file activity.csv của một subject
function parseActivityFile(subjectDir: string, subjectId: string): ActivitySegment[] {
  const actPath = path.join(subjectDir, `${subjectId}_activity.csv`);
  const segments: ActivitySegment[] = [];

  if (!fs.existsSync(actPath)) return segments;

  try {
    const content = fs.readFileSync(actPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.replace(/^#\s*/, '').trim();
      if (!trimmed) continue;
      const [name, startStr] = trimmed.split(',').map(s => s.trim());
      if (name && startStr !== undefined && !isNaN(Number(startStr))) {
        segments.push({
          name,
          startSec: Number(startStr)
        });
      }
    }
  } catch (err) {
    console.error(`Error reading activity for ${subjectId}:`, err);
  }

  return segments;
}

// Lấy tên hoạt động tại giây relativeSec
function getActivityAtTime(relativeSec: number, segments: ActivitySegment[]): string {
  if (!segments || segments.length === 0) return 'UNKNOWN';
  let currentActivity = 'NO_ACTIVITY';
  for (const seg of segments) {
    if (relativeSec >= seg.startSec) {
      currentActivity = seg.name;
    } else {
      break;
    }
  }
  return currentActivity;
}

export async function GET(request: NextRequest) {
  try {
    const DATASET_DIR = resolveDatasetDir();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'sheet';
    const subject = searchParams.get('subject') || 'S1';
    const channel = searchParams.get('channel') || 'CLEAN_HEALTH'; // CLEAN_HEALTH, CLEAN_HEALTH_DETAILED, BVP, HR, ACC, EDA, TEMP, IBI, ACTIVITIES, DEMOGRAPHICS
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.max(10, Math.min(500, Number(searchParams.get('limit')) || 100));
    const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();

    if (!fs.existsSync(DATASET_DIR)) {
      return NextResponse.json(
        { error: `Thư mục dataset không tồn tại: ${DATASET_DIR}` },
        { status: 404 }
      );
    }

    // 0. Xử lý hiển thị 2 file CSV sạch: clean_health_dataset.csv & clean_health_dataset_detailed.csv
    if (channel === 'CLEAN_HEALTH' || channel === 'CLEAN_HEALTH_DETAILED') {
      const isDetailed = channel === 'CLEAN_HEALTH_DETAILED';
      const targetFile = isDetailed ? 'clean_health_dataset_detailed.csv' : 'clean_health_dataset.csv';
      const filePath = path.join(DATASET_DIR, targetFile);

      if (!fs.existsSync(filePath)) {
        return NextResponse.json(
          { error: `Không tìm thấy file: ${filePath}` },
          { status: 404 }
        );
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length === 0) {
        return NextResponse.json({
          datasetDir: DATASET_DIR,
          targetFile,
          channel,
          columns: [],
          rows: [],
          pagination: { page: 1, limit, totalRows: 0, totalPages: 0 }
        });
      }

      const headerFields = lines[0].split(',').map(s => s.trim());
      let dataLines = lines.slice(1);

      // Lọc theo đối tượng nếu là file detailed (cột 0 là subject) và subject != 'ALL'
      if (isDetailed && subject && subject !== 'ALL' && subject !== 'All Subjects') {
        dataLines = dataLines.filter(line => line.startsWith(subject + ','));
      }

      // Lọc theo từ khóa tìm kiếm
      if (searchQuery) {
        dataLines = dataLines.filter(line => line.toLowerCase().includes(searchQuery));
      }

      const totalSamples = dataLines.length;
      const startIndex = (page - 1) * limit;
      const endIndex = Math.min(totalSamples, startIndex + limit);
      const pagedLines = dataLines.slice(startIndex, endIndex);

      const getExcelCol = (colIndex: number) => {
        let letter = '';
        let temp = colIndex;
        while (temp >= 0) {
          letter = String.fromCharCode((temp % 26) + 65) + letter;
          temp = Math.floor(temp / 26) - 1;
        }
        return letter;
      };

      let columns: any[] = [
        { key: 'rowNum', label: '#', excelCol: 'A', width: 60, align: 'center' }
      ];

      if (!isDetailed) {
        // clean_health_dataset.csv: heart_rate,spo2,bmi,weight,height,temp,risk_level
        const labelMap: Record<string, { label: string; align: 'left' | 'center' | 'right'; width: number }> = {
          heart_rate: { label: 'Nhịp tim (BPM)', align: 'right', width: 130 },
          spo2: { label: 'SpO2 (%)', align: 'right', width: 110 },
          bmi: { label: 'BMI (kg/m²)', align: 'right', width: 120 },
          weight: { label: 'Cân nặng (kg)', align: 'right', width: 120 },
          height: { label: 'Chiều cao (cm)', align: 'right', width: 120 },
          temp: { label: 'Nhiệt độ (°C)', align: 'right', width: 120 },
          risk_level: { label: 'Mức độ rủi ro (Risk)', align: 'center', width: 160 }
        };

        headerFields.forEach((field, fIdx) => {
          const info = labelMap[field] || { label: field, align: 'left', width: 130 };
          columns.push({
            key: field,
            label: info.label,
            excelCol: getExcelCol(fIdx + 1),
            width: info.width,
            align: info.align
          });
        });
      } else {
        // clean_health_dataset_detailed.csv: 19 trường
        const labelMapDetailed: Record<string, { label: string; align: 'left' | 'center' | 'right'; width: number }> = {
          subject: { label: 'Đối tượng', align: 'center', width: 100 },
          time_sec: { label: 'Thời gian (s)', align: 'right', width: 110 },
          heart_rate: { label: 'Nhịp tim (BPM)', align: 'right', width: 120 },
          spo2: { label: 'SpO2 (%)', align: 'right', width: 100 },
          temp: { label: 'Nhiệt độ (°C)', align: 'right', width: 110 },
          height: { label: 'Chiều cao (cm)', align: 'right', width: 110 },
          weight: { label: 'Cân nặng (kg)', align: 'right', width: 110 },
          bmi: { label: 'BMI', align: 'right', width: 90 },
          activity_label: { label: 'Mã vận động', align: 'center', width: 110 },
          qc_flag: { label: 'QC Flag', align: 'center', width: 90 },
          hr_pts: { label: 'Điểm HR (NEWS2)', align: 'right', width: 120 },
          spo2_pts: { label: 'Điểm SpO2 (NEWS2)', align: 'right', width: 130 },
          temp_pts: { label: 'Điểm Temp (NEWS2)', align: 'right', width: 130 },
          vital_score: { label: 'Tổng điểm sinh tồn', align: 'right', width: 130 },
          vital_level: { label: 'Mức sinh tồn', align: 'center', width: 120 },
          bmi_category: { label: 'Phân loại thể trạng', align: 'center', width: 140 },
          bmi_level: { label: 'Mức độ BMI', align: 'center', width: 110 },
          risk_level: { label: 'Mức độ rủi ro (Risk)', align: 'center', width: 160 },
          label_driver: { label: 'Yếu tố quyết định', align: 'center', width: 140 }
        };

        headerFields.forEach((field, fIdx) => {
          const info = labelMapDetailed[field] || { label: field, align: 'left', width: 120 };
          columns.push({
            key: field,
            label: info.label,
            excelCol: getExcelCol(fIdx + 1),
            width: info.width,
            align: info.align
          });
        });
      }

      const rows = pagedLines.map((line, idx) => {
        const globalIdx = startIndex + idx;
        const parts = line.split(',');
        const rowObj: any = {
          id: globalIdx + 1,
          rowNum: globalIdx + 1
        };
        headerFields.forEach((field, fIdx) => {
          rowObj[field] = parts[fIdx] !== undefined ? parts[fIdx].trim() : '';
        });
        return rowObj;
      });

      // Lấy ~60 điểm cho Sparkline Preview
      const previewStep = Math.max(1, Math.floor(rows.length / 60));
      const chartPreview = rows
        .filter((_, idx) => idx % previewStep === 0)
        .slice(0, 60)
        .map(r => ({
          time: r.time_sec ? `${r.time_sec}s` : `#${r.rowNum}`,
          val: parseFloat(r.heart_rate || 0)
        }));

      return NextResponse.json({
        datasetDir: DATASET_DIR,
        subject: isDetailed ? (subject || 'ALL') : 'All Subjects (32,353 mẫu)',
        channel,
        targetFile,
        columns,
        rows,
        pagination: {
          page,
          limit,
          totalRows: totalSamples,
          totalPages: Math.ceil(totalSamples / limit)
        },
        summaryStats: {
          totalSamples,
          datasetFile: targetFile,
          columnsCount: headerFields.length,
          dataType: isDetailed ? 'Full Multi-modal NEWS2 Features (19 cols)' : 'Clean ML Training Features (7 cols)'
        },
        chartPreview
      });
    }

    // 1. Action list all subjects with demographics
    if (action === 'subjects' || channel === 'DEMOGRAPHICS') {
      const subDirs = fs.readdirSync(DATASET_DIR)
        .filter(f => fs.statSync(path.join(DATASET_DIR, f)).isDirectory() && f.startsWith('S'))
        .sort((a, b) => {
          const numA = Number(a.replace('S', ''));
          const numB = Number(b.replace('S', ''));
          return numA - numB;
        });

      const demographics: SubjectQuest[] = subDirs.map(sId => {
        const sDir = path.join(DATASET_DIR, sId);
        return parseQuestFile(sDir, sId);
      });

      return NextResponse.json({
        datasetDir: DATASET_DIR,
        totalSubjects: subDirs.length,
        subjects: subDirs,
        demographics
      });
    }

    // 2. Action read sheet data for a specific subject and sensor channel
    const subjectDir = path.join(DATASET_DIR, subject);
    if (!fs.existsSync(subjectDir)) {
      return NextResponse.json(
        { error: `Không tìm thấy thư mục đối tượng: ${subject}` },
        { status: 404 }
      );
    }

    const quest = parseQuestFile(subjectDir, subject);
    const activities = parseActivityFile(subjectDir, subject);

    // Xử lý channel ACTIVITIES (dạng sheet hoạt động)
    if (channel === 'ACTIVITIES') {
      let rows = activities.map((act, idx) => ({
        id: idx + 1,
        rowNum: idx + 1,
        activityName: act.name,
        startSec: act.startSec,
        durationEstimated: idx < activities.length - 1 ? `${activities[idx + 1].startSec - act.startSec}s` : 'Until end',
        clockFormat: new Date(act.startSec * 1000).toISOString().substr(11, 8),
        status: act.name.includes('NO_ACTIVITY') ? 'Rest / Transition' : 'Active Protocol'
      }));

      if (searchQuery) {
        rows = rows.filter(r => r.activityName.toLowerCase().includes(searchQuery));
      }

      return NextResponse.json({
        datasetDir: DATASET_DIR,
        subject,
        channel: 'ACTIVITIES',
        quest,
        columns: [
          { key: 'rowNum', label: '#', excelCol: 'A', width: 60, align: 'center' },
          { key: 'activityName', label: 'Tên hoạt động (Protocol Activity)', excelCol: 'B', width: 220, align: 'left' },
          { key: 'startSec', label: 'Mốc thời gian (Giây thứ)', excelCol: 'C', width: 150, align: 'right' },
          { key: 'clockFormat', label: 'Thời gian tương đối (HH:mm:ss)', excelCol: 'D', width: 170, align: 'center' },
          { key: 'durationEstimated', label: 'Thời lượng ước tính', excelCol: 'E', width: 140, align: 'right' },
          { key: 'status', label: 'Phân loại trạng thái', excelCol: 'F', width: 160, align: 'left' }
        ],
        rows,
        pagination: {
          page: 1,
          limit: rows.length,
          totalRows: rows.length,
          totalPages: 1
        },
        summaryStats: {
          totalActivities: activities.length,
          uniqueTypes: Array.from(new Set(activities.map(a => a.name))).length
        }
      });
    }

    // Đọc file từ file zip Empatica E4: `S*_E4.zip`
    const zipPath = path.join(subjectDir, `${subject}_E4.zip`);
    if (!fs.existsSync(zipPath)) {
      return NextResponse.json(
        { error: `Không tìm thấy file nén E4: ${zipPath}` },
        { status: 404 }
      );
    }

    const zip = new AdmZip(zipPath);
    const targetFileName = `${channel}.csv`;
    const entry = zip.getEntry(targetFileName);

    if (!entry) {
      return NextResponse.json(
        { error: `Không tìm thấy file ${targetFileName} trong ${zipPath}` },
        { status: 404 }
      );
    }

    const fileContent = entry.getData().toString('utf8');
    const rawLines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (rawLines.length < 2) {
      return NextResponse.json({
        subject,
        channel,
        columns: [],
        rows: [],
        pagination: { page: 1, limit, totalRows: 0, totalPages: 0 }
      });
    }

    // Đọc Header metadata của Empatica E4
    const startTimestamp = parseFloat(rawLines[0].split(',')[0].trim());
    const sampleRate = parseFloat(rawLines[1].split(',')[0].trim());
    const dataLines = rawLines.slice(2);
    const totalSamples = dataLines.length;

    // Phân trang
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(totalSamples, startIndex + limit);
    const pagedLines = dataLines.slice(startIndex, endIndex);

    // Tính thống kê sơ bộ trên 1000 mẫu đầu hoặc toàn dải
    let minVal = Infinity;
    let maxVal = -Infinity;
    let sumVal = 0;
    const checkSampleCount = Math.min(2000, totalSamples);
    for (let i = 0; i < checkSampleCount; i++) {
      const v = parseFloat(dataLines[i].split(',')[0]);
      if (!isNaN(v)) {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
        sumVal += v;
      }
    }
    const meanVal = checkSampleCount > 0 ? sumVal / checkSampleCount : 0;

    // Định dạng các cột theo từng kênh cảm biến
    let columns = [];
    let rows: any[] = [];

    if (channel === 'BVP') {
      // Blood Volume Pulse: PPG sóng quang học 64Hz
      columns = [
        { key: 'rowNum', label: '#', excelCol: 'A', width: 60, align: 'center' },
        { key: 'sampleIdx', label: 'Sample Index (Mẫu)', excelCol: 'B', width: 120, align: 'right' },
        { key: 'relTime', label: 'Thời gian (s)', excelCol: 'C', width: 110, align: 'right' },
        { key: 'clockTime', label: 'Giờ đo thực tế', excelCol: 'D', width: 150, align: 'center' },
        { key: 'bvp', label: 'PPG BVP Amplitude (Áp lực mạch)', excelCol: 'E', width: 180, align: 'right' },
        { key: 'activity', label: 'Hoạt động hiện tại (Label)', excelCol: 'F', width: 160, align: 'left' }
      ];

      rows = pagedLines.map((line, idx) => {
        const globalIdx = startIndex + idx;
        const relSec = sampleRate > 0 ? globalIdx / sampleRate : globalIdx;
        const absTime = new Date((startTimestamp + relSec) * 1000).toLocaleTimeString('vi-VN', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2
        });
        const bvpVal = parseFloat(line) || 0;
        const act = getActivityAtTime(relSec, activities);

        return {
          id: globalIdx + 1,
          rowNum: globalIdx + 1,
          sampleIdx: globalIdx,
          relTime: relSec.toFixed(3),
          clockTime: absTime,
          bvp: bvpVal.toFixed(2),
          activity: act
        };
      });
    } else if (channel === 'HR') {
      // Heart Rate 1Hz
      columns = [
        { key: 'rowNum', label: '#', excelCol: 'A', width: 60, align: 'center' },
        { key: 'sampleIdx', label: 'Sample Index (Giây thứ)', excelCol: 'B', width: 130, align: 'right' },
        { key: 'relTime', label: 'Thời gian (s)', excelCol: 'C', width: 110, align: 'right' },
        { key: 'clockTime', label: 'Giờ đo thực tế', excelCol: 'D', width: 150, align: 'center' },
        { key: 'hr', label: 'Nhịp tim (BPM)', excelCol: 'E', width: 140, align: 'right' },
        { key: 'zone', label: 'Vùng nhịp tim', excelCol: 'F', width: 140, align: 'center' },
        { key: 'activity', label: 'Hoạt động (Activity)', excelCol: 'G', width: 160, align: 'left' }
      ];

      rows = pagedLines.map((line, idx) => {
        const globalIdx = startIndex + idx;
        const relSec = sampleRate > 0 ? globalIdx / sampleRate : globalIdx;
        const absTime = new Date((startTimestamp + relSec) * 1000).toLocaleTimeString('vi-VN', {
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const hrVal = parseFloat(line) || 0;
        const act = getActivityAtTime(relSec, activities);

        let zone = 'Bình thường';
        if (hrVal > 140) zone = 'Vận động mạnh (Anaerobic)';
        else if (hrVal > 115) zone = 'Hiếu khí (Aerobic)';
        else if (hrVal > 90) zone = 'Khởi động (Warm-up)';
        else if (hrVal < 60) zone = 'Nhịp chậm (Bradycardia)';

        return {
          id: globalIdx + 1,
          rowNum: globalIdx + 1,
          sampleIdx: globalIdx,
          relTime: relSec.toFixed(1),
          clockTime: absTime,
          hr: hrVal.toFixed(1),
          zone,
          activity: act
        };
      });
    } else if (channel === 'ACC') {
      // Accelerometer 32Hz (X, Y, Z)
      columns = [
        { key: 'rowNum', label: '#', excelCol: 'A', width: 60, align: 'center' },
        { key: 'sampleIdx', label: 'Index', excelCol: 'B', width: 90, align: 'right' },
        { key: 'relTime', label: 'Thời gian (s)', excelCol: 'C', width: 110, align: 'right' },
        { key: 'clockTime', label: 'Giờ đo thực tế', excelCol: 'D', width: 150, align: 'center' },
        { key: 'accX', label: 'Gia tốc X (1/64g)', excelCol: 'E', width: 130, align: 'right' },
        { key: 'accY', label: 'Gia tốc Y (1/64g)', excelCol: 'F', width: 130, align: 'right' },
        { key: 'accZ', label: 'Gia tốc Z (1/64g)', excelCol: 'G', width: 130, align: 'right' },
        { key: 'magnitude', label: 'Tổng lực g (|a|)', excelCol: 'H', width: 130, align: 'right' },
        { key: 'activity', label: 'Hoạt động', excelCol: 'I', width: 160, align: 'left' }
      ];

      rows = pagedLines.map((line, idx) => {
        const globalIdx = startIndex + idx;
        const parts = line.split(',').map(s => parseFloat(s.trim()));
        const accX = parts[0] || 0;
        const accY = parts[1] || 0;
        const accZ = parts[2] || 0;
        const mag = Math.sqrt(accX * accX + accY * accY + accZ * accZ) / 64.0;
        const relSec = sampleRate > 0 ? globalIdx / sampleRate : globalIdx;
        const absTime = new Date((startTimestamp + relSec) * 1000).toLocaleTimeString('vi-VN', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2
        });
        const act = getActivityAtTime(relSec, activities);

        return {
          id: globalIdx + 1,
          rowNum: globalIdx + 1,
          sampleIdx: globalIdx,
          relTime: relSec.toFixed(3),
          clockTime: absTime,
          accX,
          accY,
          accZ,
          magnitude: mag.toFixed(3) + 'g',
          activity: act
        };
      });
    } else if (channel === 'EDA') {
      // Electrodermal Activity 4Hz (microSiemens)
      columns = [
        { key: 'rowNum', label: '#', excelCol: 'A', width: 60, align: 'center' },
        { key: 'sampleIdx', label: 'Index', excelCol: 'B', width: 100, align: 'right' },
        { key: 'relTime', label: 'Thời gian (s)', excelCol: 'C', width: 110, align: 'right' },
        { key: 'clockTime', label: 'Giờ đo thực tế', excelCol: 'D', width: 150, align: 'center' },
        { key: 'eda', label: 'Dẫn điện da EDA (μS)', excelCol: 'E', width: 160, align: 'right' },
        { key: 'activity', label: 'Hoạt động', excelCol: 'F', width: 160, align: 'left' }
      ];

      rows = pagedLines.map((line, idx) => {
        const globalIdx = startIndex + idx;
        const relSec = sampleRate > 0 ? globalIdx / sampleRate : globalIdx;
        const absTime = new Date((startTimestamp + relSec) * 1000).toLocaleTimeString('vi-VN', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2
        });
        const edaVal = parseFloat(line) || 0;
        const act = getActivityAtTime(relSec, activities);

        return {
          id: globalIdx + 1,
          rowNum: globalIdx + 1,
          sampleIdx: globalIdx,
          relTime: relSec.toFixed(2),
          clockTime: absTime,
          eda: edaVal.toFixed(4),
          activity: act
        };
      });
    } else if (channel === 'TEMP') {
      // Skin Temperature 4Hz (°C)
      columns = [
        { key: 'rowNum', label: '#', excelCol: 'A', width: 60, align: 'center' },
        { key: 'sampleIdx', label: 'Index', excelCol: 'B', width: 100, align: 'right' },
        { key: 'relTime', label: 'Thời gian (s)', excelCol: 'C', width: 110, align: 'right' },
        { key: 'clockTime', label: 'Giờ đo thực tế', excelCol: 'D', width: 150, align: 'center' },
        { key: 'temp', label: 'Nhiệt độ da (°C)', excelCol: 'E', width: 150, align: 'right' },
        { key: 'activity', label: 'Hoạt động', excelCol: 'F', width: 160, align: 'left' }
      ];

      rows = pagedLines.map((line, idx) => {
        const globalIdx = startIndex + idx;
        const relSec = sampleRate > 0 ? globalIdx / sampleRate : globalIdx;
        const absTime = new Date((startTimestamp + relSec) * 1000).toLocaleTimeString('vi-VN', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2
        });
        const tempVal = parseFloat(line) || 0;
        const act = getActivityAtTime(relSec, activities);

        return {
          id: globalIdx + 1,
          rowNum: globalIdx + 1,
          sampleIdx: globalIdx,
          relTime: relSec.toFixed(2),
          clockTime: absTime,
          temp: tempVal.toFixed(2) + ' °C',
          activity: act
        };
      });
    } else {
      // Mặc định hoặc file IBI
      columns = [
        { key: 'rowNum', label: '#', excelCol: 'A', width: 60, align: 'center' },
        { key: 'raw', label: 'Dữ liệu thô', excelCol: 'B', width: 300, align: 'left' }
      ];
      rows = pagedLines.map((line, idx) => ({
        id: startIndex + idx + 1,
        rowNum: startIndex + idx + 1,
        raw: line
      }));
    }

    // Lọc theo từ khóa tìm kiếm nếu có
    if (searchQuery) {
      rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(searchQuery));
    }

    // Lấy ~60 điểm mẫu cho Waveform Sparkline Chart Preview
    const previewStep = Math.max(1, Math.floor(rows.length / 60));
    const chartPreview = rows
      .filter((_, idx) => idx % previewStep === 0)
      .slice(0, 60)
      .map(r => ({
        time: r.clockTime || `${r.relTime}s`,
        val: parseFloat(r.bvp || r.hr || r.accX || r.eda || r.temp || 0)
      }));

    return NextResponse.json({
      datasetDir: DATASET_DIR,
      subject,
      channel,
      quest,
      activitiesCount: activities.length,
      sampleRate,
      startTimestamp,
      columns,
      rows,
      pagination: {
        page,
        limit,
        totalRows: totalSamples,
        totalPages: Math.ceil(totalSamples / limit)
      },
      summaryStats: {
        totalSamples,
        sampleRate: `${sampleRate} Hz`,
        durationHours: (totalSamples / (sampleRate * 3600)).toFixed(2) + ' giờ',
        min: minVal !== Infinity ? minVal.toFixed(2) : '0',
        max: maxVal !== -Infinity ? maxVal.toFixed(2) : '0',
        mean: meanVal.toFixed(2)
      },
      chartPreview
    });

  } catch (error: any) {
    console.error('API Dataset Error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi xử lý dữ liệu dataset' },
      { status: 500 }
    );
  }
}
