const objectHelper = {
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
    },
    nestedAssign: (target, source, ignoredFields = []) => {
        Object.keys(source).filter(fieldName => {
            return ignoredFields.every(ignore => fieldName !== ignore);
        }).forEach(sourcekey => {
            if (Object.keys(source).find(targetkey => targetkey === sourcekey) !== undefined && sourcekey in target && typeof source[sourcekey] === "object") {
                target[sourcekey] = objectHelper.nestedAssign(target[sourcekey], source[sourcekey], ignoredFields);
            } else {
                target[sourcekey] = source[sourcekey];
            }
        });
        return target;
    }
};

module.exports = objectHelper;
