export type ScheduleParams<T> = {
    /**
     * A delay between iterations in milliseconds.
     * An exponential polling or any other variety of a non-constant polling
     * can be set up by passing a function to this option.
     */
    delay?: number | ((value: T, iteration: number) => number);
    /**
     * A number of repetitions or a condition to repeat the iterations.
     */
    repeat?: boolean | number | ((value: T, iteration: number) => boolean);
};

export type ScheduleOptions<T> = ScheduleParams<T> | number | undefined;

export function schedule<P extends any[], T>(
    callback: (...args: P) => Promise<T> | T,
    options?: ScheduleOptions<T | undefined>,
): (...args: P) => Promise<T | undefined> {
    let params: ScheduleParams<T | undefined>;

    if (options === undefined)
        params = {};
    else if (typeof options === 'number')
        params = {delay: options};
    else
        params = options;

    let {delay, repeat} = params;

    return (...args) => {
        if (repeat) {
            return new Promise((resolve, reject) => {
                let iteration = 0;
                let latestValue: T | undefined = undefined;
                let run = () => {
                    try {
                        if (typeof repeat === 'number' && iteration >= repeat)
                            return resolve(latestValue);

                        if (typeof repeat === 'function' && !repeat(latestValue, iteration))
                            return resolve(latestValue);

                        let resolvedDelay = typeof delay === 'function' ?
                            delay(latestValue, iteration) :
                            delay;

                        setTimeout(() => {
                            Promise.resolve(callback(...args))
                                .then(resolvedValue => {
                                    latestValue = resolvedValue;
                                    iteration++;
                                    run();
                                })
                                .catch(reject);
                        }, resolvedDelay);
                    }
                    catch (error) {
                        reject(error);
                    }
                };
                run();
            });
        }

        if (delay !== undefined) {
            return new Promise((resolve, reject) => {
                let resolvedDelay = typeof delay === 'function' ?
                    delay(undefined, 0) :
                    delay;

                setTimeout(() => {
                    Promise.resolve(callback(...args))
                        .then(resolve)
                        .catch(reject);
                }, resolvedDelay);
            });
        }

        return Promise.resolve(callback(...args));
    };
}
