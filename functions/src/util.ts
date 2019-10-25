export const randomPop = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

export const escapeXml = (str: string) => (
    str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
);

export const trimQuotes = (str: string) => str.replace(/(^["'])|(["']$)/g, '');

export const findFirstNonEmpty = (...arrs: any[][]) => arrs.find((arr) => (arr.length > 0)) || [];

// common phrases
export const sayOkay = () => randomPop(['Ok', 'Sure', 'Alright']);

// filter *unless* no results are returned
// export const softFilter = (list: any[], filterCallback: Parameters<typeof Array.prototype.filter>[0]) => {
//     const filteredList = list.filter(filterCallback);
//
//     return filteredList.length ? filteredList : list;
// };
