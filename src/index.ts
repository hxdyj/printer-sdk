import { getPrinters, print } from 'pdf-to-printer'
import http from './http'
import { PaperSizeItem, TrayItem } from './PrinterType'
type UnwrapPromise<T> = T extends Promise<infer V> ? V : T
type UnwrapArray<T> = T extends Array<infer V> ? V : T
type PrintParam = Parameters<typeof print> & {
  paperkind: string
}
export type { PaperSizeItem, TrayItem }
export type PrinterItem = UnwrapArray<UnwrapPromise<ReturnType<typeof getPrinters>>>
export type PrintConfig = PrintParam[1]
enum ErrorCode {
  'VersionInconformity' = 1001,
}
export class Printer {
  private _version = `0.0.1`
  private _instence: Printer | undefined
  isReady: boolean = false
  constructor(conf?: { readyCb?: () => void; instenceCb?: () => void }) {
    this._checkVersion()
    if (this._instence) {
      conf?.instenceCb?.()
      return this._instence
    } else {
      this._instence = this
      conf?.readyCb?.()
      conf?.instenceCb?.()
      return this._instence
    }
  }

  private _checkVersion() {
    return this.getVersion().then(info => {
      if (info.clientVersion && info.sdkVersion && info.clientVersion !== info.sdkVersion) {
        throw new Error(
          JSON.stringify({ code: ErrorCode.VersionInconformity, msg: `client version ${info.clientVersion} is not match to sdk version ${info.sdkVersion}.` })
        )
      }
      if (info.clientVersion && info.sdkVersion && info.clientVersion === info.sdkVersion) {
        this.isReady = true
      }
    })
  }

  async getVersion() {
    let clientVersion = await http<string>('GET', `/version`, {})
    let sdkVersion = this._version
    return {
      clientVersion,
      sdkVersion,
    }
  }

  async getSources() {
    return http<PrinterItem[]>('GET', `/printer/sources`, {})
  }
  async getDefaultPrinter() {
    return http<PrinterItem | null>('GET', `/printer/default`, {})
  }

  async getPaperSizes(printerName: string) {
    return http<PaperSizeItem[]>('POST', `/printer/get/papersizes`, {
      printerName,
    })
  }

  async getTrays(printerName: string) {
    return http<TrayItem[]>('POST', `/printer/get/trays`, {
      printerName,
    })
  }

  async print(fileUrl: string, printConf?: PrintConfig) {
    return http<void>('POST', `/printer/print`, {
      fileUrl,
      printConf,
    })
  }
}
