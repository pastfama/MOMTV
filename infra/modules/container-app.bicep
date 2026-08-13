// MOMTV - Azure Container Apps (Backend)

param location string
param environmentName string
param redisHost string
param redisKey string
param aiEndpoint string
param aiKey string
param speechKey string
param speechRegion string
param watchedChannels string = 'twitch:shroud'

// Container Apps Environment
resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${environmentName}-env'
  location: location
  properties: {
    infrastructureResourceGroup: 'MC_${environmentName}-rg_${environmentName}-env_${location}'
  }
}

// Container App
resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${environmentName}-backend'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3001
        transport: 'http'
      }
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: 'node:22-slim'
          resources: {
            cpu: 2
            memory: '4Gi'
          }
          env: [
            { name: 'PORT', value: '3001' }
            { name: 'REDIS_HOST', value: redisHost }
            { name: 'REDIS_PORT', value: '6380' }
            { name: 'REDIS_PASSWORD', value: redisKey }
            { name: 'AZURE_AI_ENDPOINT', value: aiEndpoint }
            { name: 'AZURE_AI_PROJECT_ID', value: '' }
            { name: 'AZURE_CLIENT_ID', value: '' }
            { name: 'AZURE_TENANT_ID', value: '' }
            { name: 'AZURE_SPEECH_KEY', value: speechKey }
            { name: 'AZURE_SPEECH_REGION', value: speechRegion }
            { name: 'WATCHED_CHANNELS', value: watchedChannels }
          ]
          volumeMounts: [
            {
              mountPath: '/app/.cache'
              volumeName: 'cache'
            }
          ]
        }
      ]
      volumes: [
        {
          name: 'cache'
          emptyDir: {}
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

output url string = 'https://${app.properties.configuration.ingress.fqdn}'