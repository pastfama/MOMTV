// MOMTV - Azure Infrastructure (Bicep)
// Deploys: Container Apps (backend), Static Web Apps (studio), Cache for Redis, AI Services

targetScope = 'subscription'

// --- Parameters ---
param environmentName string = 'momtv'
param location string = az.resourceGroup().location
param watchedChannels string = 'twitch:shroud'

// --- Resource Group ---
resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: '${environmentName}-rg'
  location: location
}

// --- AI Services (Foundry) ---
module aiServices 'modules/ai-services.bicep' = {
  name: 'ai-services'
  scope: rg
  params: {
    location: location
    environmentName: environmentName
  }
}

// --- Cache for Redis ---
module redis 'modules/redis.bicep' = {
  name: 'redis'
  scope: rg
  params: {
    location: location
    environmentName: environmentName
  }
}

// --- Container Apps (Backend) ---
module containerApp 'modules/container-app.bicep' = {
  name: 'container-app'
  scope: rg
  params: {
    location: location
    environmentName: environmentName
    redisHost: redis.outputs.hostName
    redisKey: redis.outputs.accessKey
    aiEndpoint: aiServices.outputs.endpoint
    aiKey: aiServices.outputs.key
    speechKey: aiServices.outputs.speechKey
    speechRegion: aiServices.outputs.region
    watchedChannels: watchedChannels
  }
}

// --- Static Web Apps (Studio) ---
module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'static-web-app'
  scope: rg
  params: {
    location: location
    environmentName: environmentName
  }
}

// --- Outputs ---
output backendUrl string = containerApp.outputs.url
output studioUrl string = staticWebApp.outputs.url