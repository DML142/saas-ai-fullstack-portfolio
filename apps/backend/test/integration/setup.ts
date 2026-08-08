// BullMQ worker teardown on `app.close()` can take longer than Jest's
// default 5s timeout once several suites run back to back.
jest.setTimeout(30000);
