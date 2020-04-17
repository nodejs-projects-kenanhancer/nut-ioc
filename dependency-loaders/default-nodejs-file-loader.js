const path = require("path");
const {capitalize} = require('../helpers/string-helper');
const {buildMetadata} = require('../common/new-metadata-builder');
const {getParamNames} = require('../helpers/function-helper');

module.exports = ({filePath, nameProvider}) => {

    const fileExtension = path.extname(filePath);

    if (fileExtension === '.js') {

        let requiredModule = undefined;
        try {
            requiredModule = require(filePath);
        } catch (error) {
            // console.error(`NUT.IOC ERROR: File can't be resolved ${filePath}`)
            throw new Error(`NUT.IOC ERROR: File can't be resolved ${filePath}`);
        }

        const {Service, ServiceName, Namespace, IsInterceptor, Extends, Interceptor, IsDependency} = requiredModule;

        const file = path.basename(filePath);

        let serviceName;
        let namespace;
        let isFolder = false;

        if (file === '__metadata__.js' || file === 'index.js') {
            isFolder = true;

            const fileName = path.basename(path.dirname(filePath));

            serviceName = capitalize(fileName);

            serviceName = nameProvider && nameProvider(serviceName) || serviceName;

            namespace = file === '__metadata__.js' ? Namespace || capitalize(serviceName) : Namespace;
        } else {
            serviceName = capitalize(path.basename(file, fileExtension));

            serviceName = ServiceName || serviceName;

            serviceName = nameProvider && nameProvider(serviceName) || serviceName;

            namespace = Namespace;
        }

        const ServiceDependencies = getParamNames(requiredModule.Service).filter(item => item !== serviceName);

        requiredModule['__metadata__'] = buildMetadata({
            ServiceName: serviceName,
            Namespace: namespace,
            IsInterceptor: IsInterceptor || false,
            Interceptor,
            Extends,
            IsDependency: IsDependency || ServiceDependencies.includes('dependencyContainer'),
            ServiceDependencies,
            File: file,
            FileExtension: fileExtension,
            FilePath: filePath,
            IsFolder: isFolder,
            IsLoading: false,
            Loaded: typeof (Service || requiredModule) === 'object'
        });

        delete requiredModule['ServiceName'];
        delete requiredModule['Namespace'];
        delete requiredModule['Interceptor'];
        delete requiredModule['IsInterceptor'];
        delete requiredModule['Extends'];

        return {[serviceName]: requiredModule};
    }

    return undefined;
};
