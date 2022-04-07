


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

	const t = "BSWBUSD"
	console.log(t.substring(""))
}

function testswitch(){
	const num = 35

	switch(num){
		case num < 10 :
			console.log("5-10")
			break
		case num > 10:
			console.log("10-25")
			break
		case num > 25 :
			console.log("25-40")
			break
		default:
			console.log("default")
	}
}

