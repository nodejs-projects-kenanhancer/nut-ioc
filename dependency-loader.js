const fs = require("fs");
const path = require("path");
const dependencyLoaders = require('./dependency-loaders');
const dependencyFilters = require('./dependency-filters');

let _dependencyContainerName;
let _nameProvider;
let _ignoredDependencies;
let _dependencyFilters;
let _dependencyLoaders;

let configuration;

const METADATA_FILE_NAME = '__metadata__';
const METADATA_FILE = `${METADATA_FILE_NAME}.js`

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

                const loadedDependency = dependencyLoader({ filePath, nameProvider: _nameProvider });

                if (loadedDependency) {
                    const keys = Object.keys(loadedDependency);

                    if (keys.length > 0) {
                        const keyField = keys[0];

                        loadedDependency[keyField][METADATA_FILE_NAME]['DependencyContainerName'] = _dependencyContainerName

                        let { Namespace, IsFolder } = loadedDependency[keyField][METADATA_FILE_NAME];

                        if (IsFolder) {
                            folderGroupingDependency = loadedDependency;
                        } else if (folderGroupingDependency) {
                            const folderGroupingModuleName = Object.keys(folderGroupingDependency)[0];
                            Namespace = folderGroupingDependency[folderGroupingModuleName][METADATA_FILE_NAME]['Namespace'];

                            if (Namespace || folderGroupingModuleName) {
                                loadedDependency[keyField][METADATA_FILE_NAME]['Namespace'] = Namespace || folderGroupingModuleName;
                                folderGroupingDependency[folderGroupingModuleName][METADATA_FILE_NAME]['Items'].push(keyField);
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
                const existingDependency = accumulator[duplicatedDependencyName];
                const duplicatedDependency = currentValue[duplicatedDependencyName];

                throw new Error(`ERROR: While loading dependencies, there are duplicated file names as below. So, rename one of the files.\n${existingDependency[METADATA_FILE_NAME].FilePath}\n${duplicatedDependency[METADATA_FILE_NAME].FilePath}.`);
            }

            return { ...accumulator, ...currentValue };
        }, {});

    return loadedDependencies;
};

const loadConfiguration = () => {

    if (configuration.isLoaded) {
        return;
    } else {
        configuration.isLoaded = true;
    }

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

module.exports = () => {

    _dependencyContainerName = undefined;
    _nameProvider = undefined;
    _ignoredDependencies = undefined;
    _dependencyFilters = undefined;
    _dependencyLoaders = undefined;

    configuration = { dependencyLoaders: [], dependencyFilters: [], isLoaded: false };

    return { configureDependencyLoader, configureDependencyFilter, load };
};
