import { Repeater } from "@repeaterjs/repeater";

export interface Channel<T> {
  close(): void;
  iterable: AsyncIterable<T>;
  push(value: T): void;
}

export interface ClosableAsyncIterable<T> extends AsyncIterable<T> {
  close(): Promise<void> | void;
}

export function channel<T>(): Channel<T> {
  const queue: T[] = [];
  const waiters: Array<(result: IteratorResult<T>) => void> = [];
  let closed = false;

  const push = (value: T) => {
    if (closed) {
      return;
    }
    const waiter = waiters.shift();
    if (waiter) {
      waiter({ value, done: false });
    } else {
      queue.push(value);
    }
  };

  const close = () => {
    closed = true;
    for (const waiter of waiters) {
      waiter({ value: undefined as T, done: true });
    }
    waiters.length = 0;
    queue.length = 0;
  };

  const iterable: AsyncIterable<T> = {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<T>> {
          const queued = queue.shift();
          if (queued !== undefined) {
            return Promise.resolve({ value: queued, done: false });
          }
          if (closed) {
            return Promise.resolve({
              value: undefined as T,
              done: true,
            });
          }
          return new Promise((resolve) => waiters.push(resolve));
        },
        return(): Promise<IteratorResult<T>> {
          close();
          return Promise.resolve({ value: undefined as T, done: true });
        },
      };
    },
  };

  return { push, iterable, close };
}

export function fromEmitter<T>(
  setup: (emit: (value: T) => void) => (() => void) | undefined
): AsyncIterable<T> {
  const { push, iterable, close } = channel<T>();
  const cleanup = setup(push);

  return {
    [Symbol.asyncIterator]() {
      const iter = iterable[Symbol.asyncIterator]();
      return {
        next: () => iter.next(),
        return(): Promise<IteratorResult<T>> {
          cleanup?.();
          close();
          return Promise.resolve({ value: undefined as T, done: true });
        },
      };
    },
  };
}

export function mergeClosableIterables<T>(
  streams: readonly ClosableAsyncIterable<T>[]
): AsyncIterable<T> {
  return new Repeater<T>(async (push, stop) => {
    if (streams.length === 0) {
      stop();
      return;
    }

    let openStreams = streams.length;

    const workers = streams.map((stream) =>
      (async () => {
        try {
          for await (const value of stream) {
            await push(value);
          }
        } catch (error) {
          stop(error);
        } finally {
          openStreams -= 1;
          if (openStreams === 0) {
            stop();
          }
        }
      })()
    );

    try {
      await stop;
    } finally {
      await Promise.allSettled(
        streams.map((stream) => Promise.resolve(stream.close()))
      );
      await Promise.allSettled(workers);
    }
  });
}
