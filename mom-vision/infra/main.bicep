targetScope = 'subscription'

@description('Resource group name')
param resourceGroupName string = 'Fameshire-STREAM'

@description('Location for all resources')
param location string = 'westus'

@description('Environment name')
param environmentName string = 'prod'

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: {
    environment: environmentName
    project: 'mom-vision'
  }
}

// Deploy all modules
module aiServices './modules/ai-services.bicep' = {
  name: 'aiServices'
  scope: rg
  params: {
    location: location
  }
}

module cosmosDb './modules/cosmos-db.bicep' = {
  name: 'cosmosDb'
  scope: rg
  params: {
    location: location
  }
}

module storage './modules/storage.bicep' = {
  name: 'storage'
  scope: rg
  params: {
    location: location
  }
}

module containerRegistry './modules/container-registry.bicep' = {
  name: 'containerRegistry'
  scope: rg
  params: {
    location: location
  }
}

module containerApps './modules/container-apps.bicep' = {
  name: 'containerApps'
  scope: rg
  params: {
    location: location
    acrName: containerRegistry.outputs.acrName
    acrPassword: containerRegistry.outputs.password
    aiServicesEndpoint: aiServices.outputs.endpoint
    aiServicesKey: aiServices.outputs.key
    cosmosEndpoint: cosmosDb.outputs.endpoint
    cosmosKey: cosmosDb.outputs.key
    blobConnectionString: storage.outputs.connectionString
  }
}

// Outputs
output resourceGroupName string = rg.name
output aiServicesEndpoint string = aiServices.outputs.endpoint
output cosmosEndpoint string = cosmosDb.outputs.endpoint
output containerRegistryName string = containerRegistry.outputs.acrName
