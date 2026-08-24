param location string
param acrName string
@secure()
param acrPassword string
param aiServicesEndpoint string
@secure()
param aiServicesKey string
param cosmosEndpoint string
@secure()
param cosmosKey string
@secure()
param blobConnectionString string

resource containerAppEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'fameshire-env'
  location: location
  properties: {
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
}

resource ocrWorker 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ocr-worker'
  location: location
  properties: {
    environmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 80
      }
      registries: [
        {
          server: '${acrName}.azurecr.io'
          username: acrName
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        { name: 'acr-password', value: acrPassword }
        { name: 'vision-key', value: aiServicesKey }
        { name: 'cosmos-key', value: cosmosKey }
        { name: 'blob-connection', value: blobConnectionString }
      ]
    }
    template: {
      containers: [
        {
          name: 'ocr-worker'
          image: '${acrName}.azurecr.io/ocr-worker:latest'
          resources: {
            cpu: 1
            memory: '2Gi'
          }
          env: [
            { name: 'AZURE_VISION_ENDPOINT', value: aiServicesEndpoint }
            { name: 'AZURE_VISION_KEY', secretRef: 'vision-key' }
            { name: 'COSMOS_ENDPOINT', value: cosmosEndpoint }
            { name: 'COSMOS_KEY', secretRef: 'cosmos-key' }
            { name: 'BLOB_CONNECTION', secretRef: 'blob-connection' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

resource audioWorker 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'audio-worker'
  location: location
  properties: {
    environmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 80
      }
      registries: [
        {
          server: '${acrName}.azurecr.io'
          username: acrName
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        { name: 'acr-password', value: acrPassword }
        { name: 'speech-key', value: aiServicesKey }
        { name: 'cosmos-key', value: cosmosKey }
        { name: 'blob-connection', value: blobConnectionString }
      ]
    }
    template: {
      containers: [
        {
          name: 'audio-worker'
          image: '${acrName}.azurecr.io/audio-worker:latest'
          resources: {
            cpu: 1
            memory: '2Gi'
          }
          env: [
            { name: 'AZURE_SPEECH_ENDPOINT', value: aiServicesEndpoint }
            { name: 'AZURE_SPEECH_KEY', secretRef: 'speech-key' }
            { name: 'COSMOS_ENDPOINT', value: cosmosEndpoint }
            { name: 'COSMOS_KEY', secretRef: 'cosmos-key' }
            { name: 'BLOB_CONNECTION', secretRef: 'blob-connection' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}
