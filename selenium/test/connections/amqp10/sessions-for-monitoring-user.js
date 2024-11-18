const { By, Key, until, Builder } = require('selenium-webdriver')
require('chromedriver')
const assert = require('assert')
const { buildDriver, goToHome, captureScreensFor, teardown } = require('../../utils')

const LoginPage = require('../../pageobjects/LoginPage')
const OverviewPage = require('../../pageobjects/OverviewPage')
const ConnectionsPage = require('../../pageobjects/ConnectionsPage')
const ConnectionPage = require('../../pageobjects/ConnectionPage')

var container = require('rhea')  // https://github.com/amqp/rhea
var receivedAmqpMessageCount = 0
var connectionEstablishedPromise = new Promise((resolve, reject) => {
  container.on('connection_open', function(context) {
    resolve()
  })
})

container.on('message', function (context) {
    receivedAmqpMessageCount++
})
container.once('sendable', function (context) {
    context.sender.send({body:'Hello World!'})
})


describe('Given an amqp10 connection opened, listed and clicked on it', function () {  
  let captureScreen
  let connectionsPage
  let connectionPage
  let connection 

  before(async function () {
    driver = buildDriver()
    await goToHome(driver)
    login = new LoginPage(driver)
    overview = new OverviewPage(driver)
    connectionsPage = new ConnectionsPage(driver)
    connectionPage = new ConnectionPage(driver)
    captureScreen = captureScreensFor(driver, __filename)
    await login.login('monitoring-only', 'guest')
    await overview.isLoaded()

    connection = container.connect(
      {'host': process.env.RABBITMQ_HOSTNAME || 'rabbitmq',
       'port': process.env.RABBITMQ_AMQP_PORT || 5672,
       'username' : process.env.RABBITMQ_AMQP_USERNAME || 'guest',
       'password' : process.env.RABBITMQ_AMQP_PASSWORD || 'guest',
       'id': "selenium-connection-id",
       'container_id': "selenium-container-id"
      })
    connection.open_receiver('examples')
    connection.open_sender('examples')

    await connectionEstablishedPromise
    await overview.clickOnConnectionsTab()    
    await connectionsPage.isLoaded()

    connections_table = await connectionsPage.getConnectionsTable(20)
    assert.equal(1, connections_table.length)
    await connectionsPage.clickOnConnection(2)
    await connectionPage.isLoaded()
  })


  it('can list session information', async function () {
    let a = await connectionPage.list_sessions()
    console.log(a.length + " sessions")
    for(var i = 0; i < a.length; i++) {
      console.log(a[i].length + " columns " + a[i])      
      for(var z = 0; z < a[i].length; z++) {
        console.log(a[i][z]);
      }
    }
  })
  
  it('can list link information', async function () {
    // names 
    // target and source information
    // unconfirmed messages 
    // flow control
  })

  after(async function () {    
    await teardown(driver, this, captureScreen)
    try {
      if (connection != null) {
        connection.close()
      }
    } catch (error) {
      console.error("Failed to close amqp10 connection due to " + error);      
    }  
  })

})
