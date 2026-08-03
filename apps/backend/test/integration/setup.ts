// Chat/reply and BullMQ worker teardown on `app.close()` can take a couple
// of seconds (delayed jobs, Redis connection close) — the default 5s Jest
// timeout is too tight once several suites run back to back.
jest.setTimeout(30000);
