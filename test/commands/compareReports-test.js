import compareReports from '../../src/commands/compareReports';
import * as defaultConfig from '../../src/DEFAULTS';
import makeRequest from '../../src/makeRequest';

jest.mock('../../src/makeRequest');

let subject;
let config;
let log;
let compareResult;
let cliArgs;

beforeEach(() => {
  log = jest.fn();
  compareResult = {
    summary: 'Mocked summary',
    equal: false,
    diffs: [
      [
        {
          url: 'https://dummyimage.com/200/000/ffffff.png&text=aa',
          component: 'Foo',
          variant: 'bar',
          target: 'chrome',
        },
        {
          url: 'https://dummyimage.com/200/000/f7f7f7.png&text=aa',
          component: 'Foo',
          variant: 'bar',
          target: 'chrome',
        },
      ],
    ],
  };

  cliArgs = {};
  makeRequest.mockReset();
  makeRequest.mockImplementation(() => Promise.resolve(compareResult));
  config = { ...defaultConfig, compareThreshold: 0.00005 };
  subject = () => compareReports('abc', 'xyz', config, cliArgs, log);
});

it('succeeds', async () => {
  const result = await subject();
  expect(result.resolved).toEqual([]);
  expect(log.mock.calls).toEqual([
    ['Found 1 diffs to deep-compare using threshold 0.00005'],
    ['✗ Foo - bar - chrome - found diff pixel with a color delta of 0.00005739599717234143 which is larger than threshold'],
    ['Mocked summary'],
  ]);
});

describe('when compareThreshold is missing', () => {
  beforeEach(() => {
    delete config.compareThreshold;
  });

  it('does not deep-compare', async () => {
    const result = await subject();
    expect(result.resolved).toBe(undefined);

    expect(log.mock.calls).toEqual([]);
  });
});

describe('when threshold is larger than the diff', () => {
  beforeEach(() => {
    config.compareThreshold = 0.1;
  });

  it('returns the diff that was deep-compared', async () => {
    const result = await subject();
    expect(result.resolved).toEqual(compareResult.diffs);

    expect(log.mock.calls).toEqual([
      ['Found 1 diffs to deep-compare using threshold 0.1'],
      ['✓ Foo - bar - chrome - diff is within threshold'],
      ['Mocked summary'],
    ]);

    // 2 compare calls, 1 ignore call
    expect(makeRequest.mock.calls.length).toBe(3);
  });

  describe('when --dry-run is used', () => {
    beforeEach(() => {
      cliArgs.dryRun = true;
    });

    it('returns the diff that was deep-compared', async () => {
      const result = await subject();
      expect(result.resolved).toEqual(compareResult.diffs);

      expect(log.mock.calls).toEqual([
        ['Found 1 diffs to deep-compare using threshold 0.1'],
        ['Running in --dry-run mode -- no destructive commands will be issued'],
        ['✓ Foo - bar - chrome - diff is within threshold'],
        ['Mocked summary'],
      ]);

      // 2 compare calls, 0 ignore call
      expect(makeRequest.mock.calls.length).toBe(2);
    });
  });
});
