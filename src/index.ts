import { 
    type Plugin, 
} from '@elizaos/core';
import { scoutAction } from './actions/scout'; // Make sure scoutAction is exported in scout.ts

// 1. Define your local plugin
// We only need the custom logic here; the CLI handles the rest.
const ideaminerPlugin: Plugin = {
    name: 'plugin-ideaminer',
    description: 'Local IdeaMiner plugin for Nosana Challenge',
    actions: [scoutAction],
    providers: [],
    evaluators: [],
};

// 2. Export as default so the ElizaOS Loader can find it
export default ideaminerPlugin;