// MOMTV - Azure Cache for Redis

param location string
param environmentName string

resource redis 'Microsoft.Cache/redis@2024-03-01' = {
  name: '${environmentName}-redis'
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0
    }
    enableNonSslPort: false
  }
}

output hostName string = redis.properties.hostName
output sslPort int = redis.properties.sslPort
output accessKey string = redis.listKeys().primaryKey