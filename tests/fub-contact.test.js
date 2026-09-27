const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateContactPayload,
  buildEventPayload,
  submitEventToFub,
} = require('../lib/fub-contact');

describe('validateContactPayload', () => {
  it('rejects an empty object', () => {
    const result = validateContactPayload({});
    assert.equal(result.valid, false);
    assert.match(result.error, /name/i);
  });

  it('accepts name with email', () => {
    const result = validateContactPayload({
      name: 'Jane Buyer',
      email: 'jane@example.com',
    });
    assert.equal(result.valid, true);
    assert.equal(result.data.firstName, 'Jane');
    assert.equal(result.data.lastName, 'Buyer');
  });

  it('accepts phone without email', () => {
    const result = validateContactPayload({
      firstName: 'Jan',
      phone: '7025550100',
    });
    assert.equal(result.valid, true);
  });
});

describe('buildEventPayload', () => {
  it('builds Follow Up Boss event shape', () => {
    const validation = validateContactPayload({
      name: 'Test User',
      email: 'test@example.com',
      message: 'Hello',
      formName: 'Homepage Contact',
    });
    assert.equal(validation.valid, true);

    const payload = buildEventPayload(
      { message: 'Hello', formName: 'Homepage Contact' },
      validation.data,
      'https://www.waterfallhomesnorthlasvegas.com/',
    );

    assert.equal(payload.source, 'waterfallhomesnorthlasvegas.com');
    assert.equal(payload.type, 'General Inquiry');
    assert.equal(payload.person.emails[0].value, 'test@example.com');
    assert.deepEqual(payload.person.tags, [
      'waterfallhomesnorthlasvegas.com',
      'Homepage Contact',
    ]);
  });
});

describe('submitEventToFub', () => {
  it('sends Authorization and X-System headers without logging the key', async () => {
    const mockFetch = mock.fn(async () => ({
      ok: true,
      status: 201,
    }));

    await submitEventToFub({ type: 'General Inquiry' }, 'test-api-key', mockFetch);

    assert.equal(mockFetch.mock.calls.length, 1);
    const [url, options] = mockFetch.mock.calls[0].arguments;
    assert.equal(url, 'https://api.followupboss.com/v1/events');
    assert.equal(options.method, 'POST');
    assert.ok(
      options.headers.Authorization.startsWith('Basic '),
      'uses Basic auth',
    );
    assert.equal(options.headers['X-System'], 'waterfallhomesnorthlasvegas.com');
    assert.ok(!options.headers.Authorization.includes('test-api-key'));
  });
});
