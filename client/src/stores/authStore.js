import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import toast from "react-hot-toast";

// 配置 axios 默認設置 - 動態根據當前域名設置API URL
const getApiBaseURL = () => {
  // 如果有環境變量設置，優先使用
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 根據當前域名動態設置API URL
  const currentHost = window.location.hostname;
  const currentPort = window.location.port;
  const currentProtocol = window.location.protocol;
  
  if (currentHost === 'www.gocasm.org') {
    // 生產環境 - 使用相同域名但端口8001
    return `${currentProtocol}//${currentHost}:8001`;
  } else if (currentHost === 'localhost') {
    // 本地開發環境
    return "http://localhost:8001";
  } else {
    // 其他情況，嘗試使用相同域名和端口
    return `${currentProtocol}//${currentHost}${currentPort ? ':' + currentPort : ''}`;
  }
};

axios.defaults.baseURL = getApiBaseURL();
console.log('🌐 API Base URL:', axios.defaults.baseURL);

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
          const response = await axios.post("/api/auth/login", credentials);
          const { token, user } = response.data.data;

          // 設置 axios 默認 header
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success("登入成功！");
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || "登入失敗";
          toast.error(message);
          return { success: false, message };
        }
      },

      // 註冊
      register: async (userData) => {
        try {
          const response = await axios.post("/api/auth/register", userData);
          const { token, user } = response.data.data;

          // 設置 axios 默認 header
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success("註冊成功！");
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || "註冊失敗";
          toast.error(message);
          return { success: false, message };
        }
      },

      // 登出
      logout: () => {
        // 清除 axios header
        delete axios.defaults.headers.common["Authorization"];

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });

        toast.success("已登出");
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
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          // 使用後端驗證端點
          const response = await axios.get('/api/auth/verify');
          const { user } = response.data.data;
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error("Token verification failed:", error);

          // 清除無效的令牌
          delete axios.defaults.headers.common["Authorization"];

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
          user: { ...state.user, ...userData },
        }));
      },

      // 初始化
      initialize: () => {
        const { verifyToken } = get();
        verifyToken();
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// 響應攔截器處理認證錯誤
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { logout } = useAuthStore.getState();
      logout();
      toast.error("登入已過期，請重新登入");
    }
    return Promise.reject(error);
  },
);

export { useAuthStore };
