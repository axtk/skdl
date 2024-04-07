import { isScheduleTimeoutError } from './src/isScheduleTimeoutError';
import { schedule } from './src/schedule';
import { waitFor } from './src/waitFor';

const debug = process.argv.slice(2).includes('--debug');

let f = () => console.log('.');

async function test(
    title: string,
    fn: () => unknown | Promise<unknown>,
    estimatedTime?: number,
) {
    console.log(title);

    let t0 = Date.now();
    await fn();
    let dt = Date.now() - t0;

    if (debug)
        console.log(`Elapsed: ${dt} ms`);

    if (estimatedTime !== undefined && Math.abs(estimatedTime - dt) > 100)
        throw new Error(`Out of time bounds; expected: ${estimatedTime}, actual time: ${dt}`);

    console.log('OK');
    console.log();
}

(async () => {

await test('schedule, no options', async () => {
    let run = schedule(f);
    await run();
}, 0);

await test('schedule, repeat = false, constant delay', async () => {
    let run = schedule(f, {
        repeat: false,
        delay: 200,
    });
    await run();
}, 200);

await test('schedule, no repeat, constant delay', async () => {
    let run = schedule(f, {
        delay: 200,
    });
    await run();
}, 200);

await test('schedule, repeat = 0, constant delay', async () => {
    let run = schedule(f, {
        repeat: 0,
        delay: 200,
    });
    await run();
}, 200);

await test('schedule, repeat = 3, constant delay', async () => {
    let run = schedule(f, {
        repeat: 3,
        delay: 200,
    });
    await run();
}, 600);

await test('schedule, repeat = 3, constant delay, timeout failure', async () => {
    let run = schedule(f, {
        repeat: 3,
        delay: 200,
        timeout: 500,
    });

    try {
        await run();
    }
    catch (error) {
        if (!isScheduleTimeoutError(error))
            throw error;
    }
}, 500);

await test('schedule, repeat = 3, constant delay, timeout success', async () => {
    let run = schedule(f, {
        repeat: 3,
        delay: 200,
        timeout: 1000,
    });

    await run();
}, 600);

await test('schedule, repeat = 3, linear delay', async () => {
    let run = schedule(f, {
        repeat: 3,
        delay: (_data, iteration) => (iteration + 1)*200,
    });
    await run();
}, 1200);

await test('schedule, repeat < PI, linear delay', async () => {
    let run = schedule(f, {
        repeat: (_data, iteration) => iteration < Math.PI,
        delay: (_data, iteration) => (iteration + 1)*200,
    });
    await run();
}, 2000);

await test('schedule, repeat while status !== completed, constant delay', async () => {
    let k = 0;

    let poll = () => {
        let status = k++ < 3 ? 'pending' : 'completed';
        console.log(`status: ${status}`);
        return Promise.resolve({ status });
    };

    let run = schedule(poll, {
        repeat: data => data?.status !== 'completed',
        delay: 200,
    });

    await run();
}, 800);

await test('waitFor, short constant delay', async () => {
    let x = false;

    setTimeout(() => {
        x = true;
    }, 300);

    await waitFor(() => x, 30);
}, 300);

await test('waitFor, short constant delay, timeout failure', async () => {
    let x = false;

    setTimeout(() => {
        x = true;
    }, 500);

    try {
        await waitFor(() => x, 30, 300);
    }
    catch (error) {
        if (!isScheduleTimeoutError(error))
            throw error;
    }
}, 300);

await test('waitFor, short constant delay, timeout success', async () => {
    let x = false;

    setTimeout(() => {
        x = true;
    }, 500);

    await waitFor(() => x, 30, 1000);
}, 500);

await test('waitFor, long constant delay', async () => {
    let x = false;

    setTimeout(() => {
        x = true;
    }, 300);

    await waitFor(() => x, 500);
}, 500);

await test('waitFor, linear delay', async () => {
    let x = false;

    setTimeout(() => {
        x = true;
    }, 450);

    await waitFor(() => x, iteration => (iteration + 1)*100);
}, 600);

console.log('PASSED');

})();
