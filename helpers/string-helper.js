module.exports = {
    capitalize: (str) => {
        return str.split('-').map((part, index) => {
            return index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1);
        }).join('');
    },
    join: (...args) => args.reduce((acc, item) => (item ? `${acc}${acc && '.'}${item}` : acc), "")
};
