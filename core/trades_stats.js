const fs = require('fs')

/*const buyData = fs.readFileSync('./trades_buy_history.json')
const sellData = fs.readFileSync('./trades_sell_history.json')

const tradesBuy = JSON.parse(buyData)
const tradesSell = JSON.parse(sellData)

tradesBuy.forEach(b => {
	const boughtPrice = b.price
	const _tradeSell = tradesSell.filter(s => s.orderId == b.orderId)[0]
	const sellPrice = _tradeSell.price
	const change = ((sellPrice-boughtPrice)/boughtPrice)*100
	console.log(`buy : ${boughtPrice} | sell : ${sellPrice} | profit : ${change}`)
})*/

const bbLowerData = fs.readFileSync('./bb_lower_data.json')
const pricesData = fs.readFileSync('./prices_data.json')

const _bbLower = JSON.parse(bbLowerData)
const _prices = JSON.parse(pricesData)

for(i =0;i<_bbLower.length;i++){

	const change = ((_prices[i].price-_bbLower[i].lower)/_bbLower[i].lower)*100

	/*if(_bbLower[i].lower >= _prices[i].price){
		console.log(_bbLower[i].time)
	}*/

	if(change <= 0.5){
		console.log(_bbLower[i].time)
	}
}