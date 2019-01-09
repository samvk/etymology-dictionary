const { dialogflow } = require('actions-on-google');
const functions = require('firebase-functions');
const request = require('request-promise-native');
const cheerio = require('cheerio');

const app = dialogflow({ debug: true });

const getEtymology = (phrase) => {
    const config = {
        uri: `https://www.etymonline.com/word/${phrase}`,
        transform(body) {
            return cheerio.load(body);
        },
    };

    return request(config)
        .then(($) => {
            console.warn($);
            const $definitions = $('[class^="word--"]');
            console.warn($definitions);
        })
        .catch((err) => {
            console.error(err);
            return 'No results found.';
        });
};

app.intent(['Default Fallback Intent', 'say_backwards'], (conv, { phrase }) => {
    const { query } = conv;

    phrase = (phrase || query).replace(/ /g, '%20');

    return getEtymology(phrase);
});

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
