export type ScheduleOptions<T = any> = {
    /**
     * A number of repetitions or a condition to repeat the iterations.
     */
    repeat?: boolean | number | ((value: T, iteration: number) => boolean);
    /**
     * A delay between iterations in milliseconds.
     * An exponential polling or any other variety of a non-constant polling
     * can be set up by passing a function to this option.
     */
    timeout?: number | ((value: T, iteration: number) => number);
};

export function schedule<P extends any[] = any[], T = any>(
    callback: (...args: P) => Promise<T> | T,
    {repeat, timeout}: ScheduleOptions<T | undefined> = {},
): (...args: P) => Promise<T | undefined> | T | undefined {
    return (...args: P) => {
        if (repeat) {
            return new Promise(resolve => {
                let iteration = 0;
                let latestValue: T | undefined = undefined;
                let run = () => {
                    if (typeof repeat === 'number' && iteration >= repeat)
                        return resolve(latestValue);

                    if (typeof repeat === 'function' && !repeat(latestValue, iteration))
                        return resolve(latestValue);

                    let delay = typeof timeout === 'function' ?
                        timeout(latestValue, iteration) :
                        timeout;

                    setTimeout(() => {
                        Promise.resolve(callback(...args)).then(resolvedValue => {
                            latestValue = resolvedValue;
                            iteration++;
                            run();
                        });
                    }, delay);
                };
                run();
            });
        }

        if (timeout !== undefined) {
            return new Promise(resolve => {
                let delay = typeof timeout === 'function' ?
                    timeout(undefined, 0) :
                    timeout;

                setTimeout(() => {
                    resolve(callback(...args));
                }, delay);
            });
        }

        return callback(...args);
    };
}
