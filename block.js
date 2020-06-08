const hexToBinary=require('hex-to-binary');
const { GENESIS_DATA,MINE_RATE } = require('./config');
const cryptoHash=require('./crypto-hash');

class Block{
    constructor({timestamp,lastHash, hash, data,nonce,difficulty}){
        this.timestamp=timestamp;
        this.lastHash=lastHash;
        this.hash=hash;
        this.data=data;
        this.nonce=nonce;
        this.difficulty=difficulty;
    }

    static genesis(){
        return new this(GENESIS_DATA);
    }
    static mineBlock( {lastBlock, data} ){
        // const timestamp= Date.now();
        let hash,timestamp;
        const lastHash=lastBlock.hash;
        let {difficulty}=lastBlock;
        let nonce=0;
        do {
            nonce++;
            timestamp=Date.now();
            difficulty=Block.adjustDifficulty({originalBlock: lastBlock, timestamp});
            hash= cryptoHash(timestamp,lastHash,data,nonce,difficulty);
        } while(hexToBinary(hash).substring(0,difficulty)!=='0'.repeat(difficulty))
        return new this({
            timestamp ,
            lastHash,
            data,
            difficulty,
            nonce,
            hash
            // hash: cryptoHash(timestamp,lastHash,data,nonce,difficulty)
        });
    }

    static adjustDifficulty({originalBlock, timestamp}){
        const delta=timestamp-originalBlock.timestamp;
        const {difficulty}=originalBlock;
        if( difficulty<1)
            return 1;
        if(delta>MINE_RATE)
            return difficulty-1;
        else if(delta<MINE_RATE)
        return difficulty+1;
    }
};

module.exports = Block; 
