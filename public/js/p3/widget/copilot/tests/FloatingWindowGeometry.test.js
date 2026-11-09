/* eslint-env jest */
const path = require('path');

const G = require(path.join(__dirname, '..', 'FloatingWindowGeometry.js'));

const FULL = { width: 1920, height: 1080 };
const HALF = { width: 960, height: 1080 };

function memoryStorage(initial) {
  const data = Object.assign({}, initial);
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    data
  };
}

describe('fractions', () => {
  test('round trip', () => {
    const rect = {
      left: 192, top: 108, width: 1536, height: 756
    };
    expect(G.fromFractions(G.toFractions(rect, FULL), FULL)).toEqual(rect);
  });

  test('default is the old CSS: 10vw / 10vh, 80% x 70%', () => {
    expect(G.fromFractions(null, FULL)).toEqual({
      left: 192, top: 108, width: 1536, height: 756
    });
  });

  test('half screen and back restores the size the user chose', () => {
    const chosen = {
      left: 400, top: 200, width: 1000, height: 600
    };
    const frac = G.toFractions(chosen, FULL);
    const half = G.clampRect(G.fromFractions(frac, HALF), HALF);
    expect(half.width).toBe(500);
    expect(G.clampRect(G.fromFractions(frac, FULL), FULL)).toEqual(chosen);
  });

  test('invalid fractions fall back to the default', () => {
    for (const bad of [{}, {
      x: 0, y: 0, w: 0, h: 0.5
    }, {
      x: 'a', y: 0, w: 0.5, h: 0.5
    },
    {
      x: 0, y: 0, w: 9, h: 0.5
    }, {
      x: NaN, y: 0, w: 0.5, h: 0.5
    }]) {
      expect(G.validFractions(bad)).toBeNull();
      expect(G.fromFractions(bad, FULL)).toEqual(G.fromFractions(G.DEFAULT, FULL));
    }
  });
});

describe('clampRect', () => {
  test('a window that fits is left alone', () => {
    const rect = {
      left: 100, top: 100, width: 800, height: 500
    };
    expect(G.clampRect(rect, FULL)).toEqual(rect);
  });

  test('never smaller than the minimum', () => {
    const r = G.clampRect({
      left: 10, top: 10, width: 50, height: 50
    }, FULL);
    expect([r.width, r.height]).toEqual([G.MIN_W, G.MIN_H]);
  });

  test('a viewport smaller than the minimum is filled', () => {
    const tiny = { width: 250, height: 150 };
    expect(G.clampRect({
      left: 40, top: 40, width: 800, height: 600
    }, tiny))
      .toEqual({
        left: 0, top: 0, width: 250, height: 150
      });
  });

  test('a window larger than the viewport shrinks to it', () => {
    const r = G.clampRect({
      left: 0, top: 0, width: 1800, height: 900
    }, { width: 700, height: 500 });
    expect(r).toEqual({
      left: 0, top: 0, width: 700, height: 500
    });
  });

  test('the title bar is brought back from every side', () => {
    const size = { width: 600, height: 400 };
    const cases = [
      { left: -500, top: 100 }, // off the left
      { left: 1800, top: 100 }, // off the right
      { left: 100, top: -300 }, // above the top: the title bar would be hidden
      { left: 100, top: 1050 } // below the bottom
    ];
    for (const pos of cases) {
      const r = G.clampRect(Object.assign({}, size, pos), FULL);
      expect(r.left).toBeGreaterThanOrEqual(0);
      expect(r.top).toBeGreaterThanOrEqual(0);
      expect(r.left + r.width).toBeLessThanOrEqual(FULL.width);
      expect(r.top + r.height).toBeLessThanOrEqual(FULL.height);
    }
  });

  test('custom minimums', () => {
    const r = G.clampRect({
      left: 0, top: 0, width: 10, height: 10
    }, FULL, { minW: 100, minH: 80 });
    expect([r.width, r.height]).toEqual([100, 80]);
  });
});

test('narrow below 700 px', () => {
  expect(G.isNarrow(699)).toBe(true);
  expect(G.isNarrow(700)).toBe(false);
});

describe('storage', () => {
  test('save then load', () => {
    const s = memoryStorage();
    G.save(s, {
      x: 0.2, y: 0.1, w: 0.5, h: 0.6
    });
    expect(G.load(s)).toEqual({
      x: 0.2, y: 0.1, w: 0.5, h: 0.6
    });
  });

  test('corrupt or missing values load as null', () => {
    expect(G.load(memoryStorage())).toBeNull();
    expect(G.load(memoryStorage({ [G.STORAGE_KEY]: '{not json' }))).toBeNull();
    expect(G.load(memoryStorage({ [G.STORAGE_KEY]: '{"x":1}' }))).toBeNull();
    expect(G.load(null)).toBeNull();
  });

  test('invalid fractions are not saved; a throwing store is ignored', () => {
    const s = memoryStorage();
    G.save(s, {
      x: 0, y: 0, w: 0, h: 0
    });
    expect(s.data).toEqual({});
    const throwing = { setItem: () => { throw new Error('quota'); } };
    expect(() => G.save(throwing, G.DEFAULT)).not.toThrow();
  });
});
