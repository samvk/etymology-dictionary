const { dialogflow, SimpleResponse } = require('actions-on-google');
const functions = require('firebase-functions');
const axios = require('axios');
const { DICTIONARY_HEADERS } = require('./config');
const { trimQuotes, softFilter } = require('./util');

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

const handleDictionaryResponse = (response, propToExtract, { partOfSpeech }) => {
    const { lexicalEntries } = response.data.results[0];

    const filteredLexicalEntries = softFilter(lexicalEntries, ({ lexicalCategory }) => (lexicalCategory[propToExtract] && lexicalCategory.toLowerCase() === partOfSpeech));

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

const getEtymology = async ({
    rootPhrase, partOfSpeech, language, region,
}) => {
    const config = { headers: DICTIONARY_HEADERS };
    const response = await axios.get(`https://od-api.oxforddictionaries.com/api/v1/entries/${language}/${rootPhrase}/regions=${region}`, config);

    const entries = handleDictionaryResponse(response, 'entries', { partOfSpeech });

    // console.log(entries);

    return entries.find(({ etymologies }) => etymologies).etymologies[0];
};

// app.intent('Default Fallback Intent', (conv) => {
// });

const handleGetEtymology = async (conv, { phrase, article, word }) => {
    const { user: { locale } } = conv;

    try {
        const [language, region] = locale.split('-');
        const { word: displayPhrase, id: rootPhrase } = await getRootPhrase({ phrase, language });
        const partOfSpeech = getPartOfSpeech({ article, word });

        const etymology = await getEtymology({
            rootPhrase, partOfSpeech, language, region,
        });

        const response = `${displayPhrase}.  \n${etymology}`;

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

// const getSentences = async ({ rootPhrase, partOfSpeech, language }) => {
//     const config = { headers: DICTIONARY_HEADERS };
//     const response = await axios.get(`https://od-api.oxforddictionaries.com/api/v1/entries/${language}/${rootPhrase}/sentences`, config);
//
//     const sentences = handleDictionaryResponse(response, 'sentences', { partOfSpeech });
//
//     return sentences.map(({ text }) => text); // the different lexical entries might relate to the different part of speeches?
// };
//
// const handleUseInSentence = async (conv, { phrase, article, word }) => {
//     const { user: { locale } } = conv;
//
//     try {
//         const [language] = locale.split('-');
//         const { id: rootPhrase } = await getRootPhrase({ phrase, language });
//         const partOfSpeech = getPartOfSpeech({ article, word });
//
//         const sentences = await getSentences({ rootPhrase, partOfSpeech, language });
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
