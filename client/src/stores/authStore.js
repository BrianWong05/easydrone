import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import toast from 'react-hot-toast';

// 配置 axios 默認設置 - 移除 baseURL，使用完整路徑
// axios.defaults.baseURL = process.env.REACT_APP_API_URL || '/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // 狀態
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      // 登入
      login: async (credentials) => {
        try {
          const response = await axios.post('/api/auth/login', credentials);
          const { token, user } = response.data.data;

          // 設置 axios 默認 header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success('登入成功！');
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || '登入失敗';
          toast.error(message);
          return { success: false, message };
        }
      },

      // 註冊
      register: async (userData) => {
        try {
          const response = await axios.post('/api/auth/register', userData);
          const { token, user } = response.data.data;

          // 設置 axios 默認 header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success('註冊成功！');
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || '註冊失敗';
          toast.error(message);
          return { success: false, message };
        }
      },

      // 登出
      logout: () => {
        // 清除 axios header
        delete axios.defaults.headers.common['Authorization'];

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });

        toast.success('已登出');
      },

      // 驗證令牌
      verifyToken: async () => {
        const { token } = get();
        
        if (!token) {
          set({ isLoading: false });
          return;
        }

        try {
          // 設置 axios header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // 暫時跳過後端驗證，直接設置為已認證狀態
          // TODO: 實現後端 /auth/verify 端點
          set({
            user: { username: 'admin' }, // 臨時用戶
            isAuthenticated: true,
            isLoading: false,
          });
          
          // 註釋掉的後端驗證代碼
          // const response = await axios.get('/api/auth/verify');
          // const { user } = response.data.data;
          // set({
          //   user,
          //   isAuthenticated: true,
          //   isLoading: false,
          // });
        } catch (error) {
          console.error('Token verification failed:', error);
          
          // 清除無效的令牌
          delete axios.defaults.headers.common['Authorization'];
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      // 更新用戶信息
      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData }
        }));
      },

      // 初始化
      initialize: () => {
        // 暫時跳過自動驗證，直接設置為未載入狀態
        set({ isLoading: false });
        
        // 註釋掉自動驗證，讓用戶手動登入
        // const { verifyToken } = get();
        // verifyToken();
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// 響應攔截器處理認證錯誤
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { logout } = useAuthStore.getState();
      logout();
      toast.error('登入已過期，請重新登入');
    }
    return Promise.reject(error);
  }
);

export { useAuthStore };