const globVars = require('../global_const_vars')
const {MongoClient} = require('mongodb')
const ObjectID = require('mongodb').ObjectID

/*DB
@Collection trading
	Document structure :
		symbol
		baseAssetBalance
		boughtPrice
		stopLoss
		orderId
		status // TRADING,SELL,BUY,STOP
		motif  // GC,PB
@Collection trades_buy
	Document structure :
		symbol
		price
		quantity
		motif
		baseAssetBalance
		orderId
		stopLoss
		date
@Collection trades_sell
	Document structure :
		symbol
		price
		quantity
		baseAssetBalance
		orderId
		date*/

class DBController{

	constructor(dbName){
		this.dbName = dbName
	}

	async connect(){
		this.client = new MongoClient(`${globVars.localDB}`)
		await this.client.connect()
		this.db = this.client.db(this.dbName)
	}

	async addCollection(collectionName){
		await this.connect()
		await this.db.createCollection(collectionName)
		this.client.close()
	}

	async addDocument(collectionName,document){
		await this.connect()
		await this.db.collection(collectionName).insertOne(document)
		this.client.close()
	}

	async getAllDocuments(collectionName){
		await this.connect()
		const result = await this.db.collection(collectionName).find({}).toArray()
		this.client.close()
		return result
	}

	async getDocument(collectionName,query){
		await this.connect()
		const result = await this.db.collection(collectionName).find(query).toArray()
		this.client.close()
		return result
	}

	async updateDocument(collectionName,update,query){
		await this.connect()
		const result = await this.db.collection(collectionName).updateOne(query,{$set:update})
		this.client.close()
		return result
	}


}

module.exports = DBController






