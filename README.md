# skdl

*Polling as an async function*

Interaction with a polling (i.e. a scheduled repeated action) looks similar to interaction with an asynchronous function: calling and waiting for its resolution before proceeding to other tasks. This package helps reduce the effort (and amount of code) required to set up a polling by creating an async function for a repeated action that is resolved when a defined condition is met.

## Installation

```
npm i skdl
```

## Examples

Let's take the following polling function as an example to illustrate the common types of pollings:

```js
async function poll(params) {
    let response = await fetch(`/task?${new URLSearchParams(params)}`);
    return await response.json();
}
```

In the examples below, this function is passed to the `schedule` utility as a parameter. The output of `schedule` is a new async function with the same parameters and return value as the original `poll()` function, except it is resolved only when the polling completes. The resolved value of the new function is what the polling function `poll()` returns in the last polling iteration.

### Constant finite polling

```js
import { schedule } from 'skdl';

let getData = schedule(poll, {
    delay: 3000,
    repeat: 10
});

let data = await getData(params);
```

Here, `getData(params)` is resolved after 10 iterations have passed, with each iteration 3 seconds apart from another.

### Constant infinite polling

```js
import { schedule } from 'skdl';

let getData = schedule(poll, {
    delay: 3000,
    repeat: true
});

getData(params);
```

Here, `getData(params)` calls `poll(params)` every 3 seconds after the previous iteration. Configured as an infinite polling (with `repeat` set to `true`), it is never resolved (and can be used as a background status check). For this reason, the return value of `getData(params)` is not awaited here.

### Constant conditional polling

```js
import { schedule } from 'skdl';

let getData = schedule(poll, {
    delay: 3000,
    // at each iteration, the `data` parameter refers to the
    // return value of the scheduled callback
    repeat: (data, iteration) => {
        return data.status !== 'completed' && iteration < 10;
    }
});

let data = await getData(params);
```

Here, `getData(params)` is resolved when `poll(params)` returns `{ status: 'completed' }` or when the iteration count reaches 10, with the iterations coming at a constant rate, delayed by 3 seconds after the completion of the previous one.

### Non-constant conditional polling (including exponential backoff)

```js
import { schedule } from 'skdl';

let getData = schedule(poll, {
    delay: (data, iteration) => {
        return iteration < 5 ? 1000 : 5000;
    },
    repeat: (data, iteration) => {
        return data.status !== 'completed' && iteration < 10;
    }
});

let data = await getData(params);
```

Here, `getData(params)` is resolved when `poll(params)` returns `{ status: 'completed' }` or when the iteration count reaches 10, with the iterations coming at a non-constant rate, as defined in the `delay` option.

### Interruption with an exception

```js
import { schedule } from 'skdl';

let getData = schedule(poll, {
    delay: (data, iteration) => {
        return iteration < 5 ? 1000 : 5000;
    },
    repeat: (data, iteration) => {
        if (iteration > 10)
            throw new Error('too many iterations');
        return data.status !== 'completed';
    }
});

let data = await getData(params);
```

Here, the `Promise` returned from `getData(params)` will be rejected with an instance of `Error` if the iteration count exceeds 10, or fulfilled when `poll(params)` returns `{ status: 'completed' }`.

### Single delayed call

```js
import { schedule } from 'skdl';

let getData = schedule(poll, {
    delay: 1000
});

let data = await getData(params);
```

As an edge case, a polling can be reduced to a single delayed call. Here, `getData(params)` is resolved to `data` after 1 iteration delayed by 1 second.
