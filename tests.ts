import {schedule} from './index';

const SEC = 1e3;

let showElapsedTimes = true;
let f = () => console.log('.');

let k = 0;
let r = () => {
    let v = {x: k++ < 3 ? 'pending' : 'completed'};
    console.log(v);
    return Promise.resolve(v);
};

async function test(title: string, fn: () => unknown | Promise<unknown>, time?: number) {
    console.log('\n' + title);
    let t0 = Date.now();
    await fn();
    let dt = Date.now() - t0;
    if (showElapsedTimes)
        console.log(`Elapsed: ${(dt/SEC).toFixed(3)}"`);
    if (time !== undefined)
        console.assert(Math.abs(time*SEC - dt) < 150, `Out of time bounds: '${title}'; expected: ${time}"`);
}

(async () => {

await test('-; -', schedule(f), 0);

await test('false; .5"', schedule(f, {
    repeat: false,
    delay: .5*SEC,
}), .5);

await test('undefined; .5"', schedule(f, {
    delay: .5*SEC,
}), .5);

await test('0; .5"', schedule(f, {
    repeat: 0,
    delay: .5*SEC,
}), .5);

await test('3; .5"', schedule(f, {
    repeat: 3,
    delay: .5*SEC,
}), 1.5);

await test('3; .5*(1+k)"', schedule(f, {
    repeat: 3,
    delay: (_, k) => .5*(1 + k)*SEC,
}), 3);

await test('PI; .25*(1+k)"', schedule(f, {
    repeat: (_, k) => k < Math.PI,
    delay: (_, k) => .25*(1 + k)*SEC,
}), 2.5);

await test('!completed; 1"', schedule(r, {
    repeat: v => v?.x !== 'completed',
    delay: .25*SEC,
}), 1);

})();
