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
