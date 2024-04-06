export function waitFor(
    isComplete: (iteration: number) => boolean | Promise<boolean>,
    delay: number | ((iteration: number) => number),
) {
    return new Promise<void>((resolve, reject) => {
        let iteration = 0;

        let run = () => {
            try {
                Promise.resolve(isComplete(iteration))
                    .then(value => {
                        if (value) resolve();
                        else {
                            let resolvedDelay = typeof delay === 'function' ?
                                delay(iteration) :
                                delay;

                            setTimeout(() => {
                                iteration++;
                                run();
                            }, resolvedDelay);
                        }
                    })
                    .catch(reject);
            }
            catch (error) {
                reject(error);
            }
        };
    });
}
