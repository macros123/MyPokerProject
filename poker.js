const suit = ["0", "1", "2", "3"]
const rank = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
const shuffle = arr => {
	var j, temp;
	for(var i = arr.length - 1; i > 0; i--){
		j = Math.floor(Math.random()*(i + 1));
		temp = arr[j];
		arr[j] = arr[i];
		arr[i] = temp;
	}
	return arr;
}
const createDeck = (suit, rank) =>{
    const temp = []
    for(const el of suit) {
        for(const el1 of rank) {
            temp.push({
                suit: el,
                rank: el1
            })
        }
    }
    return shuffle(temp)
}
let curDeck = createDeck(suit, rank)

const getOneCard = deck => deck.shift()

module.exports = {
    curDeck, getOneCard
}


