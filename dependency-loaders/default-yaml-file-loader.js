const path = require("path");
const YAML = require('yamljs');
const {capitalize} = require('../helpers/string-helper');
const {buildMetadata} = require('../common/new-metadata-builder');

module.exports = ({filePath, nameProvider}) => {

    const fileExtension = path.extname(filePath);

    if (fileExtension === '.yaml' || fileExtension === '.yml') {

        const requiredModule = YAML.load(filePath);

        const file = path.basename(filePath);

        const fileName = path.basename(file, fileExtension);

        let serviceName = capitalize(fileName);

        serviceName = nameProvider && nameProvider(serviceName) || serviceName;

        requiredModule['__metadata__'] = buildMetadata({
            ServiceName: serviceName,
            File: file,
            FileExtension: fileExtension,
            FilePath: filePath,
            IsLoading: false,
            Loaded: true
        });

        return {[serviceName]: requiredModule};
    }

    return undefined;
};
