DROP POLICY IF EXISTS "Users can view own health records" ON public.health_records;
CREATE POLICY "Users can view own health records" ON public.health_records FOR SELECT USING (user_id IS NULL OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users or services can insert health records" ON public.health_records;
CREATE POLICY "Users or services can insert health records" ON public.health_records FOR INSERT WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own health records" ON public.health_records;
CREATE POLICY "Users can delete own health records" ON public.health_records FOR DELETE USING (user_id IS NULL OR user_id = (SELECT auth.uid()));

