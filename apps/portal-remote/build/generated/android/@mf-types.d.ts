
    export type RemoteKeys = 'REMOTE_ALIAS_IDENTIFIER/PortalScreen';
    type PackageType<T> = T extends 'REMOTE_ALIAS_IDENTIFIER/PortalScreen' ? typeof import('REMOTE_ALIAS_IDENTIFIER/PortalScreen') :any;