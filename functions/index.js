const { dialogflow, SimpleResponse } = require('actions-on-google');
const functions = require('firebase-functions');
const axios = require('axios');
const { DICTIONARY_HEADERS } = require('./config');
const { stripCommonWords, sentenceToArray, simplifyWordArray } = require('./helper');
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

// DIALOGFLOW

// random grammar changes that just sound better
const speechEnhancer = (text) => (
    text
        .replace(/ ‘/g, ', ‘')
        .replace(/: ([a-z])/g, (_, firstLetter) => `. ${firstLetter.toUpperCase()}`)
);

const getRootPhrase = async ({ phrase, language }) => {
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
});

const getEtymology = async ({ rootPhrase, meaning, partOfSpeech, language, region }) => {
    const config = { headers: DICTIONARY_HEADERS };
    const response = await axios.get(`https://od-api.oxforddictionaries.com/api/v1/entries/${language}/${rootPhrase}/regions=${region}`, config);

    const entries = handleDictionaryResponse(response, { meaning, partOfSpeech }, 'entries', 'etymologies');

    return entries.find(({ etymologies }) => etymologies).etymologies[0];
};

const handleGetEtymology = async (conv, { phrase, article, word, meaning }) => {
    const { user: { locale } } = conv;

    try {
        const [language, region] = locale.split('-');
        const { word: displayPhrase, id: rootPhrase } = await getRootPhrase({ phrase, language });
        const partOfSpeech = getPartOfSpeech({ article, word });

        const etymology = await getEtymology({ rootPhrase, meaning, partOfSpeech, language, region });

        let response;
        if (!etymology) {
            response = `No entries found for ${displayPhrase}.`;
        }
        response = `${displayPhrase}.  \n${etymology}`;

        conv.close(new SimpleResponse({
            text: response,
            speech: speechEnhancer(response),
        }));
    } catch (error) {
        console.error(error);
        conv.close(`No entries found for ${phrase}.`);
    }
};

app.intent(['get_etymology', 'Default Welcome Intent - get_etymology'], handleGetEtymology);

// const getSentences = async ({ rootPhrase, meaning, partOfSpeech, language }) => {
//     const config = { headers: DICTIONARY_HEADERS };
//     const response = await axios.get(`https://od-api.oxforddictionaries.com/api/v1/entries/${language}/${rootPhrase}/sentences`, config);
//
//     const sentences = handleDictionaryResponse(response, { meaning, partOfSpeech }, 'sentences');
//
//     return sentences.map(({ text }) => text); // the different lexical entries might relate to the different part of speeches?
// };
//
// const handleUseInSentence = async (conv, { phrase, article, word, meaning }) => {
//     const { user: { locale } } = conv;
//
//     try {
//         const [language] = locale.split('-');
//         const { id: rootPhrase } = await getRootPhrase({ phrase, language });
//         const partOfSpeech = getPartOfSpeech({ article, word });
//
//         const sentences = await getSentences({ rootPhrase, meaning, partOfSpeech, language });
//         conv.close(`${sayOkay()}.  \n${randomPop(sentences)}`); // this should maybe loop through sentences (or is a random pop good enough)? Should it remember forever or just this session?
//     } catch (error) {
//         console.error(error);
//         conv.close(`No entries found for ${phrase}.`);
//     }
// };
//
// app.intent('use_in_sentence', handleUseInSentence);

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);

// getEtymology({ phrase: 'lead', article: 'the', locale: 'en-US' });
// getEtymology({ rootPhrase: 'tear', meaning: 'eye', partOfSpeech: undefined, language: 'en', region: 'US' });
