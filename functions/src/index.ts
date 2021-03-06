import { dialogflow, SimpleResponse, BasicCard, Suggestions, DialogflowConversation } from 'actions-on-google';
import * as functions from 'firebase-functions';
import * as flatMap from 'array.prototype.flatmap';
import axios, { AxiosResponse } from 'axios';
import { DICTIONARY_HEADERS } from './config';
import { stripCommonWords, sentenceToArray, simplifyWordArray, simplifyWordPossibilities, randomPhraseList, speechEnhancer } from './helper';
import { trimQuotes, findFirstNonEmpty, randomPop } from './util';

// TYPES & INTERFACES
interface Entry {
    etymologies?: string[],
}
interface LexicalEntry {
    entries?: Entry[];
    lexicalCategory: string;
}
type LexicalEntryProps = 'entries';
type LexicalEntrySubProps = 'etymologies';
type Haystacks = any[] | { [key: string]: {} } | ArrayLike<{}>;

// HELPER FUNCTIONS
const getPartOfSpeech = ({ article, word }: { article: string, word: string }) => {
    if (['idiomatic', 'verb', 'noun', 'pronoun', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection', 'determiner', 'particle', 'residual'].includes(word)) {
        return word;
    }

    switch (article) {
        case 'the': return 'noun';
        case 'to': return 'verb';
        default: return null;
    }
};

// @param keyToPreserve {String} the one key NOT to filter because it's what you're choosing from
const sortAndFilterKeywords = (haystacks: Haystacks, needlesArg: string | string[], keyToPreserve?: string): Haystacks => {
    const needles = Array.isArray(needlesArg) ? needlesArg : simplifyWordArray(sentenceToArray(stripCommonWords(needlesArg)));

    if (Array.isArray(haystacks)) {
        return haystacks
            .map((haystack) => ({
                data: haystack,
                score: sentenceToArray(JSON.stringify(haystack)).reduce((score, word) => (needles.some((needle) => word.startsWith(needle.toLowerCase())) ? score + 1 : score), 0),
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
const handleDictionaryResponse = (
    response: AxiosResponse, { meaning, partOfSpeech }: { meaning: string | null, partOfSpeech: string | null }, propToExtract: LexicalEntryProps, subPropToExtract?: LexicalEntrySubProps
) => {
    const { lexicalEntries } = response.data.results[0];

    let filteredLexicalEntries = lexicalEntries;

    const propToExtractExists = (lexicalEntry: LexicalEntry) => (
        lexicalEntry[propToExtract] && (!subPropToExtract || (lexicalEntry[propToExtract] || []).find(({ [subPropToExtract]: subProp }) => !!subProp))
    );

    // filter by meaning
    if (meaning) {
        const similarLexicalEntries = sortAndFilterKeywords(filteredLexicalEntries, meaning, subPropToExtract) as LexicalEntry[]; // `sortAndFilterKeywords` is called recursively but the final call returns LexicalEntry[]
        filteredLexicalEntries = findFirstNonEmpty(
            similarLexicalEntries.filter((lexicalEntry: LexicalEntry) => propToExtractExists(lexicalEntry)),
            filteredLexicalEntries,
        );
    }

    // filter by part of speech
    if (partOfSpeech) {
        filteredLexicalEntries = findFirstNonEmpty(
            filteredLexicalEntries.filter((lexicalEntry: LexicalEntry) => ((lexicalEntry.lexicalCategory.toLowerCase() === partOfSpeech) && propToExtractExists(lexicalEntry))),
            filteredLexicalEntries,
        );
    }

    return flatMap(filteredLexicalEntries, ({ [propToExtract]: prop }: LexicalEntry) => prop || []);
};

const randomPhrase = () => randomPop(randomPhraseList.map((phrase) => ({ word: phrase, id: phrase.toLowerCase().replace(' ', '_') })));

// OXFORD DICTIONARIES API CONFIG
const dictionaryApi = axios.create({
    baseURL: 'https://od-api.oxforddictionaries.com/api/v2/',
    headers: DICTIONARY_HEADERS,
});

// DIALOGFLOW
const getRootPhrase = async ({ phrase, locale, random }: { phrase: string, locale: string, random: boolean }) => {
    if (random) {
        return randomPhrase();
    }

    const response = await dictionaryApi.get(`/search/${locale}?q=${trimQuotes(phrase)}&limit=5`);

    const rootPhrases = response.data.results;

    return rootPhrases[0];
};

const app = dialogflow({ debug: true });

app.intent('Default Welcome Intent', (conv) => {
    conv.ask(randomPop([
        'Greetings. What word would you like to hear the origin of?',
        'Hello, what word would you like to hear the origin of?',
        'Hi, what word or phrase would you like to hear the origin of?',
    ]));
    conv.ask(new Suggestions(['🎲 Random', randomPop(randomPhraseList), randomPop(randomPhraseList)]));
});

const getEtymology = async (
    { rootPhrase, meaning, partOfSpeech, locale }: { rootPhrase: string, meaning: string | null, partOfSpeech: string | null, locale: string }
) => {
    const response = await dictionaryApi.get(`/entries/${locale}/${rootPhrase}`);

    const entries = handleDictionaryResponse(response, { meaning, partOfSpeech }, 'entries', 'etymologies');

    const etymologyList = flatMap(entries, ({ etymologies }: Entry) => etymologies || []);

    return etymologyList[0];
};

const handleGetEtymology = async (
    conv: DialogflowConversation, { phrase, article, word, meaning, random }: { phrase: string, article: string, word: string, meaning: string, random: boolean }
) => {
    const locale = conv.user.locale.toLowerCase();

    try {
        const { word: displayPhrase, id: originalRootPhrase } = await getRootPhrase({ phrase, locale, random });
        const partOfSpeech = getPartOfSpeech({ article, word });

        let etymology;
        for (const rootPhrase of simplifyWordPossibilities(originalRootPhrase)) {
            try {
                etymology = await getEtymology({ rootPhrase, meaning: (meaning || null), partOfSpeech, locale });
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
        conv.close(`No results found for ${phrase}.`);
    }
};

app.intent(['get_etymology', 'Default Welcome Intent - get_etymology', 'get_random_etymology'], handleGetEtymology);

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
