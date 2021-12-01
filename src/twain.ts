import OSS from 'ali-oss'
import { WebTwain } from 'dwt/dist/types/WebTwain'
import { CapabilityDetails, DeviceConfiguration, SourceDetails, ValueAndLabel } from 'dwt/dist/types/WebTwain.Acquire'
import { ElMessage } from 'element-plus'
import { cloneDeep } from 'lodash'
import { UnitTransform } from './unitTransform'
import { getOssUploadFileName, OssConfig } from './upload/upload'
import { ref } from 'vue'
import { EnvName } from '@/config/NodeEnv'
Dynamsoft.DWT.ResourcesPath = 'dwt-resources'
Dynamsoft.DWT.AutoLoad = true
if (import.meta.env.MODE !== EnvName.PRODUCTION) {
  Dynamsoft.DWT.ProductKey = `t0152KQMAAA6Ap26fK2TPFLM97atQ2WlgXZ/3J+PPQ+kta7EgZM7EK0aLcQs25J1ZWUjgfEyfI3mf/4IdIiudNpdnRgTT+ecjwTZExyAWEXKnVFxjuJt3MVoNbvqcpsy6Mx/sH4M+jeGEUduU/YxNN/OxQ/Yzt4YTRm3TzdyY/p5DGuJ+CtlqZhkZThi1Tc18Ne7l1kjPP2jyosI=`
  console.log("Dynamic ProductKey");

} else {
  Dynamsoft.DWT.organizationID = "100777276"
  console.log("Dynamic organizationID");
}
Dynamsoft.DWT.Containers = [{ WebTwainId: 'dwtcontrolContainer', Width: '0px', Height: '0px' }]
Object.assign(Dynamsoft, {
  _show_install_dialog: () => {
    console.log("请安装Dynamic Service");
  }
})
const SCAN_CONF: DeviceConfiguration = {
  IfShowUI: false,
  IfFeederEnabled: true,
  IfDuplexEnabled: true,
  Resolution: 300,
  PixelType: Dynamsoft.DWT.EnumDWT_PixelType.TWPT_BW,
  IfDisableSourceAfterAcquire: true,
}
type Callback = () => void


export class Printer {
  static instance: Printer
  isReady = false
  DWObject!: WebTwain
  sources: SourceDetails[] | string[] = []
  selectedPrinter: SourceDetails | string = ''
  selectedIndex: number | undefined
  capabilities: CapabilityDetails[] = []
  pageSize: number | undefined
  pageInfo: {
    width: number
    height: number
  } | undefined
  scanCount = 0
  constructor(cb?: {
    instenceCb?: Callback
    readyCb?: Callback
    scanCountCallback?: (scanCount: number) => void
  }) {
    if (Printer.instance) {
      cb?.instenceCb?.()
      return Printer.instance
    } else {
      Printer.instance = this
    }
    if (!this.isReady) {
      this.onReady().then(() => {
        this.isReady = true
        console.log('Web Twain is ready.')
        this.DWObject.RegisterEvent('OnPreTransfer', () => {
          this.scanCount++
          cb?.scanCountCallback?.(this.scanCount)
          console.log(`已扫描${this.scanCount}`)
        })
        cb?.readyCb?.()
        cb?.instenceCb?.()
        function closeSource() {
          if (Printer.instance) {
            Printer.instance.DWObject.CloseSource()
          }
        }
        window.addEventListener('beforeunload', closeSource)
        window.addEventListener('unload', closeSource)
      })
    }
    return Printer.instance
  }

  private reset() {
    this.capabilities = []
  }

  getSourceNames() {
    let nameArr = this.DWObject.GetSourceNames(true) as SourceDetails[]
    console.log("sources", nameArr);
    // return nameArr.filter((name: string) => name.toUpperCase().includes('TWAIN'))
    return nameArr.filter(i => i.DriverType === "TWAIN" && !i.ProductFamily?.toUpperCase().includes('WIA') && !i.ProductFamily?.toUpperCase().includes('ICA')).map(i => i.ProductName) as string[]
  }


  async selectSource(index?: number) {
    this.reset()
    if (index === undefined && this.selectedIndex !== undefined) {
      index = this.selectedIndex
    }

    if (index !== undefined) {
      this.selectedPrinter = this.sources[index]
      this.selectedIndex = index
    }
    if (!this.selectedPrinter) {
      ElMessage({
        type: 'warning',
        message: '请选择扫描源',
      })
      return Promise.reject()
    }

    await this.DWObject.SelectSourceByIndexAsync(index!)
    this.capabilities = await this.getPrinterCapabilities()
  }
  private async getPrinterCapabilities(index?: number) {
    await this.DWObject.OpenSourceAsync()
    return new Promise<CapabilityDetails[]>((resolve, reject) => {
      this.DWObject.getCapabilities(
        result => {
          // console.log(result);
          // console.log(result.map(i => i.values));
          // console.log(result.map(i => i.capability.label).filter(i => i.toLowerCase().includes('reser')));
          // console.log(result.map(i => i.capability.label));
          resolve(result)
        },
        (...restErr) => {
          console.log(restErr)
          reject(restErr)
        }
      )
    }).finally(() => {
      this.DWObject.CloseSource()
    })
  }

  private getCapavilityValues(key: number): ValueAndLabel[] {
    let capability = this.capabilities.filter(i => i.capability.value === key)[0]
    return capability?.values || []
  }
  getPageSizes(): ValueAndLabel[] {
    return this.getCapavilityValues(Dynamsoft.DWT.EnumDWT_Cap.ICAP_SUPPORTEDSIZES)
  }

  getUnits(): ValueAndLabel[] {
    return this.getCapavilityValues(Dynamsoft.DWT.EnumDWT_Cap.ICAP_UNITS)
  }

  clear() {
    this.DWObject.RemoveAllImages()
    this.scanCount = 0
  }

  private async setImageLayout(
    position: [left: number, top: number, right: number, bottom: number]
  ): Promise<boolean> {
    let unitList = this.getUnits()
    if (unitList.some(i => i.value === Dynamsoft.DWT.EnumDWT_UnitType.TWUN_MILLIMETERS)) {
      this.DWObject.Unit = Dynamsoft.DWT.EnumDWT_UnitType.TWUN_MILLIMETERS
    } else if (unitList.some(i => i.value === Dynamsoft.DWT.EnumDWT_UnitType.TWUN_CENTIMETERS)) {
      this.DWObject.Unit = Dynamsoft.DWT.EnumDWT_UnitType.TWUN_CENTIMETERS
      position = position.map(i => UnitTransform.MILLIMETERS_TO_CENTIMETERS(i)) as typeof position
    } else {
      this.DWObject.Unit = Dynamsoft.DWT.EnumDWT_UnitType.TWUN_INCHES
      position = position.map(i => UnitTransform.MILLIMETERS_TO_INCHES(i)) as typeof position
    }
    this.DWObject.PageSize = Dynamsoft.DWT.EnumDWT_CapSupportedSizes.TWSS_NONE
    return Promise.resolve(this.DWObject.SetImageLayout(...position))
  }

  async scan(index?: number, pageSize?: number, pageInfo?: {
    width: number //MILLIMETERS
    height: number //MILLIMETERS
  }): Promise<string[]> {
    if (pageSize === -1 && (!pageInfo || pageInfo.height <= 0 || pageInfo.width <= 0)) {
      return Promise.reject([-1, '请正确设置宽高'])
    }
    if (pageSize != undefined) {
      this.pageSize = pageSize
    }
    if (this.pageSize === -1) {
      if (pageInfo) {
        this.pageInfo = cloneDeep(pageInfo)
      }
    } else {
      this.pageInfo = undefined
    }
    try {
      await this.selectSource(index)
      await this.DWObject.OpenSourceAsync()
    } catch (error: any) {
      return Promise.reject([error.code, error.msg])
    }
    if (this.pageSize === -1) {
      let guessSize = guessPaperSize(this.pageInfo!.width, this.pageInfo!.height)
      if (guessSize) {
        this.pageSize = guessSize.value
      } else {
        let isSetOk = await this.setImageLayout([0, 0, this.pageInfo!.width, this.pageInfo!.height])
        if (!isSetOk) {
          return Promise.reject([-1, '自定义宽高过大或过小'])
        }
      }
    } else {
      if (this.pageSize != undefined) {
        this.DWObject.PageSize = this.pageSize
      }
    }
    return new Promise<string[]>((resolve, reject) => {
      this.DWObject.AcquireImage(
        SCAN_CONF,
        () => {
          resolve(this.getImageList())
        },
        (...errorRest) => {
          console.log("scan error", errorRest);
          let errResult = errorRest as Array<any> | {
            code: number
            message: string
          }
          reject(Array.isArray(errResult) ? errResult : [errResult?.code, errResult?.message])
        }
      )
    }).finally(() => {
      this.DWObject.CloseSource()
    })
  }

  getImageList() {
    let allImg = this.DWObject?.SelectAllImages() || []
    return allImg.map(imgIndex => this.DWObject.GetImageURL(imgIndex))
  }

  async uploadToOss(ossConfig: OssConfig) {
    let allImg = this.DWObject.SelectAllImages()
    let promiseList = allImg.map(index => {
      return new Promise<Blob>((resolve, reject) => {
        this.DWObject.ConvertToBlob(
          [index],
          Dynamsoft.DWT.EnumDWT_ImageType.IT_PNG,
          blob => {
            resolve(blob)
          },
          (...rectError) => {
            reject(rectError)
          }
        )
      })
    })
    let blobArr: Blob[] = await Promise.all(promiseList)
    let client = new OSS(ossConfig)
    let ossPromiseList = blobArr.map((blob, index) => {
      let fileName = getOssUploadFileName(`twain_upload_${index}`)
      return client.put(fileName, blob)
    })
    return Promise.all(ossPromiseList)
  }
  private onReady() {
    return new Promise(resolve => {
      Dynamsoft.DWT.Load()
      Dynamsoft.DWT.RegisterEvent('OnWebTwainReady', () => {
        let bWASM = false
        this.DWObject = Dynamsoft.DWT.GetWebTwain('dwtcontrolContainer')
        bWASM = Dynamsoft.Lib.env.bMobile || !Dynamsoft.DWT.UseLocalService
        if (bWASM) {
          this.DWObject.Viewer.cursor = 'pointer'
        } else {
          this.sources = this.getSourceNames() // 获取扫描仪列表数据
        }
        resolve('')
      })
    })
  }
}

const PAGE_SIZE = Dynamsoft.DWT.EnumDWT_CapSupportedSizes
const SIZE = [
  /* DIN 476 */
  { size: "4A0", width: 1682, height: 2378, value: PAGE_SIZE.TWSS_4A0 },
  { size: "2A0", width: 1189, height: 1682, value: PAGE_SIZE.TWSS_2A0 },

  /* JIS B series */
  { size: "JISB0", width: 1030, height: 1456, value: PAGE_SIZE.TWSS_JISB0 },
  { size: "JISB1", width: 728, height: 1030, value: PAGE_SIZE.TWSS_JISB1 },
  { size: "JISB2", width: 515, height: 728, value: PAGE_SIZE.TWSS_JISB2 },
  { size: "JISB3", width: 364, height: 515, value: PAGE_SIZE.TWSS_JISB3 },
  { size: "JISB4", width: 257, height: 364, value: PAGE_SIZE.TWSS_JISB4 },
  { size: "JISB5", width: 182, height: 257, value: PAGE_SIZE.TWSS_JISB5 },
  { size: "JISB6", width: 128, height: 182, value: PAGE_SIZE.TWSS_JISB6 },
  { size: "JISB7", width: 91, height: 128, value: PAGE_SIZE.TWSS_JISB7 },
  { size: "JISB8", width: 64, height: 91, value: PAGE_SIZE.TWSS_JISB8 },
  { size: "JISB9", width: 45, height: 64, value: PAGE_SIZE.TWSS_JISB9 },
  { size: "JISB10", width: 32, height: 45, value: PAGE_SIZE.TWSS_JISB10 },
  /* { size: "JISB11", width: 22, height: 32 },
  { size: "JISB12", width: 16, height: 22 }, */

  /* ISO 216 */
  { size: "A0", width: 841, height: 1189, value: PAGE_SIZE.TWSS_A0 },
  { size: "A1", width: 594, height: 841, value: PAGE_SIZE.TWSS_A1 },
  { size: "A2", width: 420, height: 594, value: PAGE_SIZE.TWSS_A2 },
  { size: "A3", width: 297, height: 420, value: PAGE_SIZE.TWSS_A3 },
  { size: "A4", width: 210, height: 297, value: PAGE_SIZE.TWSS_A4 },
  { size: "A5", width: 148, height: 210, value: PAGE_SIZE.TWSS_A5 },
  { size: "A6", width: 105, height: 148, value: PAGE_SIZE.TWSS_A6 },
  { size: "A7", width: 74, height: 105, value: PAGE_SIZE.TWSS_A7 },
  { size: "A8", width: 52, height: 74, value: PAGE_SIZE.TWSS_A8 },
  { size: "A9", width: 37, height: 52, value: PAGE_SIZE.TWSS_A9 },
  { size: "A10", width: 26, height: 37, value: PAGE_SIZE.TWSS_A10 },

  { size: "B0", width: 1000, height: 1414, value: PAGE_SIZE.TWSS_ISOB0 },
  { size: "B1", width: 707, height: 1000, value: PAGE_SIZE.TWSS_ISOB1 },
  { size: "B2", width: 500, height: 707, value: PAGE_SIZE.TWSS_ISOB2 },
  { size: "B3", width: 353, height: 500, value: PAGE_SIZE.TWSS_ISOB3 },
  { size: "B4", width: 250, height: 353, value: PAGE_SIZE.TWSS_ISOB4 },
  { size: "B5", width: 176, height: 250, value: PAGE_SIZE.TWSS_ISOB5 },
  { size: "B6", width: 125, height: 176, value: PAGE_SIZE.TWSS_ISOB6 },
  { size: "B7", width: 88, height: 125, value: PAGE_SIZE.TWSS_ISOB7 },
  { size: "B8", width: 62, height: 88, value: PAGE_SIZE.TWSS_ISOB8 },
  { size: "B9", width: 44, height: 62, value: PAGE_SIZE.TWSS_ISOB9 },
  { size: "B10", width: 31, height: 44, value: PAGE_SIZE.TWSS_ISOB10 },

  { size: "C0", width: 917, height: 1297, value: PAGE_SIZE.TWSS_C0 },
  { size: "C1", width: 648, height: 917, value: PAGE_SIZE.TWSS_C1 },
  { size: "C2", width: 458, height: 648, value: PAGE_SIZE.TWSS_C2 },
  { size: "C3", width: 324, height: 458, value: PAGE_SIZE.TWSS_C3 },
  { size: "C4", width: 229, height: 324, value: PAGE_SIZE.TWSS_C4 },
  { size: "C5", width: 162, height: 229, value: PAGE_SIZE.TWSS_C5 },
  { size: "C6", width: 114, height: 162, value: PAGE_SIZE.TWSS_C6 },
  { size: "C7", width: 81, height: 114, value: PAGE_SIZE.TWSS_C7 },
  { size: "C8", width: 57, height: 81, value: PAGE_SIZE.TWSS_C8 },
  { size: "C9", width: 40, height: 57, value: PAGE_SIZE.TWSS_C9 },
  { size: "C10", width: 28, height: 40, value: PAGE_SIZE.TWSS_C10 },

  /* { size: "RA0", width: 860, height: 1220 },
  { size: "RA1", width: 610, height: 860 },
  { size: "RA2", width: 430, height: 610 },
  { size: "RA3", width: 305, height: 430 },
  { size: "RA4", width: 215, height: 305 },

  { size: "SRA0", width: 900, height: 1280 },
  { size: "SRA1", width: 640, height: 900 },
  { size: "SRA2", width: 450, height: 640 },
  { size: "SRA3", width: 320, height: 450 },
  { size: "SRA4", width: 225, height: 320 }, */

  /* other */
  { size: "Executive", width: 184, height: 267, _width: 184.2, _height: 266.7, value: PAGE_SIZE.TWSS_USEXECUTIVE },
  { size: "Legal", width: 216, height: 356, _width: 215.9, _height: 355.6, value: PAGE_SIZE.TWSS_USLEGAL },
  { size: "Letter", width: 216, height: 279, _width: 215.9, _height: 279.4, value: PAGE_SIZE.TWSS_USLETTER },
  { size: "Ledger", width: 279, height: 432, _width: 279.4, _height: 431.8, value: PAGE_SIZE.TWSS_USLEDGER },

  { size: "A4 Letter", width: 210, height: 297, value: PAGE_SIZE.TWSS_A4LETTER },
]

export type PaperSizeItem = {
  size: string
  width: number
  height: number
  _width?: number
  _height?: number
  value: number
}

export function guessPaperSize(width: number, height: number): PaperSizeItem | undefined { //unit: mm
  let result = SIZE.filter(size => Math.round(width) === size.width && Math.round(height) === size.height)
  return result[0]
}

export type PrinterLoadingConf = {
  show: boolean
  type?: 'scan' | 'print'
  text?: string
  desc?: string
  icon?: 'scan' | 'loading'
}
let printerLoading = ref<PrinterLoadingConf>({
  show: false,
  type: 'scan',
  icon: 'scan'
})

export function getPrinterLoading() {
  return printerLoading.value
}
export function setPrinterLoading(
  config: PrinterLoadingConf
) {
  if (!config.icon) {
    config.icon = 'scan'
  }
  printerLoading.value = config
}
