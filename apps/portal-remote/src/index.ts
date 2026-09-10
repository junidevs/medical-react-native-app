// Remote container entry.
//
// A pure Module Federation remote does not register a root component - the host
// owns AppRegistry and the React tree. This entry only needs to exist so the
// container bundle is produced; the actual surface is the exposed
// "./PortalScreen" module. We touch it here so bundlers keep it in the graph.
import "./PortalScreen";

export {};
