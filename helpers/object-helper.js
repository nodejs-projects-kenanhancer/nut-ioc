module.exports = {
    spreadObj: (obj) => {
        if (!obj) {
            return {};
        }

        let spread = {};
        for (const key in obj) {

            spread = { ...spread, ...obj[key] };
        }

        return spread;
    },
    pickFieldValue: path => {

        const keys = path.split('.');

        return nestedObj => keys.reduce((obj, key) => (obj && obj[key] !== 'undefined') ? obj[key] : undefined, nestedObj);
    },
    setFieldValue: path => {

        const keys = path.split('.');

        return (nestedObj, fieldValue, spread = false) => keys.reduce((acc, cur, index, array) => acc && (index < array.length - 1 ? acc[cur] || (acc[cur] = {}) : acc[cur] = spread ? { ...acc[cur], ...fieldValue } : fieldValue), nestedObj);
    }
};
