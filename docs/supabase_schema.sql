-- ==============================================================================
-- DỰ ÁN SMART WATCH: BẢN THIẾT KẾ DATABASE MỚI (TINH GỌN & HIỆU SUẤT CAO)
-- ==============================================================================
-- Bao gồm 3 bảng nghiệp vụ chính:
-- 1. public.profiles        : Hồ sơ người dùng (chiều cao, cân nặng, thông tin cá nhân)
-- 2. public.devices         : Quản lý phần cứng đồng hồ ESP32 (pin, kết nối, trạng thái)
-- 3. public.health_records  : Dữ liệu sức khỏe hợp nhất (Nhịp tim, SpO2, Bước chân, Calo, Offline Seq)
-- * Lưu ý: 2FA/MFA được Supabase Auth quản lý độc lập tại auth.mfa_factors và user_metadata.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DỌN DẸP TOÀN BỘ CÁC BẢNG CŨ VÀ TRIGGER KHÔNG CẦN THIẾT
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_age(DATE) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

DROP TABLE IF EXISTS public.risk_alerts CASCADE;
DROP TABLE IF EXISTS public.health_readings CASCADE;
DROP TABLE IF EXISTS public.todos CASCADE;
DROP TABLE IF EXISTS public.heart_rate_records CASCADE;
DROP TABLE IF EXISTS public.spo2_records CASCADE;
DROP TABLE IF EXISTS public.health_metrics CASCADE;
DROP TABLE IF EXISTS public.device_configs CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.health_records CASCADE;

-- ------------------------------------------------------------------------------
-- 2. HÀM TIỆN ÍCH DÙNG CHUNG
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. BẢNG PROFILES (HỒ SƠ NGƯỜI DÙNG)
-- ------------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE,
    height NUMERIC(5,2) CHECK (height IS NULL OR (height >= 30 AND height <= 250)),
    weight NUMERIC(5,2) CHECK (weight IS NULL OR (weight >= 10 AND weight <= 300)),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tự động khởi tạo profile khi user mới đăng ký qua Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Bảo mật hàm: Chặn role anon và authenticated gọi trực tiếp qua RPC API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Khôi phục profile cho các tài khoản auth.users hiện hữu
INSERT INTO public.profiles (id, email, full_name)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. BẢNG DEVICES (QUẢN LÝ THIẾT BỊ ĐỒNG HỒ ESP32)
-- ------------------------------------------------------------------------------
CREATE TABLE public.devices (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    device_name TEXT DEFAULT 'XIAO ESP32S3 ProWatch' NOT NULL,
    mac_address TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    model TEXT DEFAULT 'XIAO-ESP32S3' NOT NULL,
    firmware_version TEXT DEFAULT '1.0.0' NOT NULL,
    battery_level INTEGER CHECK (battery_level IS NULL OR (battery_level >= 0 AND battery_level <= 100)),
    is_charging BOOLEAN DEFAULT false NOT NULL,
    connection_mode TEXT DEFAULT 'BLE' NOT NULL,
    ip_address TEXT,
    is_online BOOLEAN DEFAULT false NOT NULL,
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX idx_devices_user_id ON public.devices (user_id);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view claimed devices or unassigned devices"
    ON public.devices FOR SELECT
    USING (user_id IS NULL OR user_id = (SELECT auth.uid()));

CREATE POLICY "Users can claim or update their devices"
    ON public.devices FOR UPDATE
    USING (user_id IS NULL OR user_id = (SELECT auth.uid()))
    WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

CREATE POLICY "Authenticated users or devices can register"
    ON public.devices FOR INSERT
    WITH CHECK (true);

CREATE TRIGGER set_devices_updated_at
    BEFORE UPDATE ON public.devices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Khởi tạo thiết bị mẫu mặc định của dự án (đầy đủ tất cả các cột, không để NULL)
INSERT INTO public.devices (
    device_id,
    device_name,
    mac_address,
    model,
    firmware_version,
    battery_level,
    is_charging,
    connection_mode,
    ip_address,
    is_online,
    last_heartbeat
)
VALUES (
    'XIAO-ESP32S3-PROWATCH-01',
    'ProWatch-S3 (XIAO ESP32-S3)',
    'DC:54:75:E3:S3:01',
    'Seeed XIAO ESP32-S3',
    'v1.5.3-max30102-no-offline',
    90,
    false,
    'BLE',
    'BLE-GATT-DIRECT',
    true,
    timezone('utc', now())
)
ON CONFLICT (device_id) DO UPDATE SET
    device_name = COALESCE(public.devices.device_name, EXCLUDED.device_name),
    mac_address = COALESCE(public.devices.mac_address, EXCLUDED.mac_address),
    model = COALESCE(public.devices.model, EXCLUDED.model),
    firmware_version = COALESCE(public.devices.firmware_version, EXCLUDED.firmware_version),
    battery_level = COALESCE(public.devices.battery_level, EXCLUDED.battery_level),
    is_charging = COALESCE(public.devices.is_charging, EXCLUDED.is_charging),
    connection_mode = COALESCE(public.devices.connection_mode, EXCLUDED.connection_mode),
    ip_address = COALESCE(public.devices.ip_address, EXCLUDED.ip_address),
    last_heartbeat = COALESCE(public.devices.last_heartbeat, EXCLUDED.last_heartbeat);

-- ------------------------------------------------------------------------------
-- 5. BẢNG HEALTH_RECORDS (HỢP NHẤT DỮ LIỆU ĐO SỨC KHỎE: NHỊP TIM, SPO2)
-- ------------------------------------------------------------------------------
CREATE TABLE public.health_records (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    device_id TEXT REFERENCES public.devices(device_id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    heart_rate INTEGER CHECK (heart_rate IS NULL OR (heart_rate >= 30 AND heart_rate <= 250)),
    spo2 INTEGER CHECK (spo2 IS NULL OR (spo2 >= 50 AND spo2 <= 100)),
    risk_score NUMERIC(4,2) CHECK (risk_score IS NULL OR (risk_score >= 0.0 AND risk_score <= 1.0)),
    risk_level TEXT CHECK (risk_level IS NULL OR risk_level IN ('Low', 'Medium', 'High')),
    offline_seq BIGINT,
    recorded_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Chỉ mục tối ưu truy vấn thời gian thực & lịch sử
CREATE INDEX idx_health_records_user_time ON public.health_records (user_id, recorded_at DESC);
CREATE INDEX idx_health_records_device_time ON public.health_records (device_id, recorded_at DESC);

-- Ràng buộc chống trùng lặp khi đồng bộ offlineseq (BLE / WiFi)
CREATE UNIQUE INDEX idx_health_records_device_seq 
    ON public.health_records (device_id, offline_seq) 
    WHERE offline_seq IS NOT NULL;

ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health records"
    ON public.health_records FOR SELECT
    USING (user_id IS NULL OR user_id = (SELECT auth.uid()));

CREATE POLICY "Users or services can insert health records"
    ON public.health_records FOR INSERT
    WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own health records"
    ON public.health_records FOR DELETE
    USING (user_id IS NULL OR user_id = (SELECT auth.uid()));

-- ------------------------------------------------------------------------------
-- 6. BẢNG ACTIVITIES (GHI NHẬN VẬN ĐỘNG & CẢM BIẾN GIA TỐC MPU6050)
-- ------------------------------------------------------------------------------
CREATE TABLE public.activities (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    device_id TEXT REFERENCES public.devices(device_id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity TEXT DEFAULT 'Đứng yên',
    steps INTEGER DEFAULT 0 CHECK (steps IS NULL OR steps >= 0),
    calories NUMERIC(8,2) DEFAULT 0 CHECK (calories IS NULL OR calories >= 0),
    accel_x DOUBLE PRECISION,
    accel_y DOUBLE PRECISION,
    accel_z DOUBLE PRECISION,
    offline_seq BIGINT,
    recorded_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

COMMENT ON TABLE public.activities IS 'Bảng ghi nhận hoạt động vận động và cảm biến MPU6050';
COMMENT ON COLUMN public.activities.activity IS 'Phân loại hoạt động: đi bộ, chạy, leo cầu thang, đứng yên, nghỉ ngơi,...';
COMMENT ON COLUMN public.activities.steps IS 'Số bước chân tích lũy';
COMMENT ON COLUMN public.activities.calories IS 'Lượng calo tiêu thụ (kcal)';
COMMENT ON COLUMN public.activities.accel_x IS 'Gia tốc trục X từ MPU6050 (g hoặc m/s^2)';
COMMENT ON COLUMN public.activities.accel_y IS 'Gia tốc trục Y từ MPU6050 (g hoặc m/s^2)';
COMMENT ON COLUMN public.activities.accel_z IS 'Gia tốc trục Z từ MPU6050 (g hoặc m/s^2)';

-- Chỉ mục tối ưu truy vấn cho activities
CREATE INDEX idx_activities_user_time ON public.activities (user_id, recorded_at DESC);
CREATE INDEX idx_activities_device_time ON public.activities (device_id, recorded_at DESC);
CREATE INDEX idx_activities_activity ON public.activities (activity);
CREATE UNIQUE INDEX idx_activities_device_seq 
    ON public.activities (device_id, offline_seq) 
    WHERE offline_seq IS NOT NULL;

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" 
    ON public.activities FOR SELECT 
    USING (user_id IS NULL OR user_id = (SELECT auth.uid()));

CREATE POLICY "Users or services can insert activities" 
    ON public.activities FOR INSERT 
    WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own activities" 
    ON public.activities FOR UPDATE 
    USING (user_id IS NULL OR user_id = (SELECT auth.uid()))
    WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own activities" 
    ON public.activities FOR DELETE 
    USING (user_id IS NULL OR user_id = (SELECT auth.uid()));

GRANT ALL ON TABLE public.activities TO anon, authenticated, service_role;

-- Kích hoạt Realtime cho bảng health_records, devices và activities để App nhận dữ liệu tức thì
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
