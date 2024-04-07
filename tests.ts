import { schedule } from './src/schedule';
import { waitFor } from './src/waitFor';

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

    console.log(`Elapsed: ${dt} ms`);

    if (estimatedTime !== undefined && Math.abs(estimatedTime - dt) > 100)
        throw new Error(`Out of time bounds; expected: ${estimatedTime}, actual time: ${dt}`);

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

})();
