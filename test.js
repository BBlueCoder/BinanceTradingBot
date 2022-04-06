


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
	test(1)
	test(2)
}

main()

async function test(n){
	console.log("start"+n)
	await delay(2000)
	console.log("end")
	if(n == 1){
		setTimeout(test,500,1)
	}
}

