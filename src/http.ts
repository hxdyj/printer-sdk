import axios, { Method } from 'axios'
type RequestResult = {
  code: number
  msg: string | undefined
  data: unknown
}

type RequestConfig = {
  headers?: Record<string, unknown>
}

type AxiosRequestConfig = {
  timeout: number
  headers: {}
  method: Method
  url: string
  params?: unknown
  data?: unknown
}
let baseUrl = ''

export function setBaseUrl(url: string) {
  baseUrl = url
}
function getRequestUrl(url: string, config: RequestConfig): string {
  let requestUrl = baseUrl
  //url是否已http开头
  if (url.startsWith('http')) {
    requestUrl = url
  }
  //正常拼接
  else {
    requestUrl += url
  }
  return requestUrl
}
const http = function <T>(method: Method, url: string, params: unknown, requestConfig?: RequestConfig): Promise<T> {
  const config: RequestConfig = {}
  Object.assign(config, requestConfig)
  const requestUrl = getRequestUrl(url, config)
  const headers = {}
  if (config.headers) {
    Object.assign(headers, config.headers)
  }

  const axiosRequestConfig: AxiosRequestConfig = {
    timeout: 120000,
    headers,
    method: method,
    url: requestUrl,
  }

  if (String.prototype.toUpperCase.call(method) === 'GET') {
    axiosRequestConfig.params = params
  } else {
    axiosRequestConfig.data = params
  }

  const request = new Promise<T>((resolve, reject) => {
    axios
      .request<RequestResult>(axiosRequestConfig)
      .then(resp => {
        if (resp.data.code === 200) {
          resolve(resp.data.data as T)
        } else {
          reject(resp.data)
        }
      })
      .catch(err => {
        reject(err)
      })
  })
  return request
}
export default http
