// MOMTV - Azure AI Services (Cognitive Services Multi-Service)

param location string
param environmentName string

resource aiServices 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: '${environmentName}-ai'
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: '${environmentName}-ai'
    publicNetworkAccess: 'Enabled'
  }
}

// Deploy model deployments
resource gpt4o 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: aiServices
  name: 'gpt-4o'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o'
      version: '2024-11-20'
    }
    scaleSettings: {
      scaleType: 'Standard'
      capacity: 30
    }
  }
}

resource gpt4oMini 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: aiServices
  name: 'gpt-4o-mini'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-mini'
      version: '2024-11-20'
    }
    scaleSettings: {
      scaleType: 'Standard'
      capacity: 50
    }
  }
}

resource whisper 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: aiServices
  name: 'whisper-large'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'whisper-large'
      version: '3'
    }
    scaleSettings: {
      scaleType: 'Standard'
      capacity: 3
    }
  }
}

// Speech Services (separate resource)
resource speechService 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: '${environmentName}-speech'
  location: location
  kind: 'SpeechServices'
  sku: {
    name: 'S0'
  }
}

output endpoint string = aiServices.properties.endpoint
output key string = aiServices.listKeys().primaryMasterKey
output speechKey string = speechService.listKeys().primaryMasterKey
output region string = speechService.location