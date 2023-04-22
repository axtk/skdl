# skdl

*Scheduled actions and pollings as Promises*

Interaction with a scheduled repeated action or a polling looks similar to interaction with a `Promise`: launching and waiting for its resolution to proceed to other tasks. This package helps create a `Promise` for a repeated action that resolves when a defined condition is met.

## Examples

```js
import {schedule} from 'skdl';

async function getStatus() {
    let response = await fetch('/status');
    return await response.json();
}

let checkStatus;

// single delayed call
checkStatus = schedule(getStatus, {
    delay: 1000
});
await checkStatus();

// constant finite polling
checkStatus = schedule(getStatus, {
    delay: 3000,
    repeat: 10
});
await checkStatus();

// constant conditional polling
checkStatus = schedule(getStatus, {
    delay: 3000,
    // at each iteration, the `value` parameter refers to the
    // returned value of the scheduled callback
    repeat: (value, iteration) => {
        return value !== 'completed' && iteration < 10;
    }
});
await checkStatus();

// non-constant conditional polling
// (exponential polling also falls under this category)
checkStatus = schedule(getStatus, {
    delay: (value, iteration) => {
        return iteration < 5 ? 1000 : 5000;
    },
    repeat: (value, iteration) => {
        return value !== 'completed' && iteration < 10;
    }
});
await checkStatus();

// interruption with an exception
checkStatus = schedule(getStatus, {
    delay: (value, iteration) => {
        return iteration < 5 ? 1000 : 5000;
    },
    repeat: (value, iteration) => {
        if (iteration > 10)
            throw new Error('too many iterations');
        return value !== 'completed';
    }
});
await checkStatus();
```
