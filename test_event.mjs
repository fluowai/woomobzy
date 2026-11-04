import { eventBus, EVENTS } from './server/lib/eventBus.js';
import './server/services/omnichannel/interactionLogger.js';
import './server/services/crm/leadScoringEngine.js';
import './server/services/automation/automationEngine.js';

console.log('--- TESTING EVENT PROPAGATION ---');

// We simulate an email being opened
eventBus.publish(EVENTS.EMAIL.OPENED, {
  tenant_id: '1234-5678-tenant',
  lead_id: 'lead-999',
  message_id: 'msg-abc-123'
});

setTimeout(() => {
  console.log('--- TEST COMPLETE ---');
  process.exit(0);
}, 2000);
