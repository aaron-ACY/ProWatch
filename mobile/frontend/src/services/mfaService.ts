import { supabase } from '../utils/supabase';

export interface TotpEnrollmentData {
  factorId: string;
  qrCodeSvg: string;
  secret: string;
  uri: string;
}

export interface MfaStatus {
  isEnrolled: boolean;      // Đã có mã bảo mật 2FA trên Supabase & Authenticator
  isEnabled: boolean;       // Trạng thái BẬT/TẮT thực tế để kiểm tra khi đăng nhập
  factorId?: string;
  factorName?: string;
  currentLevel: string;
  nextLevel: string;
}

export const mfaService = {
  /**
   * Lấy cấp độ xác thực bảo mật hiện tại (AAL1: mật khẩu, AAL2: đã qua 2FA)
   */
  async getAssuranceLevel() {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.warn('Lỗi lấy Authenticator Assurance Level:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Lấy danh sách các factor 2FA đã đăng ký của user
   */
  async listFactors() {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verifiedTotp = data.totp.filter(f => f.status === 'verified');
      return { 
        success: true, 
        totp: data.totp, 
        verifiedTotp,
        all: data.all 
      };
    } catch (err: any) {
      console.warn('Lỗi lấy danh sách MFA factors:', err);
      return { success: false, error: err.message, totp: [], verifiedTotp: [], all: [] };
    }
  },

  /**
   * Kiểm tra xem user hiện tại đã kích hoạt 2FA hay chưa
   */
  async getMfaStatus(): Promise<MfaStatus> {
    try {
      const [levelRes, factorsRes, userRes] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
        supabase.auth.getUser(),
      ]);

      const currentLevel = levelRes.data?.currentLevel || 'aal1';
      const nextLevel = levelRes.data?.nextLevel || 'aal1';
      const verifiedTotp = factorsRes.data?.totp.find(f => f.status === 'verified');
      const isEnrolled = Boolean(verifiedTotp || nextLevel === 'aal2');

      const userMeta = userRes.data?.user?.user_metadata || {};
      // Nếu user đã từng tắt thì mfa_enabled === false, còn lại nếu đã enroll thì mặc định bật
      const isEnabled = isEnrolled && userMeta.mfa_enabled !== false;

      return {
        isEnrolled,
        isEnabled,
        factorId: verifiedTotp?.id,
        factorName: verifiedTotp?.friendly_name || 'Google / Microsoft Authenticator',
        currentLevel,
        nextLevel,
      };
    } catch (err) {
      return {
        isEnrolled: false,
        isEnabled: false,
        currentLevel: 'aal1',
        nextLevel: 'aal1',
      };
    }
  },

  /**
   * Bật lại 2FA:
   * Nếu đã có factor từ trước -> chỉ cần bật lại cờ mfa_enabled, KHÔNG cần quét lại QR!
   * Nếu chưa từng cài -> needEnroll = true để mở modal quét QR.
   */
  async enableMfa(): Promise<{ success: boolean; needEnroll: boolean }> {
    try {
      const factorsRes = await this.listFactors();
      const hasVerified = factorsRes.verifiedTotp.length > 0;
      await supabase.auth.updateUser({ data: { mfa_enabled: true } });
      if (hasVerified) {
        return { success: true, needEnroll: false };
      }
      return { success: true, needEnroll: true };
    } catch (e) {
      return { success: false, needEnroll: true };
    }
  },

  /**
   * Tắt 2FA:
   * Chỉ tắt cờ kiểm tra khi đăng nhập, KHÔNG XÓA factor trên Supabase
   * để lần sau user bật lại thì ứng dụng Authenticator cũ vẫn dùng được ngay!
   */
  async disableMfa(): Promise<{ success: boolean }> {
    try {
      await supabase.auth.updateUser({ data: { mfa_enabled: false } });
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  },

  /**
   * Bắt đầu quy trình cài đặt 2FA TOTP: sinh mã QR và khóa bí mật
   */
  async startEnrollTotp(friendlyName = 'ProWatch Health Authenticator'): Promise<{
    success: boolean;
    data?: TotpEnrollmentData;
    message?: string;
  }> {
    try {
      // Dọn dẹp các factor unverified cũ trước khi tạo factor mới
      const factorsRes = await supabase.auth.mfa.listFactors();
      if (factorsRes.data?.totp) {
        for (const unverified of factorsRes.data.totp.filter((f: any) => f.status !== 'verified')) {
          await supabase.auth.mfa.unenroll({ factorId: unverified.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName,
        issuer: 'ProWatch Health',
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return {
        success: true,
        data: {
          factorId: data.id,
          qrCodeSvg: data.totp.qr_code,
          secret: data.totp.secret,
          uri: data.totp.uri,
        },
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi khi khởi tạo cấu hình 2FA' };
    }
  },

  /**
   * Xác thực mã 6 số từ ứng dụng Authenticator để hoàn tất kích hoạt 2FA (hoặc khi đăng nhập)
   */
  async verifyTotp(factorId: string, code: string): Promise<{ success: boolean; message?: string }> {
    const cleanCode = code.trim().replace(/\s+/g, '');
    if (!cleanCode || cleanCode.length !== 6) {
      return { success: false, message: 'Mã xác thực phải gồm đúng 6 chữ số.' };
    }

    try {
      // 1. Tạo challenge
      const challengeRes = await supabase.auth.mfa.challenge({ factorId });
      if (challengeRes.error) {
        return { success: false, message: challengeRes.error.message };
      }

      const challengeId = challengeRes.data.id;

      // 2. Xác thực challenge với mã 6 số
      const verifyRes = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: cleanCode,
      });

      if (verifyRes.error) {
        const msg = verifyRes.error.message.toLowerCase().includes('invalid')
          ? 'Mã xác thực không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại đồng hồ Authenticator.'
          : verifyRes.error.message;
        return { success: false, message: msg };
      }

      // 3. Đánh dấu mfa_enabled = true và làm mới session
      await supabase.auth.updateUser({ data: { mfa_enabled: true } });
      await supabase.auth.refreshSession();

      return { success: true, message: 'Xác thực 2FA thành công!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi kiểm tra mã xác thực 2FA' };
    }
  },

  /**
   * Hủy kích hoạt / Xóa hẳn factor (khi user muốn tạo lại mã QR mới từ đầu)
   */
  async unenroll(factorId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        return { success: false, message: error.message };
      }
      await supabase.auth.updateUser({ data: { mfa_enabled: false } });
      await supabase.auth.refreshSession();
      return { success: true, message: 'Đã hủy cấu hình 2FA thành công.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi khi xóa cấu hình 2FA' };
    }
  },
};
