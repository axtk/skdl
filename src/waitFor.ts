import {schedule} from './schedule';

const noop = () => {};

export async function waitFor(
    isComplete: (iteration: number) => boolean | Promise<boolean>,
    delay: number | ((iteration: number) => number),
    timeout?: number,
) {
    let waitForCompletion = schedule(noop, {
        repeat: (_data, iteration) => !isComplete(iteration),
        delay: typeof delay === 'function' ? (_data, iteration) => delay(iteration) : delay,
        timeout,
    });

    await waitForCompletion();
}
