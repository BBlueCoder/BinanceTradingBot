


async function track(num){
	let count = 0
	const int = setInterval(()=>{
		console.log(`int ${num}`)
		count++
		if(count == 2 && num == 1){
			console.log('interval cleared')
			clearInterval(int)
		}
		if(count == 10 && num == 2){
			console.log('interval cleared')
			clearInterval(int)
		}
	},500)
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function main(){
	test()
}

main()

async function test(){
	console.log("start")
	await delay(2000)
	console.log("end")
	setTimeout(test,500)
}

