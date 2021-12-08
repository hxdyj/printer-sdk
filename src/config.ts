const port = {
  http: 40003,
  https: 40004,
}
const baseUrl = {
  http: `http://localhost:${port.http}`,
  https: `https://localhost:${port.https}`,
}
export const G = {
  port,
  baseUrl: location.protocol.startsWith('https') ? baseUrl.https : baseUrl.http,
}
