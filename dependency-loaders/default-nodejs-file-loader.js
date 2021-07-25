const path = require("path");
const { capitalize } = require('../helpers/string-helper');
const { buildMetadata } = require('../common/new-metadata-builder');
const { getParamNames } = require('../helpers/function-helper');
const { METADATA_FILE_NAME, METADATA_FILE } = require('../common/constants');

module.exports = ({ filePath, nameProvider }) => {
    const fileExtension = path.extname(filePath);

    if (fileExtension === '.js') {

        let requiredModule = undefined;
        try {
            const newModule = require(filePath);

            requiredModule = newModule

            delete require.cache[filePath];
        } catch (error) {
            // console.error(`NUT.IOC ERROR: File can't be resolved ${filePath}`)
            throw new Error(`NUT.IOC ERROR: File can't be resolved ${filePath} Error: ${error}`);
        }

        const { Service, ServiceName, Namespace, IsInterceptor, Extends, Interceptor, IsHook, __esModule, ...rest } = requiredModule;

        if (__esModule && !rest.default) {
            return undefined;
        }

        const file = path.basename(filePath);

        let serviceName;
        let namespace;
        let isFolder = false;

        if (file === METADATA_FILE || file === 'index.js') {
            isFolder = true;

            const fileName = path.basename(path.dirname(filePath));

            serviceName = capitalize(fileName);

            serviceName = nameProvider && nameProvider(serviceName) || serviceName;

            namespace = file === METADATA_FILE ? Namespace || capitalize(serviceName) : Namespace;
        } else {
            serviceName = capitalize(path.basename(file, fileExtension));

            serviceName = ServiceName || serviceName;

            serviceName = nameProvider && nameProvider(serviceName) || serviceName;

            namespace = Namespace;
        }

        const constructorFunc = Service || (__esModule && rest.default);

        const ServiceDependencies = getParamNames(constructorFunc).filter(item => item !== serviceName);

        const loaded = !__esModule && typeof (Service || requiredModule) === 'object';

        requiredModule[METADATA_FILE_NAME] = buildMetadata({
            ServiceName: serviceName,
            Namespace: namespace,
            Service: constructorFunc,
            ServiceInstance: loaded && requiredModule.Service,
            IsInterceptor: IsInterceptor || false,
            Interceptor,
            Extends,
            IsHook: IsHook || ServiceDependencies.includes('dependencyContainer'),
            ServiceDependencies,
            File: file,
            FileExtension: fileExtension,
            FilePath: filePath,
            IsFolder: isFolder,
            Loaded: loaded
        });

        delete requiredModule['default'];
        delete requiredModule['__esModule'];
        delete requiredModule['Service'];
        delete requiredModule['ServiceName'];
        delete requiredModule['Namespace'];
        delete requiredModule['Interceptor'];
        delete requiredModule['IsInterceptor'];
        delete requiredModule['Extends'];
        delete requiredModule['IsHook'];

        return { [serviceName]: requiredModule };
    }

    return undefined;
};
