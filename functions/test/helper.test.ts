import {
    stripCommonWords,
    sentenceToArray,
    sameLetters,
    simplifyWordArray,
    simplifyWordPossibilities,
    speechEnhancer
} from '../src/helper';

test('stripCommonWords removes unimportant "filler" words that are mostly syntax', () => {
    expect(stripCommonWords('I am so happy to see you my boy')).toBe('happy boy');
});

describe('sentenceToArray', () => {
    test('converts a sentence to an array of words', () => {
        expect(sentenceToArray('alpha bravo charley')).toEqual(['alpha', 'bravo', 'charley']);
    });
    test('lowercases the array of words', () => {
        expect(sentenceToArray('Alpha BRAVO charley')).toEqual(['alpha', 'bravo', 'charley']);
    });
    test('removes most special characters (excluding "word" characters like hyphens)', () => {
        expect(
            sentenceToArray(`He said: “I have had it with these $,}‘);"./~{’'%\`#(=& snakes on this gosh-darn plane!” — Samuel Jackson`)
        ).toEqual(['he', 'said', 'i', 'have', 'had', 'it', 'with', 'these', 'snakes', 'on', 'this', 'gosh-darn', 'plane', 'samuel', 'jackson']);
    });
});

test('sameLetters returns `true` for strings of all the same letters', () => {
    expect(sameLetters('aa')).toBe(true);
    expect(sameLetters('ab')).toBe(false);
});

describe('simplifyWordArray', () => {
    test('drops common suffixes from words', () => {
        expect(simplifyWordArray(['quickly', 'boxes', 'dancer', 'cat'])).toEqual(['quick', 'box', 'danc', 'cat']);
    });
    test('drops any double final consonant', () => {
        expect(simplifyWordArray(['runner', 'stopping'])).toEqual(['run', 'stop']);
    });
    test('skips trimming words without at least two leading letters', () => {
        expect(simplifyWordArray(['ring', 'best'])).toEqual(['ring', 'best']);
    });
});

test('simplifyWordPossibilities return an array of possible root word guesses', () => {
    expect(simplifyWordPossibilities('runner')).toEqual(['runner', 'run']);
    expect(simplifyWordPossibilities('dancing')).toEqual(['dancing', 'dance', 'danc']);
    expect(simplifyWordPossibilities('truly')).toEqual(['truly', 'true', 'tru']);
    expect(simplifyWordPossibilities('something')).toEqual(['something', 'somethe', 'someth']);
});

describe('speechEnhancer', () => {
    test('converts a sentence to SSML', () => {
        expect(speechEnhancer('"Hello, World!"')).toBe('<speak>&quot;Hello, World!&quot;</speak>');
    });
    test('makes some grammar changes that sound better in SSML', () => {
        expect(speechEnhancer('1500s ‘to walk’ (earlier ‘to trample’): of uncertain origin.')).toBe('<speak>1500s, ‘to walk’ (earlier, ‘to trample’). Of uncertain origin.</speak>');
    });
    // test('adds a <lang> tag for suspected foreign words', () => {
    //     expect(speechEnhancer('Late Middle English from French marcher')).toBe('<speak>Late Middle English from French <lang xml:lang="fr-FR">marcher</lang></speak>');
    // });
});
