import axios from "axios";

// Base api instance
const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});
api.defaults.withCredentials = true;

let csrfTokenFetched = false;

const fetchCsrfToken = async (api) => {
  if (csrfTokenFetched) return;  // Prevent fetching the token again if already fetched
  try {
    const response = await api.get('/api/csrf-token'); // Assuming your CSRF token endpoint
    const token = response.data.csrf_token; // Adjust according to your backend response format
    document.cookie = `csrftoken=${token}`; // Store the CSRF token as a cookie
    csrfTokenFetched = true;
    api.defaults.headers.common["X-CSRFToken"] = token;

  } catch (error) {
    console.error('Error fetching CSRF token:', error);
  }
};
fetchCsrfToken(api);


let isRefreshing = false;
let refreshSubscribers: (() => void)[] = [];

function onRefreshed() {
  refreshSubscribers.forEach((callback) => callback());
  refreshSubscribers = [];
}

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 403 || error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push(() => resolve(api(originalRequest)));
        });
      }

      isRefreshing = true;
      try {
        const refreshResponse = await api.post('/api/token/refresh/', {}, {
          withCredentials: true
        });

        onRefreshed();
        return api(originalRequest);
      } catch (refreshError) {
        console.log("Refresh token invalid:", refreshError);
      }
    }

    return Promise.reject(error);
  }
);
// Call getCsrfToken() once when the app starts (e.g., in _app.js or a global state)
export default api;
