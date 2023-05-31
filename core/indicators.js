const TI = require('technicalindicators')

const detachSource = (klines)=>{
	const source = []
	klines.forEach((kline)=>{
		source.push(parseFloat(kline[4]))
	})
	return source
}

const ema = async (values,period)=>{
	return await TI.EMA.calculate({period : period, values : values})	
}

const ma = async (values,period)=>{
	return await TI.SMA.calculate({period : period, values : values})
}

const bb = async (values,period,stdDev)=>{
	return await TI.BollingerBands.calculate({period : period, values : values, stdDev : stdDev})
}

module.exports = {
	ema,
	ma,
	bb,
	detachSource,
}