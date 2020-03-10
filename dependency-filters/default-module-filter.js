module.exports = ({filePath, ignoredDependencies}) => {

    const result = !ignoredDependencies.some(ignore => {
        if (ignore.startsWith('*')) {
            return filePath.endsWith(ignore.substr(1, ignore.length - 1))
        } else if (ignore.endsWith('*')) {
            return filePath.startsWith(ignore.substr(0, ignore.indexOf('*')));
        } else {
            return ignore === filePath;
        }
    });

    return result;
};
