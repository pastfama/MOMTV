param location string
param resourceName string = 'fameshire-ai-services'

resource aiServices 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: resourceName
  location: location
  kind: 'CognitiveServices'
  sku: {
    name: 'S0'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
  }
}

output endpoint string = aiServices.properties.endpoint
output key string = aiServices.listKeys().key1
output id string = aiServices.id
