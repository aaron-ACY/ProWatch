-- Sửa đổi chính sách RLS cho bảng public.devices
-- Cho phép mọi người dùng (kể cả chuyển đổi tài khoản) xem, đăng ký và cập nhật trạng thái đồng hồ phần cứng

DROP POLICY IF EXISTS "Users can view claimed devices or unassigned devices" ON public.devices;
CREATE POLICY "Users can view claimed devices or unassigned devices"
    ON public.devices FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can claim or update their devices" ON public.devices;
CREATE POLICY "Users can claim or update their devices"
    ON public.devices FOR UPDATE
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users or devices can register" ON public.devices;
CREATE POLICY "Authenticated users or devices can register"
    ON public.devices FOR INSERT
    WITH CHECK (true);

