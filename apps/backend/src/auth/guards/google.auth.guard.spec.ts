import { ExecutionContext } from '@nestjs/common';
import { GoogleAuthGuard } from './google.auth.guard';

describe('GoogleAuthGuard', () => {
  let guard: GoogleAuthGuard;

  const makeContext = (): {
    context: ExecutionContext;
    res: { redirect: jest.Mock };
  } => {
    const res = { redirect: jest.fn() };
    const context = {
      switchToHttp: () => ({
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;

    return { context, res };
  };

  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://localhost:3001';
    guard = new GoogleAuthGuard();
  });

  it('redirects to the login page with an error flag on a failed/denied sign-in', () => {
    const { context, res } = makeContext();

    const result = guard.handleRequest(
      new Error('access_denied'),
      undefined,
      undefined,
      context,
    );

    expect(result).toBeNull();
    expect(res.redirect).toHaveBeenCalledWith(
      'http://localhost:3001/login?error=oauth_failed',
    );
  });

  it('redirects the same way when passport reports no error but also no user', () => {
    const { context, res } = makeContext();

    const result = guard.handleRequest(null, false, undefined, context);

    expect(result).toBeNull();
    expect(res.redirect).toHaveBeenCalledWith(
      'http://localhost:3001/login?error=oauth_failed',
    );
  });

  it('passes the user through without redirecting on success', () => {
    const { context, res } = makeContext();
    const user = { userId: 'u1', role: 'USER' };

    const result = guard.handleRequest(null, user, undefined, context);

    expect(result).toBe(user);
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
