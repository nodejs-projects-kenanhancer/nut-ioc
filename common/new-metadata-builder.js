const buildMetadata =
    ({
         ServiceName,
         Namespace = undefined,
         Interceptor = undefined,
         Extends = undefined,
         DependencyContainerName = undefined,
         File = undefined,
         FileExtension = undefined,
         FilePath = undefined,
         ServiceDependencies = [],
         Items = [],
         IsInterceptor = false,
         IsFolder = false,
         IsLoading = false,
         Loaded = false,
         IsHook = false
     }) => ({
        ServiceName,
        Namespace,
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

module.exports = {buildMetadata};
