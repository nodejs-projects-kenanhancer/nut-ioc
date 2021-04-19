const path = require('path');
const { getAllMethods, getParamNames } = require('./helpers/function-helper');
const { spreadObj, pickFieldValue, setFieldValue } = require('./helpers/object-helper');
const { capitalize } = require('./helpers/string-helper');
const { buildMetadata } = require('./common/new-metadata-builder');
const { buildPipeline } = require('nut-pipe');
let _dependencyLoader = require('./dependency-loader');
const { METADATA_FILE_NAME } = require('./common/constants');

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

const loadServiceModules = async ({ serviceModuleNames, enableInterceptor = true }) => {

    const result = {};

    for (const paramName of serviceModuleNames) {

        const serviceMetadata = servicesMetadata[paramName];

        if (serviceMetadata) {
            await loadSubServiceModules({ serviceMetadata, enableInterceptor });

            result[paramName] = services[serviceMetadata.ServiceName];
        }
    }

    return Object.keys(result).length === 0 ? undefined : result;
};

const loadSubServiceModules = async ({ serviceMetadata, enableInterceptor = true }) => {
    if (serviceMetadata) {
        const { IsLoading, Loaded, ServiceName, ...restFields } = serviceMetadata;

        if (IsLoading === undefined && IsLoading === undefined) {
            for (const item of Object.keys(restFields)) {
                await loadSubServiceModules({ serviceMetadata: serviceMetadata[item], enableInterceptor });
            }
        } else if (IsLoading === false && Loaded === false) {
            await loadModule({ serviceName: serviceMetadata.ServiceName, serviceMetadata, enableInterceptor });

            if (serviceMetadata.Items) {
                for (const item of Object.keys(serviceMetadata.Items)) {
                    await loadSubServiceModules({ serviceMetadata: serviceMetadata.Items[item], enableInterceptor })
                }
            }
        }
    } else {
        for (const item of Object.keys(service)) {
            await loadSubServiceModules({ serviceMetadata: service[item], enableInterceptor });
        }

    }
};

const loadDependencyModulesOfFunction = async ({ func, enableInterceptor = true }) => {

    if (!func) {
        return Promise.resolve(undefined);
    }

    const serviceModuleNames = getParamNames(func);

    return await loadServiceModules({ serviceModuleNames, enableInterceptor });
};

const loadDependencyModulesOfService = async ({ serviceMetadata, enableInterceptor = true }) => {

    if (serviceMetadata && serviceMetadata.ServiceDependencies && serviceMetadata.ServiceDependencies.length > 0) {
        await loadServiceModules({ serviceModuleNames: serviceMetadata.ServiceDependencies, enableInterceptor });
    }
};

const loadModule = async ({ serviceName, serviceMetadata, enableInterceptor = true }) => {
    serviceMetadata = serviceMetadata || (serviceName && servicesMetadata[serviceName]) || {};
    const { Namespace, Service, IsFolder, Items, IsLoading, Loaded, IsInterceptor, DependencyContainerName, Extends, Interceptor, dep } = serviceMetadata;
    let { dependencies, interceptor } = dependencyContainerConfiguration[DependencyContainerName] || {};
    const service = Service || (dependencies && dependencies[serviceName]);

    if (!service) {
        return;
    }

    serviceMetadata.IsLoading = true;
    serviceMetadata.Loaded = false;
    let extensionServices = undefined;

    if (Extends) {
        extensionServices = await loadDependencyModulesOfFunction({ func: Extends });
    }

    await loadDependencyModulesOfService({ serviceMetadata, enableInterceptor });

    let concreteService = undefined;
    try {
        concreteService = await service({
            ...services,
            ...dependencies,
            dependencyProvider: async (svcName) => {

                let svcNameFields = svcName.split('.');

                if (svcNameFields.length === 3) {
                    await loadServiceModules({ serviceModuleNames: svcNameFields.slice(0, svcNameFields.length - 1, enableInterceptor) });
                } else if (svcNameFields.length === 2) {
                    await loadServiceModules({ serviceModuleNames: svcNameFields, enableInterceptor });
                } else {
                    await loadModule({ serviceName: svcName, enableInterceptor });
                }

                return pickFieldValue(svcName)(services);
            },
            dependencyContainer: {
                useDependency: async ({ ServiceName, Namespace, Service, Interceptor }) => {
                    useDependency({ ServiceName, Namespace, Service, Interceptor });

                    await loadModule({ serviceName: ServiceName, enableInterceptor });
                }
            }
        });

        serviceMetadata.ServiceInstance = concreteService;
    } catch (error) {
        throw new Error(`NUT-IOC ERROR: ${serviceName} dependency cannot be constructed.  ` + error.toString());
    }

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

    if (Namespace && concreteService) {
        setFieldValue(Namespace)(services, { [serviceName]: concreteService }, true);
        // serviceMetadata.ServiceInstance = pickFieldValue(`${Namespace}.${serviceName}`)(services);
    }
    else {
        services[serviceName] = concreteService && { ...services[serviceName], ...concreteService } || services[serviceName];
        serviceMetadata.ServiceInstance = services[serviceName];
    }

    serviceMetadata.IsLoading = false;
    serviceMetadata.Loaded = true;


    if (enableInterceptor && concreteService && (interceptor || Interceptor) && !IsInterceptor) {
        interceptor = interceptor || Interceptor;

        await loadDependencyModulesOfFunction({ func: interceptor });

        const interceptorsArray = (interceptor({
            serviceName, namespace: Namespace, ...services,
            dependencyProvider: async (svcNames) => {

                for (const svcName of svcNames) {
                    await loadModule({ serviceName: svcName, enableInterceptor });
                }

                return svcNames.map(svc => ({ [svc]: services[svc] })).reduce((acc, current) => ({ ...acc, ...current }), {});
            }
        })) || [];

        if (interceptorsArray.length > 0) {
            concreteService = wrapMethod(concreteService, serviceName, interceptorsArray);

            if (Namespace) {
                setFieldValue(Namespace)(services, { [serviceName]: concreteService }, true);
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
                throw new Error(`NUT-IOC ERROR: Duplicated dependency loader name. So, rename ${name} dependency as a different name.`);
            }

            loaders[name] = loader;
        }
    });
};

const useDependencyFilter = ({ name, filter }) => {

    _dependencyLoader.configureDependencyFilter({
        dependencyFilter: ({ filters }) => {

            if (name in filters) {
                throw new Error(`NUT-IOC ERROR: Duplicated dependency filter name. So, rename ${name} dependency as a different name.`);
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

        const rawService = rawServices[dependency];

        moveMetadata({ serviceName: dependency, rawService });
    }

    for (const { interceptor } of Object.values(dependencyContainerConfiguration)) {
        await loadDependencyModulesOfFunction({ func: interceptor, enableInterceptor: false });
    }

    for (const { ServiceName, Loaded } of Object.values(servicesMetadata).sort((a, b) => b.IsHook - a.IsHook)) {

        if (!Loaded) {
            await loadModule({ serviceName: ServiceName, enableInterceptor: true });
        }
    }

    return services;
};

const moveMetadata = ({ serviceName, rawService }) => {
    const { __metadata__, ...restFields } = rawService;

    if (__metadata__) {
        delete rawService[METADATA_FILE_NAME];

        const fieldName = (__metadata__ && __metadata__.Namespace) || serviceName;

        setFieldValue(fieldName)(services, restFields);

        setFieldValue(fieldName)(servicesMetadata, __metadata__);
    } else {
        Object.keys(restFields).forEach(item => moveMetadata({ serviceName: item, rawService: restFields[item] }));
    }
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
