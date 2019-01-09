const { dialogflow } = require('actions-on-google');
const functions = require('firebase-functions');
const axios = require('axios');
const { DICTIONARY_API_ID, DICTIONARY_API_KEY } = require('./config');

const app = dialogflow({ debug: true });

const getEtymology = ({ phrase, locale }) => {
    phrase = encodeURIComponent(phrase.toLowerCase().replace(/ /g, '_'));
    const [language, region] = locale.split('-');

    const config = {
        headers: {
            app_id: DICTIONARY_API_ID,
            app_key: DICTIONARY_API_KEY,
        },
    };
    console.log(config);

    return axios.get(`https://od-api.oxforddictionaries.com/api/v1/entries/${language}/${phrase}/regions=${region}`, config);
};

// app.intent('Default Fallback Intent', (conv) => {
// });

app.intent('get_etymology', (conv, { phrase }) => {
    const { user: { locale } } = conv;

    return getEtymology({ phrase, locale })
        .then(({ data }) => {
            conv.close(data.results[0].lexicalEntries[0].entries[0].etymologies.join());
        }).catch((error) => {
            console.error(error);
            conv.close(`No entries found for ${phrase}.`);
        });
});

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
