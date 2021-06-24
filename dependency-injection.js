const path = require('path');
const { getAllMethods, getParamNames } = require('./helpers/function-helper');
const { spreadObj, pickFieldValue, setFieldValue } = require('./helpers/object-helper');
const { capitalize, join } = require('./helpers/string-helper');
const { buildMetadata } = require('./common/new-metadata-builder');
const { buildPipeline } = require('nut-pipe');
let _dependencyLoader = require('./dependency-loader');
const { METADATA_FILE_NAME } = require('./common/constants');

const iocContainerServices = [];

const createNewIocContainer = ({ environment = {}, dependencyContainerConfiguration = {}, servicesMetadata = {}, services = {}, rawServices = {}, plugins = [], dependencyLoaders = _dependencyLoader() } = {}) => {

    iocContainerServices.push(services);

    const wrapMethodWithInterceptors = (obj, moduleName, namespace, interceptors) => {
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

            const methodName = isFunction ? method.name : method;

            const pipelineInvoker = buildPipeline([
                ...interceptors,
                (context, services) => {

                    const result = concreteMethod.apply(this, [...context.args, services]);

                    return result;
                }
            ], {});

            const wrapFunction = function () {

                const fullQualifiedName = join(namespace, moduleName, methodName);

                const result = pipelineInvoker({ method: concreteMethod, moduleName, namespace, fullQualifiedName, args: arguments });

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

            if (IsLoading === undefined) {
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
            } else if (serviceMetadata.Items) {
                for (const item of Object.keys(serviceMetadata.Items)) {
                    await loadSubServiceModules({ serviceMetadata: serviceMetadata.Items[item], enableInterceptor })
                }
            }
        }
        // else {
        //     for (const item of Object.keys(service)) {
        //         await loadSubServiceModules({ serviceMetadata: service[item], enableInterceptor });
        //     }

        // }
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

        if (serviceMetadata.Loaded) {
            return;
        }

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

        await loadSubServiceModules({ serviceMetadata, enableInterceptor });

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
            throw new Error(`NUT-IOC ERROR: ${Namespace}.${serviceName} dependency cannot be constructed. ${error.message} ${error.stack}`);
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
            delete services[serviceName];
        }
        else {
            services[serviceName] = (typeof concreteService === 'function' && concreteService) || (concreteService && { ...services[serviceName], ...concreteService }) || services[serviceName];
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
                concreteService = wrapMethodWithInterceptors(concreteService, serviceName, Namespace, interceptorsArray);

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

            requiredModules[dependencyContainerConfigName] = dependencyLoaders.load(dependencyContainerConfiguration[dependencyContainerConfigName]);
        }

        return requiredModules;
    };


    const get = (name) => environment[name];

    const set = (name, value) => environment[name] = value;

    const getServices = () => spreadObj(get('services'));

    const getDependency = (ServiceName) => services[ServiceName];

    const getDependencies = () => services;

    const addDependency = (dependency, ServiceName = '', spread = false) => {
        if (spread) {
            if (ServiceName) {
                services[ServiceName] = spreadObj(dependency);
            } else {
                Object.assign(services, spreadObj(dependency));
            }
        } else if (ServiceName) {
            services[ServiceName] = dependency;
        } else {
            Object.assign(services, dependency);
        }
    }

    const useNutIocContainer = (nutIocContainer) => {

        addDependency(nutIocContainer.getDependencies())
    }

    const useDependencyLoader = ({ name, loader }) => {

        dependencyLoaders.configureDependencyLoader({
            dependencyLoader: ({ loaders }) => {

                if (name in loaders) {
                    throw new Error(`NUT-IOC ERROR: Duplicated dependency loader name. So, rename ${name} dependency as a different name.`);
                }

                loaders[name] = loader;
            }
        });
    };

    const useDependencyFilter = ({ name, filter }) => {

        dependencyLoaders.configureDependencyFilter({
            dependencyFilter: ({ filters }) => {

                if (name in filters) {
                    throw new Error(`NUT-IOC ERROR: Duplicated dependency filter name. So, rename ${name} dependency as a different name.`);
                }

                filters[name] = filter;
            }
        });
    };

    const useConfiguration = ({ dependencyLoader, dependencyFilter }) => {

        dependencyLoaders.configureDependencyLoader({ dependencyLoader });

        dependencyLoaders.configureDependencyFilter({ dependencyFilter });
    };

    const useDependency = ({ ServiceName, Namespace, Service, Interceptor }) => {

        services[ServiceName] = Service;

        const ServiceDependencies = getParamNames(Service).filter(item => item !== ServiceName);

        servicesMetadata[ServiceName] = buildMetadata({
            ServiceName,
            Namespace,
            Service: typeof Service === 'function' && Service || undefined,
            Interceptor,
            ServiceDependencies
        });
    };

    const usePlugin = (pluginFn) => {
        plugins.push(pluginFn(iocContainer));
    };

    const use = ({ dependencyPath, nameProvider, ignoredDependencies = [], dependencies = {}, interceptor }) => {

        const dependencyFullPath = path.resolve(dependencyPath);
        // const dirName = capitalize(path.basename(dependencyFullPath));

        dependencyContainerConfiguration[dependencyFullPath] = {
            dependencyContainerName: dependencyFullPath,
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

        for (const { ServiceName, Loaded, Service } of Object.values(servicesMetadata).filter((dependency) => dependency.IsHook)) {

            await loadDependencyModulesOfFunction({ func: Service, enableInterceptor: false });

            if (!Loaded) {
                await loadModule({ serviceName: ServiceName, enableInterceptor: false });
            }
        }

        for (const { interceptor } of Object.values(dependencyContainerConfiguration)) {
            await loadDependencyModulesOfFunction({ func: interceptor, enableInterceptor: false });
        }

        for (const { ServiceName, Loaded } of Object.values(servicesMetadata).sort((a, b) => b.IsHook - a.IsHook)) {

            if (!Loaded) {
                await loadModule({ serviceName: ServiceName, enableInterceptor: true });
            }
        }

        if (plugins) {
            for (const plugin of plugins) {
                await plugin();
            }
        }

        return services;
    };

    const moveMetadata = ({ serviceName, rawService }) => {
        const { __metadata__, ...restFields } = rawService;

        if (__metadata__) {
            delete rawService[METADATA_FILE_NAME];

            const { Namespace, Loaded, ServiceInstance } = __metadata__;

            const fieldName = Namespace || serviceName;

            setFieldValue(fieldName)(servicesMetadata, __metadata__);

            if (Loaded) {
                if (Namespace) {
                    setFieldValue(fieldName)(services, { [serviceName]: ServiceInstance }, true);
                    delete services[serviceName];
                }
                else {
                    services[serviceName] = ServiceInstance;
                }
            } else {
                setFieldValue(fieldName)(services, restFields);
            }
        } else {
            Object.keys(restFields).forEach(item => moveMetadata({ serviceName: item, rawService: restFields[item] }));
        }
    };

    const iocContainer = {
        get,
        set,
        getServices,
        getDependency,
        getDependencies,
        addDependency,
        useNutIocContainer,
        useDependencyLoader,
        useDependencyFilter,
        useConfiguration,
        useDependency,
        usePlugin,
        use,
        build
    };

    return iocContainer;
};

module.exports.createNewIocContainer = createNewIocContainer;
