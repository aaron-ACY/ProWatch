#!/usr/bin/env python3
"""
run_training_service.py - Bộ điều phối tác vụ huấn luyện cục bộ siêu nhẹ (Lightweight Task Runner).
Sử dụng 100% thư viện chuẩn (Standard Library) của Python, KHÔNG cần cài đặt thêm FastAPI hay Uvicorn.
Phục vụ kết nối trực tiếp với n8n chạy trên Docker Desktop qua host.docker.internal:5005.
Hỗ trợ chiến lược dữ liệu HYBRID (Baseline 32k + Supabase Cloud).
"""

import http.server
import subprocess
import json
import sys
from pathlib import Path

# Cấu hình UTF-8 an toàn cho Windows console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

PORT = 5005
BASE_DIR = Path(__file__).resolve().parent

# Ưu tiên sử dụng python.exe trong môi trường ảo (.venv)
venv_python = BASE_DIR / ".venv" / "Scripts" / "python.exe"
PYTHON_EXE = str(venv_python) if venv_python.exists() else sys.executable

TRAIN_SCRIPT = BASE_DIR / "train_model.py"
METRICS_PATH = BASE_DIR / "artifacts" / "training_metrics.json"

class TrainingTaskHandler(http.server.BaseHTTPRequestHandler):
    def _send_json_response(self, status_code: int, data: dict):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"))

    def do_OPTIONS(self):
        self._send_json_response(200, {"status": "OK"})

    def do_GET(self):
        if self.path in ["/", "/health"]:
            self._send_json_response(200, {
                "status": "ONLINE",
                "service": "ProWatch Local Training Runner",
                "engine": "Python Standard Library http.server (No FastAPI required)",
                "python_executable": PYTHON_EXE,
                "endpoints": {
                    "health": "GET /health",
                    "train": "POST /train"
                }
            })
        else:
            self._send_json_response(404, {"error": "Endpoint not found"})

    def do_POST(self):
        if self.path == "/train":
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length) if content_length > 0 else b"{}"
            try:
                payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
            except Exception:
                payload = {}

            epochs = str(payload.get("epochs", 15))
            batch_size = str(payload.get("batch_size", 32))
            
            # Mặc định sử dụng chiến lược HYBRID kết hợp Supabase + Dataset
            data_mode = str(payload.get("data_mode", "hybrid"))
            if payload.get("use_supabase") is True and "data_mode" not in payload:
                data_mode = "hybrid"

            print(f"\n[n8n Trigger] Nhận yêu cầu huấn luyện từ n8n:")
            print(f"  -> Chiến lược dữ liệu: {data_mode.upper()} | Epochs: {epochs} | Batch Size: {batch_size}")
            print(f"  -> Đang thực thi: {TRAIN_SCRIPT.name}...")

            try:
                # Thực thi script huấn luyện Python độc lập
                cmd = [
                    PYTHON_EXE,
                    str(TRAIN_SCRIPT),
                    "--epochs", epochs,
                    "--batch-size", batch_size,
                    "--data-mode", data_mode
                ]
                proc = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    cwd=str(BASE_DIR),
                    encoding="utf-8"
                )

                if proc.returncode == 0 and METRICS_PATH.exists():
                    with open(METRICS_PATH, "r", encoding="utf-8") as f:
                        metrics_data = json.load(f)
                    
                    response_data = {
                        "status": "SUCCESS",
                        "message": f"Quá trình huấn luyện mô hình ({data_mode.upper()}) hoàn thành thành công!",
                        "returncode": proc.returncode,
                        "data_mode": data_mode,
                        "metrics": metrics_data
                    }
                    print("  -> Huấn luyện THÀNH CÔNG! Đã phản hồi JSON về cho n8n.")
                    self._send_json_response(200, response_data)
                else:
                    err_msg = proc.stderr or proc.stdout
                    response_data = {
                        "status": "FAILED",
                        "message": "Huấn luyện gặp lỗi trong quá trình thực thi.",
                        "returncode": proc.returncode,
                        "error_details": err_msg[-1000:] if err_msg else "Unknown execution error"
                    }
                    print("  -> Huấn luyện THẤT BẠI!")
                    self._send_json_response(500, response_data)

            except Exception as e:
                self._send_json_response(500, {
                    "status": "ERROR",
                    "message": f"Ngoại lệ hệ thống: {str(e)}"
                })
        else:
            self._send_json_response(404, {"error": "Endpoint not found"})

def run():
    server_address = ("0.0.0.0", PORT)
    httpd = http.server.HTTPServer(server_address, TrainingTaskHandler)
    print("=" * 70)
    print("  PROWATCH LOCAL TRAINING TASK RUNNER (KHÔNG CẦN FASTAPI)")
    print("=" * 70)
    print(f"  Lắng nghe trên: http://0.0.0.0:{PORT}")
    print(f"  Python executable: {PYTHON_EXE}")
    print(f"  n8n kết nối từ Docker qua: http://host.docker.internal:{PORT}/train")
    print("  Sẵn sàng nhận lệnh kích hoạt huấn luyện từ n8n...")
    print("=" * 70)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nĐã dừng task runner.")
        httpd.server_close()

if __name__ == "__main__":
    run()
