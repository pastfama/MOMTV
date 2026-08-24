param location string
param accountName string = 'fameshire-stream-db'

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: accountName
  location: location
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: 'stream-capture'
  properties: {
    resource: {
      id: 'stream-capture'
    }
  }
}

resource ocrContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'ocr-captures'
  properties: {
    resource: {
      id: 'ocr-captures'
      partitionKey: {
        paths: ['/channel']
        kind: 'Hash'
      }
    }
  }
}

resource transcriptContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'transcripts'
  properties: {
    resource: {
      id: 'transcripts'
      partitionKey: {
        paths: ['/channel']
        kind: 'Hash'
      }
    }
  }
}

resource highlightContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'highlights'
  properties: {
    resource: {
      id: 'highlights'
      partitionKey: {
        paths: ['/channel']
        kind: 'Hash'
      }
    }
  }
}

output endpoint string = cosmosAccount.properties.documentEndpoint
output key string = cosmosAccount.listKeys().primaryMasterKey
output id string = cosmosAccount.id
