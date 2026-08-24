param location string
param acrName string = 'fameshirestream'

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

output acrName string = containerRegistry.name
output loginServer string = containerRegistry.properties.loginServer
output username string = containerRegistry.name
output password string = containerRegistry.listCredentials().passwords[0].value
