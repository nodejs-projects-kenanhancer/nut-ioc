var ARGUMENT_NAMES = /([^{}(),\s:]+)/g;

module.exports = {
    getParamNames: (fn) => {
        if (!fn) {
            return [];
        }

        const funStr = fn.toString();

        const matches = funStr.slice(funStr.indexOf('(') + 1, funStr.indexOf(')')).match(ARGUMENT_NAMES);

        const paramNames = matches || [];

        return paramNames;
    },
    getAllMethods: (obj) => Object.getOwnPropertyNames(obj).filter(item => typeof obj[item] === 'function'),
    isAsync: (fn) => fn.constructor.name === 'AsyncFunction'
};
