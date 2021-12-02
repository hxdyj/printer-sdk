import * as pdf_to_printer_dist_get_default_printer_get_default_printer from 'pdf-to-printer/dist/get-default-printer/get-default-printer';
import { getPrinters, print } from 'pdf-to-printer';

declare type UnwrapPromise<T> = T extends Promise<infer V> ? V : T;
declare type UnwrapArray<T> = T extends Array<infer V> ? V : T;
declare type PrintParam = Parameters<typeof print> & {
    paperkind: string;
};
declare type PrinterItem = UnwrapArray<UnwrapPromise<ReturnType<typeof getPrinters>>>;
declare type PrintConfig = PrintParam[1];
declare class Printer {
    private _version;
    private _instence;
    isReady: boolean;
    constructor(conf?: {
        readyCb?: () => void;
        instenceCb?: () => void;
    });
    private _checkVersion;
    getVersion(): Promise<{
        clientVersion: string;
        sdkVersion: string;
    }>;
    getSources(): Promise<pdf_to_printer_dist_get_default_printer_get_default_printer.Printer[]>;
    getDefaultPrinter(): Promise<pdf_to_printer_dist_get_default_printer_get_default_printer.Printer | null>;
    print(fileUrl: string, printConf?: PrintConfig): Promise<void>;
}

export { PrintConfig, Printer, PrinterItem };
