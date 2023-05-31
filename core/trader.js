const ClientBin = require('./clientBin')
const DBController = require('./db')
const globVars = require('../global_const_vars')
const WebSocket = require('ws')
const indicators = require('./indicators')
const fs = require('fs')

//data
var lowPrice = 0
var maxPrice = 0
var maxChange = 0.0

var baseAssetBalance = 100
var boughtPrice = 0
var stopLoss = 0
var orderId = 0
var status = "" // TRADING,SELL,BUY
var motif = "" // GC,PB

var countBuy = 0

var bbLowerData = []
var priceData = []

var isHeartBeatON = false

var binanceSocket = new WebSocket('wss://stream.binance.com:9443/ws/gmtbusd@kline_15m')

startTrading("gmt","busd")

async function startTrading(asset,baseAsset,period = "15m"){
	
	if(!isHeartBeatON){
		heartBeat(asset,baseAsset,period)
		isHeartBeatON = true
	}

	const client = new ClientBin()
	const symbol = asset.toUpperCase()+baseAsset.toUpperCase()

	const trade = await getTradeData(symbol)

	baseAssetBalance = trade.baseAssetBalance
	boughtPrice = trade.boughtPrice
	stopLoss = trade.stopLoss
	status = trade.status
	motif = trade.motif
	orderId = trade.orderId

	let klineTime = 0
	try{

		let klines = await client.getKlines(symbol,"15m")
		let source = indicators.detachSource(klines)

		binanceSocket = new WebSocket('wss://stream.binance.com:9443/ws/'+symbol.toLowerCase()+'@kline_'+period)

		binanceSocket.on('open', function open() {
			console.log("connected to stream "+(new Date()).toString())
		});

		binanceSocket.on('message', async function message(data) {
			const _kline = JSON.parse(data)

			//check if kline time to refresh klines if times are not equal
			if(klineTime != 0 && klineTime != _kline.k.T){
				klines = await client.getKlines(symbol,"15m")
				source = indicators.detachSource(klines)
				console.log("***"+status+"_"+_kline.k.T)
			}
			const currentPrice = parseFloat(_kline.k.c)
			                                                       
			source[source.length-1] = currentPrice
			klineTime = _kline.k.T

			if(status == "TRADING"){
				/*const isGoldenCross = await goldenCross(source,currentPrice)
				if(isGoldenCross){
					/*status = "BUY"
					motif = "GC"
					lowPrice = currentPrice*/
				//}else{*/
					const isPriceBelowBB = await priceBelowBB(source,currentPrice)
					if(isPriceBelowBB){
						status = "BUY"
						motif = "PB"
						lowPrice = currentPrice
						updateTradeDocument(symbol)
					}	
				}

				if(status == "BUY"){
					/*if(currentPrice<lowPrice)
						lowPrice = currentPrice

					const change = ((currentPrice-lowPrice)/lowPrice)*100*/
					const _shouldBuy = await shouldBuy(source,currentPrice)
					if(_shouldBuy){
						countBuy++
						if(countBuy>5)
							countBuy = 5
					}else{
						countBuy--
						if(countBuy<0)
							countBuy = 0
					}

					if(countBuy == 5){
						await buyCoin(symbol,currentPrice,source,0)
						status = "SELL"
						maxPrice = currentPrice
						boughtPrice = currentPrice
						countBuy = 0
					}
				}

				if(status == "SELL" && stopLoss == 0)
					stopLoss = boughtPrice - (boughtPrice * 0.022)

				if(status == "SELL"){
					if(currentPrice>maxPrice)
						maxPrice = currentPrice

					const change = ((maxPrice-currentPrice)/currentPrice)*100
					const priceChange = ((currentPrice-boughtPrice)/boughtPrice)*100

					if(priceChange>maxChange)
						maxChange = priceChange

					if(maxChange >= 0.9 && maxChange < 1.5 && change >= 0.2){
						await sellCoin(symbol,currentPrice,orderId)
					}else if(maxChange >= 1.5 && maxChange < 2.1 && change >= 0.3){
						await sellCoin(symbol,currentPrice,orderId)
					}else if(maxChange > 2 && maxChange < 3.1 && change >= 0.4){
						await sellCoin(symbol,currentPrice,orderId)
					}else if(maxChange > 3 && maxChange < 4 && change >= 0.5){
						await sellCoin(symbol,currentPrice,orderId)
					}else if(maxChange >= 4 && maxChange <= 6 && change >= 0.7){
						await sellCoin(symbol,currentPrice,orderId)
					}else if(maxChange > 6 && maxChange < 10 && change >= 1){
						await sellCoin(symbol,currentPrice,orderId)
					}else if(maxChange >= 10){
						await sellCoin(symbol,currentPrice,orderId)
					}

					if(currentPrice<=stopLoss)
						await sellCoin(symbol,currentPrice,orderId,"STOPLOSS")
				}

			});

		binanceSocket.on('close',()=>{
			console.log("socket closed at"+(new Date()).toString())
			status = "STOP"
			updateTradeDocument()
		})

	}catch(err){
		console.log("Error at "+(new Date()).toString())
		console.log(err)
		status = "STOP"
		startTrading(assest,baseAsset,period)
	}
}

async function getTradeData(symbol){
	const db = new DBController(globVars.DBName)
	const tradeCoinData = await db.getDocument(globVars.tradingColl,{symbol : symbol})

	if(tradeCoinData.length == 0){
		const trade = {
			symbol : symbol,
			baseAssetBalance : 102.0,
			boughtPrice : 0.0,
			stopLoss : 0.0,
			orderId : 0,
			status : "TRADING",
			motif : "_"
		}

		await db.addDocument(globVars.tradingColl,trade)
		return trade
	} 

	return tradeCoinData[0]
}

async function sellCoin(symbol,price,orderId,sellMotif = "PROFIT"){
	const client = new ClientBin()
	const accountInfo = await client.getAccountInfo()

	let freeAssetBalance = accountInfo.balances.find(b => b.asset == symbol.substring(0,symbol.length-4)).free
	freeAssetBalance = freeAssetBalance.slice(0,freeAssetBalance.indexOf('.')+2)

	const quantityToSell = parseFloat(freeAssetBalance)

	if(!quantityToSell){
		console.log(`freeAssetBalance : ${freeAssetBalance} \n quantity : ${quantityToSell}`)
		throw 'quantity is null'
	}

	console.log(`sell order parameters : \n symbol : ${symbol} \n quantity : ${quantityToSell}`)
	const result = await client.newOrder(symbol,"SELL","MARKET",quantityToSell)
	status = "TRADING"
	stopLoss = 0
	baseAssetBalance = 0

	for(i = 0;i<result.fills.length;i++){
		const fill = result.fills[i]
		baseAssetBalance += parseFloat(fill.price)*parseFloat(fill.qty)
	}
	if(baseAssetBalance == 0)
		baseAssetBalance = 100

	updateTradeDocument(symbol)
	addSellTrade(symbol,quantityToSell,price,sellMotif)
}

async function buyCoin(symbol,price,source,minusQ){
	const client = new ClientBin()

	let quantityToBuy = baseAssetBalance/price
	quantityToBuy = parseFloat(quantityToBuy.toString().slice(0,quantityToBuy.toString().indexOf(".")+2))
	quantityToBuy = quantityToBuy - minusQ

	if(!quantityToBuy){
		console.log(`baseAssetBalance : ${baseAssetBalance} \n price : ${price} \n quantity : ${quantityToBuy} \n minuqQ : ${minusQ}`)
		throw "Quantity is null"
	}

	try{
		console.log(`buy order parameters : \n symbol : ${symbol} \n quantity : ${quantityToBuy}`)
		const result = await client.newOrder(symbol,"BUY","MARKET",quantityToBuy)
		status = "SELL"

		baseAssetBalance = 0
		for(i = 0;i<result.fills.length;i++){
			const fill = result.fills[i]
			baseAssetBalance += parseFloat(fill.price)*parseFloat(fill.qty)
		}

		stopLoss = price - (price * 0.025)
		orderId = result.orderId

		boughtPrice = price
		updateTradeDocument(symbol)
		addBuyTrade(symbol,quantityToBuy,price)
	}catch(err){
		console.log(err)
		try{
			const error = JSON.parse(err.toString().substring(err.toString().indexOf('{'),err.toString().indexOf('}')+1))
			if(error.code = -2010)
				buyCoin(symbol,price,source,minusQ+0.1)
		}catch(err){
			console.log(err)
		}
	}

}

async function updateTradeDocument(symbol){
	const trade = {
		symbol : symbol,
		baseAssetBalance : baseAssetBalance,
		boughtPrice : boughtPrice,
		stopLoss : stopLoss,
		orderId : orderId,
		status : status,
		motif : motif
	} 

	console.log(`updateTradeDocument method called \n ${JSON.stringify(trade)}`)

	const db = new DBController(globVars.DBName)
	await db.updateDocument(globVars.tradingColl,trade,{symbol : symbol})
}

async function addBuyTrade(symbol,quantity,price){
	const buyTrade = {
		symbol : symbol,
		price : price,
		quantity : quantity,
		baseAssetBalance : baseAssetBalance,
		motif : motif,
		orderId : orderId,
		stopLoss : stopLoss,
		date : (new Date()).toString()
	}

	console.log(`addBuyTrade method called \n ${JSON.stringify(buyTrade)}`)

	try{
		const db = new DBController(globVars.DBName)
		await db.addDocument(globVars.tradesBuyColl,buyTrade)
	}catch(err){
		console.log("Error in addBuyTrade method \n "+err)
	}
	
}

async function shouldBuy(klines,price){
	const bb = await indicators.bb(klines.slice(182),21,2)
	const BBlower = bb[bb.length-1].lower
	/*console.log(bb)
	console.log(bb.length)*/
	const changeOfPriceAndBBLower = BBlower + (BBlower * 0.006)

	//console.log("bblower "+BBlower+" price = "+price)
	//console.log("change = "+changeOfPriceAndBBLower)

	if(price>changeOfPriceAndBBLower)
		return true
	return false
}

async function addSellTrade(symbol,quantity,price,sellMotif){
	const sellTrade = {
		symbol : symbol,
		price : price,
		quantity : quantity,
		baseAssetBalance : baseAssetBalance,
		orderId : orderId,
		motif : sellMotif,
		date : (new Date()).toString()
	}

	console.log(`addSellTrade method called \n ${JSON.stringify(sellTrade)}`)

	try{
		const db = new DBController(globVars.DBName)
		await db.addDocument(globVars.tradesSellColl,sellTrade)
	}catch(err){
		console.log("Error in addSellTrade method \n "+err)
	}
}

async function priceBelowBB(klines,price){
	const bb = await indicators.bb(klines.slice(182),21,2)
	const BBlower = bb[bb.length-1].lower
	bbLowerData.push({lower : BBlower,time : (new Date()).toString()})
	fs.writeFile('bb_lower_data.json',JSON.stringify(bbLowerData),'utf8',()=>{
	})
	priceData.push({price : price,time : (new Date()).toString()})
	fs.writeFile('prices_data.json',JSON.stringify(priceData),'utf8',()=>{
	})

	/*let priceBBChange = ((price-BBlower)/BBlower)*100*/

	if(price <= BBlower)
		return true
	return false
}

async function goldenCross(klines,price){
	const ema = await indicators.ema(klines.slice(150),50)
	const emaM1 = ema[ema.length - 1]
	const emaM3 = ema[ema.length - 3]

	let ma = await indicators.ma(klines,200)
	const maM1 = ma[ma.length -1]
	const maM3 = ma[ma.length - 3] 



	if(emaM1>= maM1 && emaM3 < maM3){
		console.log(maM1+"_"+emaM1+"/"+maM3+"_"+emaM3)
		return true
	}
	return false
}

async function rsiOverSold(){
	const rsiData = await rsi(14,"close","binance","GMT/BUSD","15m")

	if(rsiData[rsiData.length-1] < 35)
		return true
	return false
}

async function heartBeat(asset,baseAsset,period = "15m"){
	try{
		const db = new DBController(globVars.DBName)
		const symbol = asset.toUpperCase()+baseAsset.toUpperCase()

		const trade = await db.getDocument(globVars.tradingColl,{symbol : symbol})
		if(trade.length != 0){
			if(trade[0].status == "STOP" && status != "STOP"){
				status = "STOP"
				console.log("stop from db")
				binanceSocket.terminate()
			}

			if(trade[0].status != "STOP" && status == "STOP"){
				startTrading(asset,baseAsset,period)
				console.log("restart trading")
			}
		}
		setTimeout(heartBeat,10000,asset,baseAsset,period)
	}catch(err){
		console.log("Heart beat error : \n"+err)
	}
}

/*fs.writeFile('trades_history.json',JSON.stringify(tradesHistory),'utf8',()=>{
	console.log("write!")
})*/

/*const trade = {
	symbol : "GMTBUSD",
	price : 3.66,
	quantity : 15,
	side : "BUY",
	motif : motif,
	busdBalance : busdBalance
}

tradesHistory.push(trade)
fs.writeFile('trades_history.json',JSON.stringify(tradesHistory),'utf8',()=>{

})*/

/*const arrayT = {
	test : "test",
	fills : [
	{
		price : 3,
		quantity : 2
	},
	{
		price : 2,
		quantity : 2
	},
	{
		price : 4,
		quantity : 2
	}
	]
}

let sum = 0
for(i = 0;i<arrayT.fills.length;i++){
	sum += (arrayT.fills[i].price * arrayT.fills[i].quantity)
}
console.log(sum)*/
