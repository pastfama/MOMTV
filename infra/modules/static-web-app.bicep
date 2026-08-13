// MOMTV - Azure Static Web Apps (Studio Frontend)

param location string
param environmentName string

resource staticWebApp 'Microsoft.Web/staticSites@2024-04-01' = {
  name: '${environmentName}-studio'
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
}

output url string = staticWebApp.properties.defaultHostname
output apiKey string = staticWebApp.listApiKeys().properties.apiKey