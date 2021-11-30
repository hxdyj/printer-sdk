import { getPrinters, print } from 'pdf-to-printer';

declare type UnwrapPromise<T> = T extends Promise<infer V> ? V : T;
declare type UnwrapArray<T> = T extends Array<infer V> ? V : T;
declare type PrintParam = Parameters<typeof print>;
declare type PrinterItem = UnwrapArray<UnwrapPromise<ReturnType<typeof getPrinters>>>;
declare class Printer {
    private _version;
    private _port;
    private _baseUrl;
    private _instence;
    isReady: boolean;
    constructor(conf: {
        readyCb?: () => void;
        instenceCb?: () => void;
    });
    private _checkVersion;
    getVersion(): Promise<{
        clientVersion: string;
        sdkVersion: string;
    }>;
    getSources(): Promise<unknown>;
    getDefaultPrinter(): Promise<unknown>;
    print(fileUrl: string, printConf?: PrintParam[1]): Promise<unknown>;
}

export { Printer, PrinterItem };
