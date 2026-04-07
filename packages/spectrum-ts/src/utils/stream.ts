import { Repeater } from "@repeaterjs/repeater";

export interface Channel<T> {
  close(): void;
  iterable: AsyncIterable<T>;
  push(value: T): void;
}

export interface ManagedStream<T> extends AsyncIterable<T> {
  close(): Promise<void>;
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

type StreamCleanup = void | (() => void | Promise<void>);

export function stream<T>(
  setup: (
    emit: (value: T) => void,
    end: (error?: unknown) => void
  ) => StreamCleanup | Promise<StreamCleanup>
): ManagedStream<T> {
  const repeater = new Repeater<T>(async (push, stop) => {
    const emit = (value: T) => {
      Promise.resolve(push(value)).catch((error) => {
        stop(error);
        return undefined;
      });
    };
    const end = (error?: unknown) => {
      stop(error);
    };
    const cleanup = await setup(emit, end);

    try {
      await stop;
    } finally {
      await cleanup?.();
    }
  });

  return Object.assign(repeater, {
    close: async () => {
      await repeater.return(undefined);
    },
  });
}

export function mergeStreams<T>(
  streams: readonly ManagedStream<T>[]
): ManagedStream<T> {
  return stream<T>((emit, end) => {
    if (streams.length === 0) {
      end();
      return;
    }

    let openStreams = streams.length;
    const workers = streams.map(async (source) => {
      try {
        for await (const value of source) {
          emit(value);
        }
      } catch (error) {
        end(error);
      } finally {
        openStreams -= 1;
        if (openStreams === 0) {
          end();
        }
      }
    });

    return async () => {
      await Promise.allSettled(streams.map((source) => source.close()));
      await Promise.allSettled(workers);
    };
  });
}
