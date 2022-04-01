const globVars = require('../global_const_vars')
const {MongoClient} = require('mongodb')

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

	async addDocument(document){
		this.db = this.client.db(this.dbName)
		await this.db.collection('test').insertOne(document)
		console.log('document added')
	}

	async getDocuments(collectionName){
		await this.connect()
		const result = await this.db.collection(collectionName).find({}).toArray()
		this.client.close()
		console.log(result)
	}


}

module.exports = DBController






