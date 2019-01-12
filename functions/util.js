const randomPop = (arr) => arr[Math.floor(Math.random() * arr.length)];
module.exports.randomPop = randomPop;

// common phrases
module.exports.sayOkay = () => randomPop(['Ok', 'Sure', 'Alright']);

module.exports.trimQuotes = (str) => str.replace(/(^["'])|(["']$)/g, '');

// filter *unless* no results are returned
module.exports.softFilter = (list, filterCallback) => {
    const filteredList = list.filter(filterCallback);

    return filteredList.length ? filteredList : list;
};
