//client binance api 
const globVars = require('../global_const_vars')
const axios = require('axios')
const parser = require('node-html-parser')
const crypto = require('crypto')

class ClientBin {

	signature(query){
		return crypto
		.createHmac('sha256',globVars.apiSecret)
		.update(query)
		.digest('hex')
	}

	pubGetCall(path){
		return new Promise((resolve,reject)=>{
			axios.get(path)
			.then(resp => {
				resolve(resp)
			}).catch(err =>{
				console.log(""+err)
				reject(new Error(err))
			})
		})
	}

	prvGetCall(path,query,signature){
		return new Promise(async (resolve,reject)=>{
			const config = {
				method : 'GET',
				url:path+'?'+query+'&signature='+signature,
				headers: {
					'X-MBX-APIKEY':globVars.apiKey
				}
			}

			try{
				const resp = await axios(config)
				resolve(resp)
			}catch(err){
				console.log('Error : '+JSON.stringify(err.response.data))
				reject(new Error(err))
			}
		})
	}

	extractBinanceData(source){
		const bodyElement = source.getElementsByTagName('body')[0]
		const scripts = bodyElement.getElementsByTagName('script')
		const rawData = scripts.find((sc)=>sc.getAttribute('id') === '__APP_DATA')
		if(!rawData)
			throw new Error('Could not extract data')
		const appData = JSON.parse(rawData.text)
		return appData
	}

	getAnnouncement(){
		return new Promise((resolve,reject)=>{
			this.pubGetCall(globVars.announcementURL)
			.then(resp => {
				try{
					const announcement = this.extractBinanceData(parser.parse(resp.data))
					resolve(announcement)
				}catch(err){
					console.log(""+err)
					reject(err)
				}			
			})
			.catch(err => {
				console.log(err)
				reject(new Error(err))
			})
		})
	}

	getMarket(){
		return new Promise((resolve,reject)=>{
			this.pubGetCall(globVars.binanceMarketURL)
			.then(resp => {
				try{
					const market = this.extractBinanceData(parser.parse(resp.data))
					resolve(market) 
				}catch(err){
					console.log("error : "+err)
					reject(new Error(err))
				}
			})
			.catch(err => {
				console.log("error : "+err)
				reject(new Error(err))
			})
		})
	}

	getMarketNewListing(){
		return new Promise(async (resolve,reject)=>{
			try{
				const market = await this.getMarket()
				const list = market.pageData.redux.ssrStore.symbolList.filter(c => c.tags.includes('newListing'))
				resolve(list)
			}catch(err){
				reject(new Error(err))
			}
		})
	}

	getMarketTopGainers(){
		return new Promise(async(resolve,reject)=>{
			try{
				const market = await this.getMarket()
				const list = market.pageData.redux.ssrStore.symbolList.sort((a,b)=>b.dayChange - a.dayChange)
				resolve(list)
			}catch(err){
				reject(new Error(err))
			}
		})
	}

	getMarketTopVolume(){
		return new Promise(async(resolve,reject)=>{
			try{
				const market = await this.getMarket()
				const list = market.pageData.redux.ssrStore.symbolList.sort((a,b)=>b.volume - a.volume)
				resolve(list)
			}catch(err){
				reject(new Error(err))
			}
		})
	}

	async calculeTimeDiff(eventDate){
		const binanceCurrentTime = await this.time()
		const diffTime = Math.abs(binanceCurrentTime - eventDate)
		const diffDays = Math.ceil(diffTime/ (1000 * 60 * 60 *24))
		return diffDays
	}

	getAnnouncementNewListingCurrency(){
		return new Promise((resolve,reject)=>{
			this.getAnnouncement()
			.then(announcement => {
				const newListingList = announcement.routeProps.b723.catalogs.find(c => c.catalogName === 'New Cryptocurrency Listing').articles
				.filter(a=> a.title.includes('Binance Will List') && calculeTimeDiff(a.releaseDate)<2)
				resolve(newListingList)
			})
			.catch(err => {
				reject(err)
			})
		})		
	}

	getAccountInfo(){
		return new Promise(async (resolve,reject)=>{
			const ts = await this.time()
			const query = `timestamp=${ts}&recvWindow=${8000}`
			const signature = this.signature(query)
			this.prvGetCall(`${globVars.baseURL}/api/v3/account`,query,signature)
			.then(resp => {
				resolve(resp.data)
			})
			.catch(err => {
				reject(err)
			})
		})
	}

	time(){
		return new Promise((resolve,reject)=>{
			this.pubGetCall(`${globVars.baseURL}/api/v3/time`).then(resp => {
				resolve(resp.data.serverTime)
			}).catch(err=>{
				reject(new Error(err))
			})
		})
		
	}
}

module.exports = ClientBin

//calcule change x% = ((current_price-old_price)/old_price)*100