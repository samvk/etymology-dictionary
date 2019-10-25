import {
    randomPop,
    escapeXml,
    trimQuotes,
    findFirstNonEmpty
    // softFilter
} from '../src/util';

test('randomPop returns a random item from the array (mocked)', () => {
    const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(randomPop(['alpha', 'bravo'])).toBe('alpha');
    mathRandomSpy.mockRestore();
});

test('escapeXml escapes XML special characters', () => {
    expect(
        escapeXml(`<note>"Singin' in the Rain" has 1 Golden Globe win & 2 nominations.</note>`)
    ).toBe(
        `&lt;note&gt;&quot;Singin&apos; in the Rain&quot; has 1 Golden Globe win &amp; 2 nominations.&lt;/note&gt;`
    );
});

describe('trimQuotes', () => {
    test('trims single-quotes', () => expect(trimQuotes(`'a"l'p'h"a'`)).toBe(`a"l'p'h"a`));
    test('trims double-quotes', () => expect(trimQuotes(`"a'l"p"h'a"`)).toBe(`a'l"p"h'a`));
});

describe('findFirstNonEmpty', () => {
    test('returns the first non-empty array', () => expect(findFirstNonEmpty([], ['alpha'], ['bravo'])).toEqual(['alpha']));
    test('returns an empty array if no non-empty arrays found', () => expect(findFirstNonEmpty([], [])).toEqual([]));
});

// describe('softFilter', () => {
//     test('returns a filtered array', () => expect(softFilter([1, 2, 3], (x) => x > 1)).toEqual([2, 3]));
//     test('returns the original array if none pass', () => expect(softFilter([1, 2, 3], (x) => x > 10)).toEqual([1, 2, 3]));
// });
