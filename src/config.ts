const port = {
  http: 40003,
  https: 40004,
}
const baseUrl = {
  http: `http://127.0.0.1:${port.http}`,
  https: `https://127.0.0.1:${port.https}`,
}
export const G = {
  port,
  baseUrl: location.protocol.startsWith('https') ? baseUrl.https : baseUrl.http,
}
