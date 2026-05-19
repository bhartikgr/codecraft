// server/services/azureService.js

const {
  DefaultAzureCredential
} = require('@azure/identity');

const {
  ComputeManagementClient
} = require('@azure/arm-compute');

async function getAzureData() {

  const credential =
    new DefaultAzureCredential();

  const client =
    new ComputeManagementClient(
      credential,
      process.env.AZURE_SUBSCRIPTION_ID
    );

  const vms = [];

  for await (
    const vm of client.virtualMachines.listAll()
  ) {
    vms.push(vm);
  }

  return {
    id: 'azure',
    name: 'Azure',
    kind: 'Public cloud',
    region: 'eastus',
    instances: vms.length,
    errors: 2,
    health: 96,
    status: 'healthy'
  };
}

module.exports = {
  getAzureData
};