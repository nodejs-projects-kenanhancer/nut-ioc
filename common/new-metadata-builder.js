const buildMetadata =
    ({
        ServiceName,
        Namespace = undefined,
        Service = undefined,
        ServiceInstance = undefined,
        Interceptor = undefined,
        Extends = undefined,
        DependencyContainerName = undefined,
        File = undefined,
        FileExtension = undefined,
        FilePath = undefined,
        ServiceDependencies = [],
        Items = undefined,
        IsInterceptor = false,
        IsFolder = false,
        IsLoading = false,
        Loaded = false,
        IsHook = false
    }) => ({
        ServiceName,
        Namespace,
        Service,
        ServiceInstance,
        IsInterceptor,
        Interceptor,
        Extends,
        DependencyContainerName,
        ServiceDependencies,
        File,
        FileExtension,
        FilePath,
        IsFolder,
        Items,
        IsLoading,
        Loaded,
        IsHook
    });

module.exports = { buildMetadata };