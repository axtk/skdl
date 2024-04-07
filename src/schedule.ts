import { SCHEDULE_TIMEOUT } from './const';
import type { ScheduleOptions, Timeout } from './types';

export function schedule<Result, Params extends unknown[]>(
    callback: (...args: Params) => Promise<Result> | Result,
    { delay, repeat, timeout }: ScheduleOptions<Result> = {},
): (...args: Params) => Promise<Result | undefined> {
    return (...args) => {
        return new Promise((resolve, reject) => {
            let callbackTimeout: Timeout = null;
            let scheduleTimeout: Timeout = null;

            let cleanup = () => {
                if (callbackTimeout !== null)
                    clearTimeout(callbackTimeout);

                if (scheduleTimeout !== null)
                    clearTimeout(scheduleTimeout);
            };

            if (timeout !== undefined)
                scheduleTimeout = setTimeout(() => {
                    cleanup();
                    reject(new Error(SCHEDULE_TIMEOUT));
                }, timeout);

            if (repeat) {
                let iteration = 0;
                let latestValue: Result | undefined = undefined;

                let run = () => {
                    try {
                        let next = (shouldRepeat: boolean) => {
                            if (!shouldRepeat) {
                                cleanup();
                                return resolve(latestValue);
                            }

                            let resolvedDelay = typeof delay === 'function' ?
                                delay(latestValue, iteration) :
                                delay;

                            callbackTimeout = setTimeout(() => {
                                Promise.resolve(callback(...args))
                                    .then(resolvedValue => {
                                        latestValue = resolvedValue;
                                        iteration++;
                                        run();
                                    })
                                    .catch(error => {
                                        cleanup();
                                        reject(error);
                                    });
                            }, resolvedDelay);
                        };

                        if (typeof repeat === 'number')
                            next(iteration < repeat);
                        else if (typeof repeat === 'function')
                            Promise.resolve(repeat(latestValue, iteration)).then(next);
                    }
                    catch (error) {
                        cleanup();
                        reject(error);
                    }
                };

                run();
            }
            else if (delay !== undefined) {
                let resolvedDelay = typeof delay === 'function' ?
                    delay(undefined, 0) :
                    delay;

                callbackTimeout = setTimeout(() => {
                    Promise.resolve(callback(...args))
                        .then(value => {
                            cleanup();
                            resolve(value);
                        })
                        .catch(error => {
                            cleanup();
                            reject(error);
                        });
                }, resolvedDelay);
            }
            else {
                Promise.resolve(callback(...args))
                    .then(value => {
                        cleanup();
                        resolve(value);
                    })
                    .catch(error => {
                        cleanup();
                        reject(error);
                    });
            }
        });
    };
}
