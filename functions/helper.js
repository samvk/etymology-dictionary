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
];

module.exports.stripCommonWords = (phrase) => (
    phrase.replace(/[\w-']+/g, (match) => (commonWords.includes(match) ? '' : match))
);

module.exports.sentenceToArray = (phrase) => (
    phrase.toLowerCase().replace(/[.,/#!$%&;:{}=`~()'"‘’“”]/g, ' ').split(/\s+/)
);

const simplifyWordGenerator = (word, callback) => word.replace(
    /(\w{2})(ing|er|ed|[ie]?ly|e?y|e?s)$/g,
    callback,
);

const sameLetters = (str) => [...str].every((letter, _, list) => letter === list[0]);

const simplifyWord = (word) => simplifyWordGenerator(
    word,
    (_, previousLetters) => (sameLetters(previousLetters) ? previousLetters[0] : previousLetters),
);
module.exports.simplifyWord = simplifyWord;

// TODO::simplify
module.exports.simplifyWordPossibilities = (word) => ([...new Set([
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

module.exports.simplifyWordArray = (arr) => arr.map(simplifyWord);
