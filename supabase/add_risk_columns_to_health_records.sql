-- ==============================================================================
-- BỔ SUNG CỘT RISK_SCORE VÀ RISK_LEVEL VÀO BẢNG HEALTH_RECORDS
-- ==============================================================================

-- 1. Thêm cột risk_score (điểm số nguy cơ từ 0.00 đến 1.00)
ALTER TABLE public.health_records 
ADD COLUMN IF NOT EXISTS risk_score NUMERIC(4,2) CHECK (risk_score IS NULL OR (risk_score >= 0.0 AND risk_score <= 1.0));

-- 2. Thêm cột risk_level (phân loại mức độ nguy cơ: Low, Medium, High)
ALTER TABLE public.health_records 
ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IS NULL OR risk_level IN ('Low', 'Medium', 'High'));

-- 3. Thêm chú thích mô tả cho các cột
COMMENT ON COLUMN public.health_records.risk_score IS 'Điểm số rủi ro sức khỏe từ mô hình TinyML AI (0.00: An toàn -> 1.00: Nguy cơ cao)';
COMMENT ON COLUMN public.health_records.risk_level IS 'Mức độ rủi ro sức khỏe phân loại: Low (Thấp), Medium (Trung bình), High (Cao)';

-- 4. Tạo chỉ mục hỗ trợ truy vấn lọc rủi ro sức khỏe
CREATE INDEX IF NOT EXISTS idx_health_records_risk_level ON public.health_records (risk_level);

