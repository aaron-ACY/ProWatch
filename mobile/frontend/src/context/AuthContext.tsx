import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../utils/supabase';
import { mfaService } from '../services/mfaService';
import { supabaseService } from '../services/supabaseService';

export interface HealthProfileData {
  gender: string;
  dateOfBirth: string;
  height: number;
  weight: number;
  notes?: string;
  age?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  isLoading: boolean;
  isMfaPending: boolean;
  mfaFactorId: string | null;
  login: (email?: string, password?: string) => Promise<{ success: boolean; message?: string; requireMfa?: boolean }>;
  verifyMfaLogin: (code: string) => Promise<{ success: boolean; message?: string }>;
  cancelMfaLogin: () => Promise<void>;
  register: (name?: string, email?: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  completeProfile: (data: HealthProfileData) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMfaPending, setIsMfaPending] = useState<boolean>(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [pendingUserData, setPendingUserData] = useState<User | null>(null);

  // Helper nạp thông tin User từ Profile
  const loadUserFromProfile = async (sbUser: any, defaultEmail = ''): Promise<User> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sbUser.id)
      .maybeSingle();

    const displayName = profile?.full_name || sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || defaultEmail.split('@')[0] || 'Thành viên ProWatch';
    const dob = profile?.date_of_birth || sbUser.user_metadata?.date_of_birth;
    const userGender = profile?.gender || sbUser.user_metadata?.gender;
    const userHeight = profile?.height || sbUser.user_metadata?.height;
    const userWeight = profile?.weight || sbUser.user_metadata?.weight;
    const isComplete = Boolean(dob && userGender && (userHeight || sbUser.user_metadata?.isProfileComplete));

    // Tự động liên kết user_id và cập nhật đầy đủ thông tin cho bảng devices trên Supabase
    supabaseService.syncDeviceStatus({ userId: sbUser.id }).catch(() => {});

    return {
      id: sbUser.id,
      name: displayName,
      email: sbUser.email || defaultEmail,
      dateOfBirth: dob,
      gender: userGender,
      height: userHeight,
      weight: userWeight,
      isProfileComplete: isComplete,
      createdAt: sbUser.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    };
  };

  // 1. Kiểm tra phiên đăng nhập khi khởi động App (có kiểm tra AAL 2FA)
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const isMfaActive = session.user.user_metadata?.mfa_enabled !== false;
          const aalRes = await mfaService.getAssuranceLevel();
          if (isMfaActive && aalRes.data && aalRes.data.nextLevel === 'aal2' && aalRes.data.currentLevel !== 'aal2') {
            const factors = await mfaService.listFactors();
            const verifiedFactor = factors.verifiedTotp[0];
            if (verifiedFactor) {
              const pendingUser = await loadUserFromProfile(session.user);
              setPendingUserData(pendingUser);
              setMfaFactorId(verifiedFactor.id);
              setIsMfaPending(true);
              return;
            }
          }

          const loadedUser = await loadUserFromProfile(session.user);
          setUser(loadedUser);
        }
      } catch (err) {
        console.warn('Lỗi phục hồi phiên đăng nhập:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    // Lắng nghe sự kiện thay đổi trạng thái Auth (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setUser(null);
        setIsMfaPending(false);
        setMfaFactorId(null);
        setPendingUserData(null);
        return;
      }

      if (session.user) {
        // Kiểm tra nếu cần AAL2 nhưng chưa xác thực thì không tự động set user
        const isMfaActive = session.user.user_metadata?.mfa_enabled !== false;
        if (isMfaActive) {
          const aalRes = await mfaService.getAssuranceLevel();
          if (aalRes.data && aalRes.data.nextLevel === 'aal2' && aalRes.data.currentLevel !== 'aal2') {
            return;
          }
        }

        const loadedUser = await loadUserFromProfile(session.user);
        setUser(loadedUser);
        setIsMfaPending(false);
        setMfaFactorId(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 2. Hàm Đăng nhập (kèm kiểm tra 2FA)
  const login = async (
    email?: string, 
    password?: string
  ): Promise<{ success: boolean; message?: string; requireMfa?: boolean }> => {
    setIsLoading(true);

    const trimmedEmail = email?.trim();
    const cleanPassword = password?.trim();

    if (!trimmedEmail || !cleanPassword) {
      setIsLoading(false);
      return { success: false, message: 'Vui lòng nhập đầy đủ Email và Mật khẩu.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: cleanPassword,
      });

      if (error) {
        setIsLoading(false);
        const errorMsg = error.message.toLowerCase().includes('invalid login credentials')
          ? 'Email hoặc mật khẩu không chính xác.'
          : error.message;
        return { success: false, message: errorMsg };
      }

      if (data.user) {
        const fullUser = await loadUserFromProfile(data.user, trimmedEmail);

        // Kiểm tra xem tài khoản có bật xác thực 2 bước (2FA) không
        const isMfaActive = data.user.user_metadata?.mfa_enabled !== false;
        const aalRes = await mfaService.getAssuranceLevel();
        if (isMfaActive && aalRes.data && aalRes.data.nextLevel === 'aal2' && aalRes.data.currentLevel !== 'aal2') {
          const factorRes = await mfaService.listFactors();
          const targetFactor = factorRes.verifiedTotp[0];
          if (targetFactor) {
            setPendingUserData(fullUser);
            setMfaFactorId(targetFactor.id);
            setIsMfaPending(true);
            setIsLoading(false);
            return {
              success: true,
              requireMfa: true,
              message: 'Vui lòng nhập mã xác thực 2 bước (2FA).',
            };
          }
        }

        // Đăng nhập bình thường khi không bật 2FA hoặc đã AAL2
        setUser(fullUser);
        setIsLoading(false);
        return { success: true, message: 'Đăng nhập thành công!' };
      }

      setIsLoading(false);
      return { success: false, message: 'Không thể xác thực thông tin tài khoản.' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, message: err.message || 'Lỗi kết nối máy chủ xác thực.' };
    }
  };

  // 3. Hàm Xác thực 2FA khi Đăng nhập
  const verifyMfaLogin = async (code: string): Promise<{ success: boolean; message?: string }> => {
    if (!mfaFactorId) {
      return { success: false, message: 'Không tìm thấy thông tin thiết bị 2FA.' };
    }

    setIsLoading(true);
    const result = await mfaService.verifyTotp(mfaFactorId, code);
    setIsLoading(false);

    if (result.success) {
      if (pendingUserData) {
        setUser(pendingUserData);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const u = await loadUserFromProfile(session.user);
          setUser(u);
        }
      }
      setIsMfaPending(false);
      setMfaFactorId(null);
      setPendingUserData(null);
      return { success: true, message: 'Xác thực 2 bước thành công!' };
    }

    return { success: false, message: result.message };
  };

  // 4. Hủy bỏ xác thực 2FA khi Đăng nhập (Đăng xuất)
  const cancelMfaLogin = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setIsMfaPending(false);
    setMfaFactorId(null);
    setPendingUserData(null);
    setUser(null);
  };

  // 5. Hàm Đăng ký tài khoản
  const register = async (name?: string, email?: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);

    const trimmedName = name?.trim();
    const trimmedEmail = email?.trim();
    const cleanPassword = password?.trim();

    if (!trimmedName) {
      setIsLoading(false);
      return { success: false, message: 'Vui lòng nhập họ và tên của bạn.' };
    }
    if (!trimmedEmail) {
      setIsLoading(false);
      return { success: false, message: 'Vui lòng nhập địa chỉ email hợp lệ.' };
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      setIsLoading(false);
      return { success: false, message: 'Mật khẩu phải chứa ít nhất 6 ký tự.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: cleanPassword,
        options: {
          data: {
            full_name: trimmedName,
            isProfileComplete: false,
          },
        },
      });

      if (error) {
        setIsLoading(false);
        const errorMsg = error.message.toLowerCase().includes('already registered')
          ? 'Email này đã được đăng ký tài khoản. Vui lòng đăng nhập.'
          : error.message;
        return { success: false, message: errorMsg };
      }

      if (data.user) {
        try {
          await supabase.from('profiles').insert([
            {
              id: data.user.id,
              full_name: trimmedName,
              email: trimmedEmail,
              updated_at: new Date().toISOString(),
            },
          ]);
        } catch (dbErr) {
          console.warn('Không thể tự tạo row profiles:', dbErr);
        }

        setUser({
          id: data.user.id,
          name: trimmedName,
          email: trimmedEmail,
          isProfileComplete: false,
          createdAt: new Date().toISOString().split('T')[0],
        });

        setIsLoading(false);
        return { success: true, message: 'Tạo tài khoản thành công!' };
      }

      setIsLoading(false);
      return { success: false, message: 'Không thể tạo tài khoản người dùng.' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, message: err.message || 'Lỗi kết nối máy chủ xác thực.' };
    }
  };

  // 6. Hoàn tất hồ sơ
  const completeProfile = async (data: HealthProfileData): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);

    if (!user) {
      setIsLoading(false);
      return { success: false, message: 'Bạn chưa đăng nhập.' };
    }

    try {
      await supabase.auth.updateUser({
        data: {
          gender: data.gender,
          date_of_birth: data.dateOfBirth,
          height: data.height,
          weight: data.weight,
          isProfileComplete: true,
        },
      });

      try {
        await supabase.from('profiles').update({
          gender: data.gender,
          date_of_birth: data.dateOfBirth,
          height: data.height,
          weight: data.weight,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);
      } catch (e) {
        console.warn('Lỗi update profiles:', e);
      }

      setUser((prev) =>
        prev
          ? {
              ...prev,
              gender: data.gender,
              dateOfBirth: data.dateOfBirth,
              height: data.height,
              weight: data.weight,
              notes: data.notes ?? prev.notes,
              age: data.age ?? prev.age,
              isProfileComplete: true,
            }
          : null
      );

      setIsLoading(false);
      return { success: true, message: 'Cập nhật hồ sơ thành công!' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, message: err.message || 'Lỗi lưu thông tin sức khỏe' };
    }
  };

  // 7. Hàm Đăng xuất
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Lỗi khi đăng xuất Supabase:', err);
    }
    setUser(null);
    setIsMfaPending(false);
    setMfaFactorId(null);
    setPendingUserData(null);
  };

  const isProfileComplete = Boolean(user && user.isProfileComplete);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isProfileComplete,
        isLoading,
        isMfaPending,
        mfaFactorId,
        login,
        verifyMfaLogin,
        cancelMfaLogin,
        register,
        completeProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
