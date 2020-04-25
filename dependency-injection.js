const path = require('path');
const { getAllMethods, getParamNames } = require('./helpers/function-helper');
const { spreadObj, pickFieldValue } = require('./helpers/object-helper');
const { capitalize } = require('./helpers/string-helper');
const { buildMetadata } = require('./common/new-metadata-builder');
const { buildPipeline } = require('nut-pipe');
let _dependencyLoader = require('./dependency-loader');

let environment = {};

let dependencyContainerConfiguration = {};

let servicesMetadata = {};

let services = {};

let rawServices = {};


const wrapMethod = (obj, moduleName, interceptors) => {
    let allMethods = [];

    const objType = typeof obj;
    if (objType === 'object') {
        allMethods = getAllMethods(obj);
    } else if (objType === 'function') {
        allMethods.push(obj);
    }

    let newObject = { ...obj };

    allMethods.forEach(method => {

        const isFunction = typeof method === 'function';

        const concreteMethod = isFunction ? method : obj[method];

        const pipelineInvoker = buildPipeline([
            ...interceptors,
            (environment, next) => {

                const result = concreteMethod.apply(this, environment.args);

                return result;
            }
        ]);

        const wrapFunction = function () {

            const result = pipelineInvoker({ method: concreteMethod, moduleName, args: arguments });

            return result;
        };

        if (isFunction) {
            newObject = wrapFunction
        } else {
            newObject[method] = wrapFunction;
        }
    });

    return newObject;
};

const loadServiceModules = async ({ serviceModuleNames }) => {

    const result = {};

    for (const paramName of serviceModuleNames) {

        const service = services[paramName];

        if (service) {

            const serviceMetadata = servicesMetadata[paramName];

            if (serviceMetadata) {
                const { IsLoading, Loaded } = serviceMetadata;

                if (!IsLoading && !Loaded) {

                    await loadModule({ serviceName: paramName });
                }

                result[paramName] = services[paramName];
            }
        }
    }

    return Object.keys(result).length === 0 ? undefined : result;
};

const loadDependencyModulesOfFunction = async ({ func }) => {

    const serviceModuleNames = getParamNames(func);

    return await loadServiceModules({ serviceModuleNames });
};

const loadDependencyModulesOfService = async ({ serviceName }) => {

    const serviceMetadata = servicesMetadata[serviceName];

    if (serviceMetadata && serviceMetadata.ServiceDependencies && serviceMetadata.ServiceDependencies.length > 0) {
        await loadServiceModules({ serviceModuleNames: serviceMetadata.ServiceDependencies });
    }
};

const loadModule = async ({ serviceName }) => {
    const { Namespace, IsFolder, Items, IsLoading, Loaded, IsInterceptor, DependencyContainerName, Extends, Interceptor, dep } = servicesMetadata[serviceName] || {};
    let { dependencies, interceptor } = dependencyContainerConfiguration[DependencyContainerName] || {};
    interceptor = Interceptor || interceptor;
    const service = services[serviceName] || (dependencies && dependencies[serviceName]);

    if (!service) {
        return;
    }

    if (typeof service === 'object') {
        // if (servicesMetadata[serviceName]) {
        //     servicesMetadata[serviceName].IsLoading = false;
        //     servicesMetadata[serviceName].Loaded = true;
        // }
        //
        // delete services[serviceName].Service;
        // services[serviceName] = {...services[serviceName], ...service};

        return;
    }

    servicesMetadata[serviceName].IsLoading = true;
    const extensionServices = await loadDependencyModulesOfFunction({ func: Extends });
    await loadDependencyModulesOfService({ serviceName });

    let concreteService = await service({
        ...services,
        ...dependencies,
        dependencyProvider: async (svcName) => {

            let svcNameFields = svcName.split('.');

            if (svcNameFields.length === 3) {
                await loadServiceModules({ serviceModuleNames: svcNameFields.slice(0, svcNameFields.length - 1) });
            } else if (svcNameFields.length === 2) {
                await loadServiceModules({ serviceModuleNames: svcNameFields });
            } else {
                await loadModule({ serviceName: svcName });
            }

            return pickFieldValue(svcName)(services);
        },
        dependencyContainer: {
            useDependency: async ({ ServiceName, Namespace, Service, Interceptor }) => {
                useDependency({ ServiceName, Namespace, Service, Interceptor });

                await loadModule({ serviceName: ServiceName });
            }
        }
    });

    if (extensionServices) {
        const objType = typeof concreteService;

        if (objType === 'object') {
            //append extension dependency functions in concreteService.
            Object.assign(concreteService, spreadObj(extensionServices));
            //Update module clouser. so we can use this keyword in module functions.
            Object.assign(rawServices[serviceName], concreteService);
        } else if (objType === 'function') {
            concreteService = concreteService.apply(spreadObj(extensionServices));
        }
    }

    servicesMetadata[serviceName].IsLoading = false;
    servicesMetadata[serviceName].Loaded = true;

    services[serviceName] = concreteService;

    if (Namespace && concreteService) {
        services[Namespace] = { ...services[Namespace], [serviceName]: concreteService };
        delete services[serviceName];
    } else if (IsFolder && Items) {
        await loadServiceModules({ serviceModuleNames: Items });

        for (const item of Items) {
            const itemService = services[item];
            if (itemService) {
                services[serviceName] = { ...services[serviceName], [item]: services[item] };
                delete services[item];
            }
        }
    }

    if (concreteService && interceptor && !IsInterceptor) {
        await loadDependencyModulesOfFunction({ func: interceptor });
        const interceptorsArray = (interceptor && interceptor({
            serviceName, namespace: Namespace, ...services,
            dependencyProvider: async (svcNames) => {

                for (const svcName of svcNames) {
                    await loadModule({ serviceName: svcName });
                }

                return svcNames.map(svc => ({ [svc]: services[svc] })).reduce((acc, current) => ({ ...acc, ...current }), {});
            }
        })) || [];

        if (interceptorsArray.length > 0) {
            concreteService = wrapMethod(concreteService, serviceName, interceptorsArray);

            if (Namespace) {
                services[Namespace][serviceName] = concreteService;
            } else {
                services[serviceName] = concreteService;
            }
        }
    }
};

const loadDependencies = ({ dependencyContainerConfiguration }) => {
    const requiredModules = {};

    for (const dependencyContainerConfigName in dependencyContainerConfiguration) {

        requiredModules[dependencyContainerConfigName] = _dependencyLoader.load(dependencyContainerConfiguration[dependencyContainerConfigName]);
    }

    return requiredModules;
};


const get = (name) => environment[name];

const set = (name, value) => environment[name] = value;

const getServices = () => spreadObj(get('services'));

const useDependencyLoader = ({ name, loader }) => {

    _dependencyLoader.configureDependencyLoader({
        dependencyLoader: ({ loaders }) => {

            if (name in loaders) {
                throw new Error(`ERROR: Duplicated dependency loader name. So, rename ${name} dependency as a different name.`);
            }

            loaders[name] = loader;
        }
    });
};

const useDependencyFilter = ({ name, filter }) => {

    _dependencyLoader.configureDependencyFilter({
        dependencyFilter: ({ filters }) => {

            if (name in filters) {
                throw new Error(`ERROR: Duplicated dependency filter name. So, rename ${name} dependency as a different name.`);
            }

            filters[name] = filter;
        }
    });
};

const useConfiguration = ({ dependencyLoader, dependencyFilter }) => {

    _dependencyLoader.configureDependencyLoader({ dependencyLoader });

    _dependencyLoader.configureDependencyFilter({ dependencyFilter });
};

const useDependency = ({ ServiceName, Namespace, Service, Interceptor }) => {

    services[ServiceName] = Service;

    const ServiceDependencies = getParamNames(Service).filter(item => item !== ServiceName);

    servicesMetadata[ServiceName] = buildMetadata({
        ServiceName,
        Namespace,
        Interceptor,
        ServiceDependencies
    });
};

const use = ({ dependencyPath, nameProvider, ignoredDependencies = [], dependencies = {}, interceptor }) => {

    const dependencyFullPath = path.resolve(dependencyPath);
    const dirName = capitalize(path.basename(dependencyFullPath));

    dependencyContainerConfiguration[dirName] = {
        dependencyContainerName: dirName,
        dependencyPath,
        dependencyFullPath,
        nameProvider,
        ignoredDependencies,
        dependencies,
        interceptor
    };
};

const build = async () => {
    const loadedDependencies = loadDependencies({ dependencyContainerConfiguration });

    rawServices = spreadObj(loadedDependencies);

    for (const dependency in rawServices) {

        const tempService = rawServices[dependency];

        const { Service = tempService, __metadata__ } = tempService;

        delete tempService['__metadata__'];
        delete tempService['Service'];

        services[dependency] = Service;

        servicesMetadata[dependency] = __metadata__;
    }

    for (const { ServiceName, Loaded } of Object.values(servicesMetadata).sort((a, b) => b.IsDependency - a.IsDependency)) {

        if (!Loaded) {
            await loadModule({ serviceName: ServiceName });
        }
    }

    return services;
};

module.exports.createNewIocContainer = () => {
    environment = {};
    dependencyContainerConfiguration = {};
    servicesMetadata = {};
    services = {};

    _dependencyLoader = _dependencyLoader();

    return {
        get,
        set,
        getServices,
        useDependencyLoader,
        useDependencyFilter,
        useConfiguration,
        useDependency,
        use,
        build
    };
};
