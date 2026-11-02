#!/usr/bin/env node
/**
 * sync-dataset.mjs
 *
 * Tạo bản dữ liệu "nhẹ" (~40 MB) cho Web Dashboard từ bộ dữ liệu gốc ~23 GB
 * tại model/riskscore/data, để có thể deploy kèm theo Vercel Function.
 *
 * Chỉ copy những file mà /api/dataset thực sự đọc:
 *   - clean_health_dataset.csv, clean_health_dataset_detailed.csv
 *   - S{n}/S{n}_quest.csv, S{n}/S{n}_activity.csv
 *   - S{n}/S{n}_E4.zip (tín hiệu raw Empatica E4) — bỏ qua với cờ --no-raw
 *
 * Bỏ qua các file rất nặng không dùng tới: S{n}.pkl (~1.3 GB), S{n}_RespiBAN.h5 (~250 MB).
 *
 * Cách dùng (chạy trong thư mục web):
 *   npm run sync:dataset            # gồm cả E4.zip
 *   npm run sync:dataset -- --no-raw  # chỉ CSV sạch + quest/activity (~4 MB)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.resolve(WEB_DIR, '..', 'model', 'riskscore', 'data');
const DEST_DIR = path.resolve(WEB_DIR, 'data');
const includeRaw = !process.argv.includes('--no-raw');

if (!fs.existsSync(SRC_DIR)) {
  console.error(`❌ Không tìm thấy dữ liệu gốc: ${SRC_DIR}`);
  process.exit(1);
}

let copied = 0;
let totalBytes = 0;

const copy = (src, dest) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  copied += 1;
  totalBytes += fs.statSync(dest).size;
};

// 1. Hai file CSV sạch ở thư mục gốc
for (const name of ['clean_health_dataset.csv', 'clean_health_dataset_detailed.csv']) {
  const src = path.join(SRC_DIR, name);
  if (fs.existsSync(src)) copy(src, path.join(DEST_DIR, name));
  else console.warn(`⚠️  Thiếu file: ${name}`);
}

// 2. Dữ liệu theo từng đối tượng S1..S15
const subjects = fs
  .readdirSync(SRC_DIR)
  .filter((d) => /^S\d+$/.test(d) && fs.statSync(path.join(SRC_DIR, d)).isDirectory());

for (const sId of subjects) {
  const suffixes = ['_quest.csv', '_activity.csv'];
  if (includeRaw) suffixes.push('_E4.zip');
  for (const suffix of suffixes) {
    const src = path.join(SRC_DIR, sId, `${sId}${suffix}`);
    if (fs.existsSync(src)) copy(src, path.join(DEST_DIR, sId, `${sId}${suffix}`));
  }
}

console.log(
  `✅ Đã đồng bộ ${copied} file (${(totalBytes / 1024 / 1024).toFixed(2)} MB) ` +
    `từ ${subjects.length} đối tượng → ${path.relative(process.cwd(), DEST_DIR) || DEST_DIR}` +
    (includeRaw ? '' : ' (bỏ qua E4.zip)')
);
