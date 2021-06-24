const fs = require("fs");
const path = require("path");
const dependencyLoaders = require('./dependency-loaders');
const dependencyFilters = require('./dependency-filters');
const { setFieldValue, pickFieldValue, nestedAssign } = require("nut-ioc/helpers/object-helper");
const { METADATA_FILE_NAME, METADATA_FILE } = require('./common/constants');


const dependencyLoaderHandler = ({ _dependencyContainerName = undefined, _nameProvider = undefined, _ignoredDependencies = undefined, _dependencyFilters = undefined, _dependencyLoaders = undefined, configuration = { dependencyLoaders: [], dependencyFilters: [], isLoaded: false } } = {}) => {

    const loadDependenciesInDirectory = ({ dependencyFullPath }) => {
        const stat = fs.statSync(dependencyFullPath);

        if (stat.isDirectory()) {

            const loadedDependencies = loadDependencies({ dependencyFullPath });

            return loadedDependencies;
        }
    };

    const loadDependencies = ({ dependencyFullPath }) => {

        let folderGroupingDependency;

        const loadedDependencies = fs.readdirSync(dependencyFullPath)
            .filter(filePath => _dependencyFilters.every(depFilter => depFilter({
                filePath, ignoredDependencies: _ignoredDependencies
            })))
            .sort((a, b) => a === METADATA_FILE ? -1 : 1)
            .map(file => {
                const filePath = path.join(dependencyFullPath, file);

                const directoryModules = loadDependenciesInDirectory({ dependencyFullPath: filePath });

                if (directoryModules) {
                    return directoryModules;
                }

                for (const dependencyLoader of _dependencyLoaders) {

                    let loadedDependency = dependencyLoader({ filePath, nameProvider: _nameProvider });

                    if (loadedDependency) {
                        const keys = Object.keys(loadedDependency);

                        if (keys.length > 0) {
                            const keyField = keys[0];

                            const metadata = loadedDependency[keyField][METADATA_FILE_NAME];

                            metadata['DependencyContainerName'] = _dependencyContainerName

                            let { Namespace, IsFolder } = metadata;

                            if (Namespace && Namespace !== keyField) {
                                const newDependency = {};
                                setFieldValue(Namespace)(newDependency, loadedDependency[keyField]);
                                loadedDependency = newDependency;
                            }

                            if (IsFolder) {
                                folderGroupingDependency = { Namespace, Dependency: loadedDependency };
                            } else if (folderGroupingDependency) {
                                const folderGroupingModuleName = Object.keys(folderGroupingDependency.Dependency)[0];
                                Namespace = folderGroupingDependency.Namespace;

                                if (Namespace || folderGroupingModuleName) {
                                    loadedDependency[keyField][METADATA_FILE_NAME]['Namespace'] = Namespace || folderGroupingModuleName;
                                    // folderGroupingDependency.Dependency[folderGroupingModuleName][METADATA_FILE_NAME]['Items'].push(keyField);

                                    if (!pickFieldValue(Namespace)(folderGroupingDependency.Dependency)[METADATA_FILE_NAME]['Items']) {
                                        pickFieldValue(Namespace)(folderGroupingDependency.Dependency)[METADATA_FILE_NAME]['Items'] = {};
                                    }

                                    pickFieldValue(Namespace)(folderGroupingDependency.Dependency)[METADATA_FILE_NAME]['Items'][keyField] = loadedDependency[keyField][METADATA_FILE_NAME];
                                    setFieldValue(Namespace)(folderGroupingDependency.Dependency, loadedDependency, true);
                                    delete loadedDependency[keyField][METADATA_FILE_NAME];
                                    return undefined;
                                }
                            }
                        }

                        return loadedDependency;
                    }
                }

                return undefined;
            })
            .reduce((accumulator, currentValue) => {

                if (!currentValue) {
                    return accumulator;
                }

                const duplicatedDependencyName = Object.keys(currentValue).find(item => accumulator.hasOwnProperty(item));

                if (duplicatedDependencyName) {
                    nestedAssign(accumulator, currentValue, [METADATA_FILE_NAME]);

                    return accumulator;
                }

                return { ...accumulator, ...currentValue };
            }, {});

        return loadedDependencies;
    };

    const loadConfiguration = () => {

        if (configuration.isLoaded) {
            return;
        }
        configuration.isLoaded = true;

        configuration.dependencyLoaders.forEach(depLoader => depLoader({ loaders: dependencyLoaders }));

        configuration.dependencyFilters.forEach(depFilter => depFilter({ filters: dependencyFilters }));

        _dependencyFilters = Object.values(dependencyFilters);

        _dependencyLoaders = Object.values(dependencyLoaders);
    };


    const configureDependencyLoader = ({ dependencyLoader }) => configuration.dependencyLoaders.push(dependencyLoader);

    const configureDependencyFilter = ({ dependencyFilter }) => configuration.dependencyFilters.push(dependencyFilter);

    const load = ({ dependencyFullPath, dependencyContainerName, nameProvider, ignoredDependencies }) => {

        _dependencyContainerName = dependencyContainerName;
        _nameProvider = nameProvider;
        _ignoredDependencies = ignoredDependencies;

        loadConfiguration();

        const loadedDependencies = loadDependencies({ dependencyFullPath });

        return loadedDependencies;
    };

    return { configureDependencyLoader, configureDependencyFilter, load };
};

module.exports = () => {

    return dependencyLoaderHandler();
};
