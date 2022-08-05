# skdl

*Scheduled actions and pollings*

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
    timeout: 1000
});
await checkStatus();

// constant finite polling
checkStatus = schedule(getStatus, {
    timeout: 3000,
    repeat: 10
});
await checkStatus();

// constant conditional polling
checkStatus = schedule(getStatus, {
    timeout: 3000,
    repeat: (value, iteration) => {
        return value !== 'completed' && iteration < 10;
    }
});
await checkStatus();

// non-constant conditional polling
checkStatus = schedule(getStatus, {
    timeout: (value, iteration) => {
        return iteration < 10 ? 1000 : 5000;
    },
    repeat: (value, iteration) => {
        return value !== 'completed' && iteration < 10;
    }
});
await checkStatus();
```
