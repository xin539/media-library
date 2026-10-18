import axios from 'axios'
import { useLocale } from '../i18n.js'

const { l } = useLocale()

// 本机打开时访问 localhost；朋友打开时自动使用你的局域网 IP。
export const baseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3000/api`
    : '/api')

const serverOrigin = new URL(baseURL, window.location.origin).origin

// 数据库只保存 /storage/...。显示时始终补成当前后端地址，避免在
// Vite 开发端口、局域网 IP 或其他电脑上错误地请求前端端口/上传者主机。
export function serverFileUrl(value) {
  if (!value || String(value).startsWith('data:') || String(value).startsWith('blob:')) return value || ''
  try {
    const parsed = new URL(String(value), serverOrigin)
    if (parsed.pathname.startsWith('/api/')) return `${serverOrigin}${parsed.pathname}${parsed.search}`
    if (parsed.pathname.startsWith('/storage/')) return ''
    return String(value)
  } catch {
    return String(value)
  }
}

export const request = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 统一取得后端返回的 data。
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      l('连接服务器失败', 'Could not connect to the server', 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')

    return Promise.reject(new Error(message))
  }
)
