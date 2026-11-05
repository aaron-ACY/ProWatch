-- ==============================================================================
-- CẬP NHẬT BẢNG PUBLIC.PROFILES: BỔ SUNG CỘT AGE, NOTES VÀ BMI
-- Theo đúng giao diện chỉnh sửa thông tin cá nhân và sức khỏe mới
-- ==============================================================================

-- 1. Thêm các cột age, notes, bmi vào bảng public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age IS NULL OR (age >= 1 AND age <= 130));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bmi NUMERIC(4,1) CHECK (bmi IS NULL OR (bmi >= 5.0 AND bmi <= 80.0));

-- 2. Thêm chú thích cho các cột mới
COMMENT ON COLUMN public.profiles.age IS 'Tuổi của người dùng (tính từ năm sinh hoặc tự nhập)';
COMMENT ON COLUMN public.profiles.notes IS 'Ghi chú sức khỏe, tiền sử bệnh án hoặc lưu ý cá nhân';
COMMENT ON COLUMN public.profiles.bmi IS 'Chỉ số khối cơ thể (BMI = Cân nặng (kg) / [Chiều cao (m)]^2)';

-- 3. Cập nhật hàm handle_new_user để nạp thêm các trường nếu có trong user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, gender, date_of_birth, height, weight, age, notes, bmi)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'gender',
        (NEW.raw_user_meta_data->>'date_of_birth')::date,
        (NEW.raw_user_meta_data->>'height')::numeric,
        (NEW.raw_user_meta_data->>'weight')::numeric,
        (NEW.raw_user_meta_data->>'age')::integer,
        NEW.raw_user_meta_data->>'notes',
        (NEW.raw_user_meta_data->>'bmi')::numeric
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        age = COALESCE(public.profiles.age, EXCLUDED.age),
        notes = COALESCE(public.profiles.notes, EXCLUDED.notes),
        bmi = COALESCE(public.profiles.bmi, EXCLUDED.bmi);
    RETURN NEW;
END;
$$;

