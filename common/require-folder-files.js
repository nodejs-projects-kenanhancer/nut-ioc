const path = require('path');

module.exports = ({folderPath}) => require("fs")
    .readdirSync(folderPath)
    .filter(filePath => filePath != 'index.js')
    .map((filePath) => ({[path.basename(filePath, path.extname(filePath))]: require(path.join(folderPath, filePath))}))
    .reduce((acc, current) => ({...acc, ...current}), {});
