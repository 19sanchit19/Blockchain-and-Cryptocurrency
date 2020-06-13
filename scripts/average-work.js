const Blockchain= require('../blockchain');

const blockchain= new Blockchain();

blockchain.addBlock({data: 'initial'});

let prevTimestamp, nextTimestamp, nextBlock, timediff, average,sum=0;

const times =[];

for(let i=0;i<10000;i++){
    prevTimestamp=blockchain.chain[blockchain.chain.length-1].timestamp;
    blockchain.addBlock({data: 'block ${i}'});
    nextBlock=blockchain.chain[blockchain.chain.length-1];
    nextTimestamp=nextBlock.timestamp;
    timediff=nextTimestamp-prevTimestamp;
    times.push(timediff);
    sum+=timediff;
    console.log(`Time to mine block: ${timediff}ms. difficulty: ${nextBlock.difficulty}.`);
}
average=sum/times.length;
console.log(`average time: ${average}`);
