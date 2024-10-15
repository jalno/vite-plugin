import fs from "fs/promises";
import logger from "../logger";
import Utils from "../Utils";

type LegacyLanguageFile = {
    author?: {
        name?: string,
        website?: string,
    },
    rtl?: boolean,
    phrases?: Record<string, string>,
};

type LaravelLanguageFile = Record<string, string>;

export default class LanguageFile {

    public static async fromFile(filePath: string, code: string) {
        const fileExists = await Utils.fileExists(filePath);
        if (!fileExists) {
            logger.error(`[LanguageFile:fromFile]: file ${filePath} does not exists.`);
            throw new Error(`[@jalno/vite-plugin] [LanguageFile:fromFile]: file ${filePath} does not exists.`);
        }

        try {
            const lang: LegacyLanguageFile | LaravelLanguageFile = JSON.parse(
                (await fs.readFile(filePath)).toString("utf8")
            );

            if (typeof lang.phrases === 'object') {
                return new LanguageFile(code, lang.phrases, (lang as LegacyLanguageFile)?.rtl);
            }

            return new LanguageFile(code, lang as LaravelLanguageFile);
        } catch (err) {
            logger.error(`[LanguageFile:fromFile] can not process ${filePath} file, error: ${err}`)
            throw new Error(`[LanguageFile:fromFile] can not process ${filePath} file.`);
        }
    }

    public static rtlLanguagesCodes: string[] = [
        'ar', 'dv', 'fa','ha','he','ks','ku','ps', 'ur', 'yi',
    ];

    constructor(public readonly code: string, protected _phrases: Record<string, string>, protected _rtl?: boolean) {

    }

    public get isRtl(): boolean {
        if (typeof this._rtl !== 'undefined') {
            return this._rtl;
        }

        return LanguageFile.rtlLanguagesCodes.indexOf(this.code) !== -1;
    }

    public get phrases(): Record<string, string> {
        return this._phrases;
    }
}