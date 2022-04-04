const ClientBin = require('./core/clientBin')
const DBController = require('./core/db')

/*const client = new ClientBin()
client.time().then(ts => {
	dt = new Date(ts)
	console.log(dt.toLocaleString())
})*/


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

// tracking new listed currencies
async function checkNewCurrency(){
	/*	setInterval(async ()=> {*/
		try{
			const client = new ClientBin()
			const list = await client.getAnnouncementNewListingCurrency()

			const db = new DBController('trading_bot')
			
			for(i = 0;i<list.length;i++){
				//check if currency was added to db or not
				const dbDoc = await db.getDocument('newCurrencyTrack',{name : list[i].name,symbol : list[i].symbol})
				if(dbDoc.length == 0){
					const doc = {
						name : list[i].name,
						symbol : list[i].symbol,
						isTracking : true,
					}
					await db.addDocument('newCurrencyTrack',doc)
					client.sendMail(`Hey Boss! ${list[i].title}`,`Binance will list a new currency and I have started tracking it for more details about the currency check this link :\nhttps://www.binance.com/en/support/announcement/${list[i].code}`)
					//trackNewCurrency(list[i])
				}
			}

		}catch(err){
			console.log('errr = '+err)
/*			const client = new ClientBin()
client.sendMail('Hey Boss i got a problem',`I got an error on checkNewCurrency() method you have to check it \n${err}`)*/
}
/*	},1000)*/
}

async function trackNewCurrency(newCurrency){
	setInterval(async ()=>{
		try{
			const client = new ClientBin()
			const db = new DBController('trading_bot')
			//check if currency is on market
			const marketNewCurrencyList = await client.getMarketNewListing()

			const currencyInMarket = marketNewCurrencyList.find(c => c.fullName == newCurrency.name || c.name == newCurrency.symbol)
			if(currencyInMarket){
				//check in market if currency is available on USDT or BUSD 
				const market = await client.getMarket()
				const data = market.pageData.products.productMap

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

				if(isCurrencyAvailableWithBUSD){
					if(accountBUSDBalance<50){
						const accountUSDTBalance = accountInfo.balances.find(b => b.asset == 'USDT').free * 1
						if(accountUSDTBalance<51){
							client.sendMail('Boss! we need money','there is no enough USDT balance to trade')
						}else{
							await client.newOrder('BUSDUSDT','BUY','MARKET',50)
							const symbolTicker = await client.currencyPriceTicker(`${newCurrency.symbol}BUSD`)
							const symbolPrice = parseFloat(symbolTicker.price)
							const qty = Math.round(50 / symbolPrice)
							await client.newOrder(`${newCurrency.symbol}BUSD`,'BUY','MARKET',qty)

						}
					}
				}
			}
		}catch(err){
			const client = new ClientBin()
			client.sendMail('Hey Boss i got a problem',`I got an error on trackNewCurrency() method you have to check it \n${err}`)
		}
},1000)
}

async function test(){
	const client = new ClientBin()
	const market = await client.getMarket()
	const data = market.pageData.redux.products.productMap
	const sym = 'BSW'
	console.log(data[`${sym}BUSD`])
}
