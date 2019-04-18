const { dialogflow, SimpleResponse, BasicCard, Suggestions } = require('actions-on-google');
const functions = require('firebase-functions');
const axios = require('axios');
const { DICTIONARY_HEADERS } = require('./config');
const { stripCommonWords, sentenceToArray, simplifyWordArray, simplifyWordPossibilities, randomPhraseList, speechEnhancer } = require('./helper');
const { trimQuotes, findFirstNonEmpty, randomPop } = require('./util');

const app = dialogflow({ debug: true });

// POLYFILLS
if (!Array.prototype.flatMap) {
    Object.defineProperty(Array.prototype, 'flatMap', {
        value(callback) {
            return Array.prototype.concat.apply([], this.map(callback));
        },
    });
}

// HELPER FUNCTIONS
const getPartOfSpeech = ({ article, word }) => {
    if (['idiomatic', 'verb', 'noun', 'pronoun', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection', 'determiner', 'particle', 'residual'].includes(word)) {
        return word;
    }

    return {
        the: 'noun',
        to: 'verb',
    }[article];
};

// @param keyToPreserve {String} the one key NOT to filter because it's what you're choosing from
const sortAndFilterKeywords = (haystacks, needles, keyToPreserve) => {
    needles = Array.isArray(needles) ? needles : simplifyWordArray(sentenceToArray(stripCommonWords(needles)));

    if (Array.isArray(haystacks)) {
        return haystacks
            .map((haystack) => ({
                data: haystack,
                score: sentenceToArray(JSON.stringify(haystack)).reduce((score, word) => (needles.some((needle) => word.startsWith(needle.toLowerCase())) ? ++score : score), 0),
            }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .map(({ data }) => sortAndFilterKeywords(data, needles, keyToPreserve));
    }

    if (typeof haystacks === 'object') {
        return Object.entries(haystacks).reduce((acc, [key, value]) => ({
            ...acc,
            [key]: (key === keyToPreserve) ? value : sortAndFilterKeywords(value, needles, keyToPreserve),
        }), {});
    }


    return haystacks;
};

// @param subPropToExtract {String} if propToExtract is an array or objects, use this prop to also requires this nested property in one of the listed objects
const handleDictionaryResponse = (response, { meaning, partOfSpeech }, propToExtract, subPropToExtract) => {
    const { lexicalEntries } = response.data.results[0];

    let filteredLexicalEntries = lexicalEntries;

    const propToExtractExists = (lexicalEntry) => (
        lexicalEntry[propToExtract] && (!subPropToExtract || lexicalEntry[propToExtract].find(({ [subPropToExtract]: subProp }) => subProp))
    );

    // filter by meaning
    if (meaning) {
        filteredLexicalEntries = findFirstNonEmpty(
            sortAndFilterKeywords(filteredLexicalEntries, meaning, subPropToExtract).filter((lexicalEntry) => propToExtractExists(lexicalEntry)),
            filteredLexicalEntries,
        );
    }

    // filter by part of speech
    if (partOfSpeech) {
        filteredLexicalEntries = findFirstNonEmpty(
            filteredLexicalEntries.filter((lexicalEntry) => ((lexicalEntry.lexicalCategory.toLowerCase() === partOfSpeech) && propToExtractExists(lexicalEntry))),
            filteredLexicalEntries,
        );
    }

    return filteredLexicalEntries.flatMap(({ [propToExtract]: prop }) => prop);
};

const randomPhrase = () => randomPop(randomPhraseList.map((phrase) => ({ word: phrase, id: phrase.toLowerCase().replace(' ', '_') })));

// DIALOGFLOW

const getRootPhrase = async ({ phrase, language, random }) => {
    if (random) {
        return randomPhrase();
    }

    phrase = trimQuotes(phrase);

    const config = { headers: DICTIONARY_HEADERS };
    const response = await axios.get(`https://od-api.oxforddictionaries.com/api/v1/search/${language}?q=${phrase}&limit=5`, config);

    const rootPhrases = response.data.results;

    return rootPhrases[0];
};

app.intent('Default Welcome Intent', (conv) => {
    conv.ask(randomPop([
        'Greetings. What word would you like to hear the origin of?',
        'Hello, what word would you like to hear the origin of?',
        'Hi, what word or phrase would you like to hear the origin of?',
    ]));
    conv.ask(new Suggestions(['🎲 Random', randomPop(randomPhraseList), randomPop(randomPhraseList)]));
});

const getEtymology = async ({ rootPhrase, meaning, partOfSpeech, language, region }) => {
    const config = { headers: DICTIONARY_HEADERS };
    const response = await axios.get(`https://od-api.oxforddictionaries.com/api/v1/entries/${language}/${rootPhrase}/regions=${region}`, config);

    const entries = handleDictionaryResponse(response, { meaning, partOfSpeech }, 'entries', 'etymologies');

    const etymologies = entries.flatMap(({ etymologies }) => etymologies || []);

    return etymologies[0];
};

const handleGetEtymology = async (conv, { phrase, article, word, meaning, random }) => {
    const { user: { locale } } = conv;

    try {
        const [language, region] = locale.split('-');
        const { word: displayPhrase, id: originalRootPhrase } = await getRootPhrase({ phrase, language, random });
        const partOfSpeech = getPartOfSpeech({ article, word });

        let etymology;
        for (const rootPhrase of simplifyWordPossibilities(originalRootPhrase)) {
            try {
                etymology = await getEtymology({ rootPhrase, meaning, partOfSpeech, language, region });
            } catch (e) {
            }

            if (etymology) {
                break;
            }
        }

        if (etymology) {
            conv.ask(new SimpleResponse({
                text: randomPop([
                    `Here you go!`,
                    `Coming right up!`,
                    `This is what I found`,
                    `Here's what I found`,
                ]),
                speech: speechEnhancer(`${displayPhrase}. ${etymology}.`),
            }));
            conv.close(new BasicCard({ title: displayPhrase, text: `${etymology}.` }));
        } else {
            conv.close(`No entries found for ${displayPhrase}.`);
        }
    } catch (error) {
        console.error(error);
        conv.close(`No entries found for ${phrase}.`);
    }
};

app.intent(['get_etymology', 'Default Welcome Intent - get_etymology', 'get_random_etymology'], handleGetEtymology);

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
