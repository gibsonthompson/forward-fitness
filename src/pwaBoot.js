// Loaded as its own script so the updater still runs even if the app itself
// fails to start. That way a broken deploy can always be replaced by the fix.
import { installPwaUpdater } from './pwaUpdate';

installPwaUpdater();
