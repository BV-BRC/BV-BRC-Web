/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * Viewer reuse in app.js _doNavigation().
 *
 * The app keeps one viewer in the center region and reuses it when
 * navigating, rather than rebuilding. Deciding *when* to reuse with
 * `cur instanceof ctor` was wrong for subclasses: a Bacteria viewer is an
 * instanceof Taxonomy, so navigating /view/Bacteria/2 -> /view/Taxonomy/...
 * reused the Bacteria viewer and only updated its state. The URL and
 * breadcrumbs changed while the page kept its "Bacteria View" label, its
 * Bacteria genera panel, and BacteriaOverview.
 *
 * The real _doNavigation needs the whole dijit stack, so these tests model
 * the decision itself against the project's actual viewer hierarchy, and
 * assert against the source that the implementation still uses the identity
 * test rather than instanceof.
 */

const APP_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'app.js'), 'utf8'
);

/**
 * Stand-in for dojo/declare: single inheritance via the prototype chain,
 * with proto.constructor assigned the way declare.js:860 does. That
 * assignment is what makes the identity test viable.
 */
function declare(base) {
  function Ctor() {}
  if (base) Ctor.prototype = Object.create(base.prototype);
  Ctor.prototype.constructor = Ctor;
  return Ctor;
}

// The project's real hierarchy, as of this change:
//   TabViewerBase <- GenomeList <- Taxonomy <- {Bacteria, Virus}
//                               <- GenomeGroup
//   JobResult <- {BlastJobResult, ComprehensiveGenomeAnalysis, ...}
const TabViewerBase = declare(null);
const GenomeList = declare(TabViewerBase);
const Taxonomy = declare(GenomeList);
const Bacteria = declare(Taxonomy);
const Virus = declare(Taxonomy);
const GenomeGroup = declare(GenomeList);
const JobResult = declare(TabViewerBase);
const BlastJobResult = declare(JobResult);

/** What app.js does now. */
function shouldReuse(cur, ctor) {
  return !!(cur && cur.constructor === ctor);
}

/** What it did before — kept to document the difference. */
function shouldReuseOld(cur, ctor) {
  return cur instanceof ctor;
}

const instanceOf = (Ctor) => new Ctor();

describe('viewer reuse decision', () => {
  describe('the reported bug: subclass viewer, parent route', () => {
    /**
     * /view/Bacteria/2 then Organisms -> Influenza A virus
     * (/view/Taxonomy/2955291). Verified against a live page before and
     * after the fix.
     */
    test('a Bacteria viewer is NOT reused for a Taxonomy route', () => {
      const cur = instanceOf(Bacteria);

      expect(shouldReuseOld(cur, Taxonomy)).toBe(true);   // the bug
      expect(shouldReuse(cur, Taxonomy)).toBe(false);     // fixed
    });

    test('likewise for Virus, the other Taxonomy subclass', () => {
      const cur = instanceOf(Virus);

      expect(shouldReuseOld(cur, Taxonomy)).toBe(true);
      expect(shouldReuse(cur, Taxonomy)).toBe(false);
    });

    test('and for the deeper GenomeList ancestor', () => {
      // Taxonomy extends GenomeList, so this had the same problem two
      // levels up: /view/Taxonomy/... -> /view/GenomeList/...
      const cur = instanceOf(Taxonomy);

      expect(shouldReuseOld(cur, GenomeList)).toBe(true);
      expect(shouldReuse(cur, GenomeList)).toBe(false);
    });

    test.each([
      ['GenomeGroup', 'GenomeList', GenomeGroup, GenomeList],
      ['BlastJobResult', 'JobResult', BlastJobResult, JobResult],
      ['Bacteria', 'TabViewerBase', Bacteria, TabViewerBase]
    ])('%s viewer is not reused for a %s route', (subName, parentName, Sub, Parent) => {
      expect(shouldReuse(instanceOf(Sub), Parent)).toBe(false);
    });
  });

  describe('reuse still happens where it should', () => {
    /**
     * The common case and the reason reuse exists: switching taxa inside
     * the same viewer must not rebuild it. Breaking this would make every
     * navigation slower and lose scroll/tab state.
     */
    test.each([
      ['Taxonomy', Taxonomy],
      ['Bacteria', Bacteria],
      ['Virus', Virus],
      ['GenomeList', GenomeList],
      ['JobResult', JobResult]
    ])('%s reuses its own instance', (name, Ctor) => {
      expect(shouldReuse(instanceOf(Ctor), Ctor)).toBe(true);
    });
  });

  describe('directions that were already correct', () => {
    test('parent viewer is not reused for a subclass route', () => {
      // This already rebuilt: a Taxonomy instance is not instanceof Bacteria.
      const cur = instanceOf(Taxonomy);

      expect(shouldReuseOld(cur, Bacteria)).toBe(false);
      expect(shouldReuse(cur, Bacteria)).toBe(false);
    });

    test('sibling subclasses are not reused for each other', () => {
      expect(shouldReuse(instanceOf(Bacteria), Virus)).toBe(false);
      expect(shouldReuse(instanceOf(Virus), Bacteria)).toBe(false);
    });

    test('unrelated viewers are not reused', () => {
      expect(shouldReuse(instanceOf(JobResult), Taxonomy)).toBe(false);
    });
  });

  describe('no current container', () => {
    /**
     * getCurrentContainer() returns `false` when there is no center child.
     * `false instanceof X` was safely false; `false.constructor` would
     * throw, hence the explicit guard in the implementation.
     */
    test.each([[false], [null], [undefined]])('%p does not throw', (cur) => {
      expect(() => shouldReuse(cur, Taxonomy)).not.toThrow();
      expect(shouldReuse(cur, Taxonomy)).toBe(false);
    });
  });
});

describe('implementation stays in step', () => {
  test('app.js uses the constructor identity test, not instanceof', () => {
    expect(APP_SRC).toContain('cur && cur.constructor === ctor');
  });

  test('the old instanceof test is gone', () => {
    // Guards against a revert or a merge resurrecting it.
    expect(APP_SRC).not.toMatch(/if\s*\(\s*cur\s+instanceof\s+ctor\s*\)/);
  });
});
