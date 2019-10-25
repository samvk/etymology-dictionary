import { escapeXml } from './util';

const commonWords = [
    'the',
    'be',
    'to',
    'of',
    'and',
    'a',
    'in',
    'that',
    'have',
    'I',
    'it',
    'for',
    'not',
    'on',
    'with',
    'he',
    'as',
    'you',
    'do',
    'at',
    'this',
    'but',
    'his',
    'by',
    'from',
    'they',
    'we',
    'say',
    'her',
    'she',
    'or',
    'an',
    'will',
    'my',
    'one',
    'all',
    'would',
    'there',
    'their',
    'what',
    'so',
    'up',
    'out',
    'if',
    'about',
    'who',
    'get',
    'which',
    'go',
    'me',
    'when',
    'make',
    'can',
    'like',
    'no',
    'just',
    'him',
    'know',
    'take',
    'into',
    'your',
    'good',
    'some',
    'could',
    'them',
    'see',
    'other',
    'than',
    'then',
    'now',
    'look',
    'only',
    'come',
    'its',
    'over',
    'think',
    'also',
    'back',
    'after',
    'use',
    'two',
    'how',
    'our',
    'well',
    'way',
    'even',
    'new',
    'want',
    'because',
    'any',
    'these',
    'give',
    'most',
    'us',
    'is',
    'am',
    'are',
];

export const stripCommonWords = (phrase: string) => (
    phrase.replace(/[\w-']+/g, (match) => (commonWords.includes(match) ? '' : match))
);

export const sentenceToArray = (phrase: string) => (
    phrase.toLowerCase().replace(/[.,/#!$%&;:{}=`~()'"‘’“”]/g, ' ').split(/\s+/)
);

const simplifyWordGenerator = (word: string, callback: (match: string, ...args: string[]) => string) => word.replace(
    /(\w{2})(ing|er|ed|[ie]?ly|e?y|e?s)$/g,
    callback,
);

const sameLetters = (str: string) => [...str].every((letter, _, list) => letter === list[0]);

export const simplifyWord = (word: string) => simplifyWordGenerator(
    word,
    (_, previousLetters) => (sameLetters(previousLetters) ? previousLetters[0] : previousLetters),
);

// TODO::simplify
export const simplifyWordPossibilities = (word: string) => ([...new Set([
    word,
    simplifyWordGenerator(
        word,
        (_, previousLetters) => (sameLetters(previousLetters) ? previousLetters[0] : `${previousLetters}e`),
    ),
    simplifyWordGenerator(
        word,
        (_, previousLetters) => (sameLetters(previousLetters) ? previousLetters[0] : `${previousLetters}`),
    ),
])]);

export const simplifyWordArray = (arr: string[]) => arr.map(simplifyWord);

export const randomPhraseList = [
    'helicopter',
    'jumbo',
    'sarcasm',
    'decimate',
    'lemur',
    'sideburn',
    'loophole',
    'nice',
    'muscle',
    'pamphlet',
    'mortgage',
    'electric',
    'alcohol',
    'manticore',
    'journal',
    'dunce',
    'nightmare',
    'sandwich',
    'malaria',
    'quarantine',
    'clue',
    'genuine',
    'palace',
    'ketchup',
    'ostracize',
    'robot',
    'assassin',
    'nimrod',
    'ampersand',
    'boycott',
    'hearse',
    'gymnasium',
    'peninsula',
    'vaccine',
    'nostalgia',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'January',
    'February',
    'April',
    'June',
    'July',
    'August',
    'September',
    'hysteric',
    'goodbye',
    'plumber',
    'serendipity',
    'mastodon',
    'cretin',
    'apron',
    'cobalt',
    'slave',
    'influenza',
    'pandemonium',
    'walrus',
    'casino',
    'noon',
    'trivia',
    'checkmate',
    'penguin',
    'vodka',
    'cloud',
    'salad',
    'supercilious',
    'freelance',
    'bully',
    'female',
    'alcove',
    'parasite',
    'disaster',
    'torpedo',
    'apostrophe',
    'pedagogue',
    'jinx',
    'oxymoron',
    'booze',
    'album',
    'umpire',
    'nickname',
    'newt',
    'stigma',
    'burrito',
    'maverick',
    'dinosaur',
];

// Speech enhancer

const languageRegion = {
    'Old English': 'de-DE', // closest match? (but it terms of spelling is this most accurate?)
    'Middle English': 'de-DE', // closest match? (but it terms of spelling is this most accurate?)
    German: 'de-DE',
    French: 'fr-FR',
    Spanish: 'es-ES',
    Italian: 'it-IT',
    Portuguese: 'pt_BR',
    Hindi: 'en-IN', // should be 'hi_IN' when support is added
    Sanskrit: 'en-IN', // should be 'hi_IN' when support is added
    Chinese: 'zh-CN',
    Japanese: 'js-JP',
    Latin: 'it-IT', // closest match? (but it terms of spelling is this most accurate?)
    Greek: 'el-GR',
    Dutch: 'nl-NL',
    Arabic: 'ar-SA',
    Persian: 'fa-AF',
    Russian: 'ru-RU',
    Polish: 'pl-PL',
};

// NOTE::all of this currently does nothing. Uncomment when google adds <lang /> SSML support
// const accentSsml = (foreignWord: string, language: string) => `<lang xml:lang="${languageRegion[language]}">${foreignWord}</lang>`;
const accentSsml = (foreignWord: string) => foreignWord;

const languagesPattern = Object.keys(languageRegion).join('|');
const languageRegex = new RegExp(`(${languagesPattern}) ([^\\s(,\\.<]+)`, 'g');

const addAccent = (text: string) => (
    text.replace(languageRegex, (match, language, foreignWord) => {
        if (['and', 'from', 'dialect'].includes(foreignWord)) {
            return match;
        }
        // return `${language} ${accentSsml(foreignWord, language)}`;
        return `${language} ${accentSsml(foreignWord)}`;
    })
);

// random grammar changes that just sound better
export const speechEnhancer = (text: string) => (
    addAccent(`<speak>${escapeXml(text)}</speak>`)
        .replace(/ ‘/g, ', ‘')
        .replace(/: ([a-z])/g, (_, firstLetter) => `. ${firstLetter.toUpperCase()}`)
);
