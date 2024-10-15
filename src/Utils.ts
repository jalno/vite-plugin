import fs from "fs/promises";

export default class Utils {
    /**
     * Check file exists in async.
     */
    public static async fileExists(path: string): Promise<boolean> {
        return fs.stat(path).then(() => true).catch(() => false);
    }
}