const globVars = require('../global_const_vars')
const {MongoClient} = require('mongodb')
const ObjectID = require('mongodb').ObjectID

// document for trade history
// {
//		date: date,
//		symbol : 'currency symbol',	
//		action : 'SELL or BUYY',
//		type: 'LIMIT or Market',
//		price: price of currency,
//		quantity : currency quantity,
//		status: trade status,
//		orderId : order id
//	}

class DBController{

	constructor(dbName){
		this.dbName = dbName
	}

	async connect(){
		this.client = new MongoClient(`${globVars.localDB}`)
		await this.client.connect()
		this.db = this.client.db(this.dbName)
		console.log('Connected successfully to db')
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

	async getDocuments(collectionName,query){
		await this.connect()
		const result = await this.db.collection(collectionName).find(query).toArray()
		this.client.close()
		return result
	}

	async updateDocument(collectionName,update,id){
		await this.connect()
		const result = await this.db.collection(collectionName).updateOne({_id: ObjectID(id)},{$set:update})
		this.client.close()
		return result
	}


}

module.exports = DBController






