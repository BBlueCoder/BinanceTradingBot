const ClientBin = require('./core/clientBin')
const DBController = require('./core/db')

const client = new ClientBin()
client.time().then(ts => {
	dt = new Date(ts)
	console.log(dt.toLocaleString())
})

const db = new DBController('trading_bot')
const doc = {test:'5'}

//db.updateDocument('test',doc,'6249bd037d24e432ca0a87ae').then(()=>console.log("document updated successfully")).catch(console.error)
//db.addDocument('test',doc).then(() => console.log('document added successfully')).catch(console.error)
//db.getAllDocuments('test').then(result => console.log(result[0]._id.toString())).catch(console.error)
//db.getDocuments('trade_history').then(console.log('finish')).catch(console.error)
/*const doc = {date:Date.now(),price:7.011,trade:'SELL'}
db.connect().then(() => db.addDocument(doc).then(console.log("finish!")).catch(console.error)).catch(console.error)*/
