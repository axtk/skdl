# skdl

*Polling as an async function*

Interaction with a polling (i.e. a scheduled repeated action) looks similar to interaction with an asynchronous function: calling and waiting for its resolution before proceeding to other tasks. This package helps reduce the effort (and amount of code) required to set up a polling by creating an async function for a repeated action that is resolved when a defined condition is met.

- [Installation](#installation)
- [`schedule()`](#schedule)
  - [Constant finite polling](#constant-finite-polling)
  - [Constant infinite polling](#constant-infinite-polling)
  - [Constant conditional polling](#constant-conditional-polling)
  - [Non-constant conditional polling (including exponential backoff)](#non-constant-conditional-polling-including-exponential-backoff)
  - [Interruption with an exception](#interruption-with-an-exception)
  - [Single delayed call](#single-delayed-call)
  - [With React](#with-react)
- [`waitFor()`](#waitfor)
  - [Waiting for a DOM element](#waiting-for-a-dom-element)
  - [Timeout](#timeout)
  - [Timeout error handling](#timeout-error-handling)
  - [With React](#with-react-1)
- [`schedule()` vs `waitFor()`](#schedule-vs-waitfor)

## Installation

```
npm i skdl
```

## `schedule()`

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

### With React

With React, it is generally necessary to clean up pollings started by a component when the component gets unmounted. It can be arranged with the `repeat` option, just as any other condition controlling whether a polling should proceed:

```js
import { useEffect, useRef, useState } from 'react';
import { schedule } from 'skdl';

const Task = ({ id }) => {
    const isMounted = useRef(false);
    const [status, setStatus] = useState();

    useEffect(() => {
        isMounted.current = true;

        const pollStatus = () => {
            return fetch(`/tasks/status?id=${id}`)
                .then(response => response.json());
        };

        // the `schedule` utility creates a function returning a Promise
        // that is resolved when the `repeat` option returns `false`
        // effectively turning a polling into a Promise
        const waitForCompletion = schedule(pollStatus, {
            delay: 5000,
            repeat: (data) => {
                if (isMounted.current)
                    setStatus(data.status);

                // the scheduled polling will proceed as long as the
                // component is mounted and the fetched status is
                // other than 'complete'
                return isMounted.current && data.status !== 'complete';
            },
        });

        waitForCompletion().then(data => {
            if (isMounted.current) {
                // any actions required after the task is completed
                // like fetching and rendering the full task data or
                // redirecting the user to another location
            }
        });

        return () => {
            isMounted.current = false;
        };
    }, [id]);

    return (
        <div className="task">
            Task #{id}: {status}
        </div>
    );
};
```

## `waitFor()`

When the returned value of the polling function is a `boolean` value (or can be expressed as such), waiting for a condition to be met can be further simplified with the `waitFor()` utility function:

```js
import { waitFor } from 'skdl';

async function isComplete() {
    let response = await fetch('/status');
    let data = await response.json();

    return data.status === 'complete';
}

await waitFor(isComplete, 1000);
```

Like `schedule()`, `waitFor()` accepts either a constant or non-constant delay as the second parameter, which can be defined as `number | ((iteration: number) => number)`:

```js
// for the first 5 iterations the delay is 1 second,
// and 5 seconds further on
await waitFor(isComplete, iteration => iteration < 5 ? 1000 : 5000);
```

### Waiting for a DOM element

`waitFor()` can also be used to wait for a DOM element to appear in the DOM tree:

```js
import { waitFor } from 'skdl';

await waitFor(() => document.querySelector('.target') !== null, 100);
```

### Timeout

Waiting with `waitFor()` can be interrupted with a timeout, if it's set with the third parameter:

```js
import { waitFor } from 'skdl';

function hasTarget() {
    return document.querySelector('.target') !== null;
}

await waitFor(hasTarget, 100, 5000);
// if the element doesn't appear within 5 seconds `waitFor()` will
// quit waiting with an error (see 'Timeout error handling' below)
```

### Timeout error handling

The timeout error can be intercepted with the following check in the `catch` block:

```js
import { waitFor, isScheduleTimeoutError } from 'skdl';

function hasTarget() {
    return document.querySelector('.target') !== null;
}

try {
    await waitFor(hasTarget, 100, 5000);
}
catch (error) {
    if (isScheduleTimeoutError(error)) {
        // timeout error handling
    }
}
```

### With React

Like with `schedule()`, `waitFor()` can be stopped when a React component hosting the `waitFor()` call gets unmounted:

```js
import { useEffect, useRef, useState } from 'react';
import { waitFor } from 'skdl';

const Task = ({ id }) => {
    const isMounted = useRef(false);
    const [status, setStatus] = useState();

    useEffect(() => {
        isMounted.current = true;

        const isComplete = () => {
            return fetch(`/tasks/status?id=${id}`)
                .then(response => response.json())
                .then(({ status }) => {
                    if (isMounted.current)
                        setStatus(status);

                    // the polling will be completed when the component
                    // is unmounted or the fetched status is 'complete'
                    return !isMounted.current || status === 'complete';
                });
        };

        waitFor(isComplete, 5000).then(() => {
            if (isMounted.current) {
                // any actions required after the task is completed
                // like fetching and rendering the full task data or
                // redirecting the user to another location
            }
        });

        return () => {
            isMounted.current = false;
        };
    }, [id]);

    return (
        <div className="task">
            Task #{id}: {status}
        </div>
    );
};
```

## `schedule()` vs `waitFor()`

`waitFor()` only checks whether a certain condition is met without returning the latest result of the poll function, which is sometimes unnecessary. To make use of the latest data from the poll function `schedule()` should be used instead.
