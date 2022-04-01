const ClientBin = require('./core/clientBin')
const DBController = require('./core/db')

/*const client = new ClientBin()
client.getMarketTopVolume().then(list => console.log(list))*/

const db = new DBController('trading_bot')
db.getAllDocuments('trade_history').then(result => console.log(result)).catch(console.error)
//db.getDocuments('trade_history').then(console.log('finish')).catch(console.error)
/*const doc = {date:Date.now(),price:7.011,trade:'SELL'}
db.connect().then(() => db.addDocument(doc).then(console.log("finish!")).catch(console.error)).catch(console.error)*/
