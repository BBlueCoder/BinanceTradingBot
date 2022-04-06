const ClientBin = require('./core/clientBin')
const DBController = require('./core/db')
const globVars = require('./global_const_vars')

/*const client = new ClientBin()
client.time().then(ts => {
	dt = new Date(ts)
	console.log(dt.toLocaleString())
})*/

/*const db = new DBController('trading_bot')
const doc = db.getDocument('newCurrencyTrack',{name: 'Biswap',symbol:'BSW'}).
then(d => {
	db.updateDocument('newCurrencyTrack',{isTracking:false},d[0]._id.toString())
})*/

/*const client = new ClientBin()
client.getAccountInfo().then(res => console.log(res)).catch(console.error)*/

//db.updateDocument('test',doc,'6249bd037d24e432ca0a87ae').then(()=>console.log("document updated successfully")).catch(console.error)
//db.addDocument('test',doc).then(() => console.log('document added successfully')).catch(console.error)
//db.getAllDocuments('test').then(result => console.log(result[0]._id.toString())).catch(console.error)
//db.getDocuments('trade_history').then(console.log('finish')).catch(console.error)
/*const doc = {date:Date.now(),price:7.011,trade:'SELL'}
db.connect().then(() => db.addDocument(doc).then(console.log("finish!")).catch(console.error)).catch(console.error)*/

// const testf = '2.33'
// const numF = parseFloat(testf)
// const res = 50 / numF
// console.log(Math.round(21.76))

/*const client = new ClientBin()
client.currencyPriceTicker('GMTBUSD').then(r => console.log(r)).catch(console.error)*/

/*const newCurrency = {name : 'Bitcoin',symbol: 'BTC'}
trackNewCurrency(newCurrency)*/

const client = new ClientBin()
const db = new DBController(globVars.DBName)
tradeCurrency(11078)

/*client.newOrder('XRPUSDT','SELL','MARKET',200)*/
/*client.getAccountInfo().then(res => console.log(res)).catch(console.error)*/

//checkNewCurrency()

// tracking new listed currencies
async function checkNewCurrency(){
	/*	setInterval(async ()=> {*/
		try{
			const list = await client.getAnnouncementNewListingCurrency()	
			for(i = 0;i<list.length;i++){
				//check if currency was added to db or not
				const dbDoc = await db.getDocument(globVars.newCurrencyTracksCollection,{name : list[i].name,symbol : list[i].symbol})
				if(dbDoc.length == 0){
					const doc = {
						name : list[i].name,
						symbol : list[i].symbol,
						isTracking : true,
						active : true
					}
					await db.addDocument(globVars.newCurrencyTracksCollection,doc)
					client.sendMail(`Hey Boss! ${list[i].title}`,`Binance will list a new currency and I have started tracking it for more details about the currency check this link :\nhttps://www.binance.com/en/support/announcement/${list[i].code}`)
					trackNewCurrency(list[i])
				}else{
					if(dbDoc[0].active && !dbDoc[0].isTracking){
						trackNewCurrency(list[i])
					}
				}
			}
		}catch(err){
			console.log('errr = '+err)
			const client = new ClientBin()
			client.sendMail('Hey Boss i got a problem',`I got an error on checkNewCurrency() method you have to check it \n${err}`)
		}
/*	},1000)*/
}

async function trackNewCurrency(newCurrency){
	try{
		//check if currency is on market
		const marketNewCurrencyList = await client.getMarketNewListing()

		const currencyInMarket = marketNewCurrencyList.find(c => c.fullName == newCurrency.name || c.name == newCurrency.symbol)

		if(currencyInMarket){
			//check in market if currency is available on USDT or BUSD 
			const market = await client.getMarket()
			const data = market.pageData.redux.products.productMap

			let isCurrencyAvailableWithBUSD = false
			let isCurrencyAvailableWithUSDT = false

			if(data[`${newCurrency.symbol}BUSD`]){
				isCurrencyAvailableWithBUSD = true
			}
			if(data[`${newCurrency.symbol}USDT`]){
				isCurrencyAvailableWithUSDT = true
			}

			//check account balances
			const accountInfo = await client.getAccountInfo()
			const accountBUSDBalance = accountInfo.balances.find(b => b.asset == 'BUSD').free * 1

			if(isCurrencyAvailableWithBUSD){ // if the new currency is available with BUSD then buy it with BUSD
				if(accountBUSDBalance<50){ // if BUSD balance is < 50 check if there USDT and buy BUSD 
					const accountUSDTBalance = accountInfo.balances.find(b => b.asset == 'USDT').free * 1
					if((accountUSDTBalance+accountBUSDBalance)<50){
						client.sendMail('Boss! we need money','there is no enough balance to trade')
					}else{
						const BUSDQtyToBought = parseInt(50 - accountBUSDBalance)
						await client.newOrder('BUSDUSDT','BUY','MARKET',BUSDQtyToBought)
						const symbolTicker = await client.currencyPriceTicker(`${newCurrency.symbol}BUSD`)
						const symbolPrice = parseFloat(symbolTicker.price)
						const qty = (Math.round(50 / symbolPrice))-1
						await client.newOrder(`${newCurrency.symbol}BUSD`,'BUY','MARKET',qty)
						const currencyDocInDB = await db.getDocument(globVars.newCurrencyTracksCollection,{name : newCurrency.name,symbol : newCurrency.symbol})
						if(currencyDocInDB.length > 0){
							const update = {isTracking : false,active:false}
							await db.updateDocument(globVars.newCurrencyTracksCollection,update,currencyDocInDB[0]._id.toString())
						}						
					}
				}else{ // BUSD balance > 50 buy the new currency
					const symbolTicker = await client.currencyPriceTicker(`${newCurrency.symbol}BUSD`)
					const symbolPrice = parseFloat(symbolTicker.price)
					const qty = (Math.round(50 / symbolPrice))-1
					await client.newOrder(`${newCurrency.symbol}BUSD`,'BUY','MARKET',qty)
					const currencyDocInDB = await db.getDocument(globVars.newCurrencyTracksCollection,{name : newCurrency.name,symbol : newCurrency.symbol})
					if(currencyDocInDB.length > 0){
						const update = {isTracking : false,active:false}
						await db.updateDocument(globVars.newCurrencyTracksCollection,update,currencyDocInDB[0]._id.toString())
					}					
				}
			}else{
				if(isCurrencyAvailableWithUSDT){ // buy the new currency with USDT
					const accountUSDTBalance = accountInfo.balances.find(b => b.asset == 'USDT').free * 1
					if(accountUSDTBalance<50){ // if USDT balance is < 50 check if there is some BUSD
						const accountBUSDBalance = accountInfo.balances.find(b => b.asset == 'BUSD').free * 1
						if((accountUSDTBalance+accountBUSDBalance)<50){
							client.sendMail('Boss! we need money','there is no enough balance to trade')
						}else{
							const USDTQtyToSell = parseInt(50 - accountUSDTBalance)
							await client.newOrder('BUSDUSDT','SELL','MARKET',USDTQtyToSell)
							const symbolTicker = await client.currencyPriceTicker(`${newCurrency.symbol}USDT`)
							const symbolPrice = parseFloat(symbolTicker.price)
							const qty = (Math.round(50 / symbolPrice))-1
							await client.newOrder(`${newCurrency.symbol}USDT`,'BUY','MARKET',qty)
							const currencyDocInDB = await db.getDocument(globVars.newCurrencyTracksCollection,{name : newCurrency.name,symbol : newCurrency.symbol})
							if(currencyDocInDB.length > 0){
								const update = {isTracking : false,active:false}
								await db.updateDocument(globVars.newCurrencyTracksCollection,update,currencyDocInDB[0]._id.toString())
							}						
						}
					}else{ // USDT balance > 50 
						const symbolTicker = await client.currencyPriceTicker(`${newCurrency.symbol}USDT`)
						const symbolPrice = parseFloat(symbolTicker.price)
						const qty = (Math.round(50 / symbolPrice))-1
						await client.newOrder(`${newCurrency.symbol}USDT`,'BUY','MARKET',qty)
						const currencyDocInDB = await db.getDocument(globVars.newCurrencyTracksCollection,{name : newCurrency.name,symbol : newCurrency.symbol})
						if(currencyDocInDB.length > 0){
							const update = {isTracking : false,active:false}
							await db.updateDocument(globVars.newCurrencyTracksCollection,update,currencyDocInDB[0]._id.toString())
						}					
					}
				}else{
					const currencyDocInDB = await db.getDocument(globVars.newCurrencyTracksCollection,{name : newCurrency.name,symbol : newCurrency.symbol})
					if(currencyDocInDB.length > 0){
						const update = {isTracking : false}
						await db.updateDocument(globVars.newCurrencyTracksCollection,update,currencyDocInDB[0]._id.toString())
					}	
				}
			}
		}
	}catch(err){
		console.log(err)
		/*const client = new ClientBin()
		client.sendMail('Hey Boss i got a problem',`I got an error on trackNewCurrency() method you have to check it \n${err}`)*/
	}
}

async function tradeCurrency(orderId){
	try{
		const doc = await db.getDocument(globVars.tradeHistoryCollection,{orderId : orderId})
		const boughtPrice = parseFloat(doc[0].price)
		const priceTicker = await client.currencyPriceTicker(doc[0].symbol)
		const currentPrice = parseFloat(priceTicker.price)
		let changePercent = ((currentPrice-boughtPrice)/boughtPrice)*100
		changePercent = changePercent.toFixed(2)

		
	}catch(err){
		console.log(err)
	}
}

async function test(){
	const client = new ClientBin()
	const market = await client.getMarket()
	const data = market.pageData.redux.products.productMap
	const sym = 'BSW'
	console.log(data[`${sym}BUSD`])
}
