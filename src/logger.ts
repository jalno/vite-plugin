import { createLogger, LogOptions } from "vite";
import pc from "picocolors";
import { version } from "../package.json";

const prefix = pc.cyan(`[@jalno/vite-plugin][v${version}] `);

/**
 * Passing prefix does not work without any reason.
 * So, I have to create a custom logger to pass prefix to each log.
 */
const logger = createLogger(undefined, {
    prefix,
});

const { info, warn, warnOnce, error } = logger;

logger.info = (msg, options?: LogOptions) => {
    info(prefix + msg, options);
};
logger.warn = (msg, options?: LogOptions) => {
    warn(prefix + msg, options);
};
logger.warnOnce = (msg, options?: LogOptions) => {
    warnOnce(prefix + msg, options);
};
logger.error = (msg, options?: LogOptions) => {
    error(prefix + msg, options);
};


export default logger;