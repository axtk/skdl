export type ScheduleOptions<T> = {
    /**
     * A delay between iterations in milliseconds.
     * An exponential polling or any other variety of a non-constant polling
     * can be set up by passing a function to this option.
     */
    delay?: number | ((value: T | undefined, iteration: number) => number);
    /**
     * A number of repetitions or a condition to repeat the iterations.
     */
    repeat?: boolean | number | ((value: T | undefined, iteration: number) => boolean);
};

export function schedule<Params extends any[], Result>(
    callback: (...args: Params) => Promise<Result> | Result,
    {delay, repeat}: ScheduleOptions<Result> = {},
): (...args: Params) => Promise<Result | undefined> {
    return (...args) => {
        if (repeat) {
            return new Promise((resolve, reject) => {
                let iteration = 0;
                let latestValue: Result | undefined = undefined;
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
