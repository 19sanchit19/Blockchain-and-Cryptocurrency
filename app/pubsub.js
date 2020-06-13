const PubNub = require('pubnub');
const credentials={
    publishKey: 'pub-c-4057606c-c01a-4e36-81f7-a7ae53e8cbe3',
    subscribeKey: 'sub-c-116d9126-aa4c-11ea-9d71-da51a68c7938',
    secretKey: 'sec-c-NjU3Y2ZmMDUtNDgxZS00MTNlLWJlMzgtNTFjZWE5M2QxMmI5'
};

const CHANNELS={
    TEST: 'TEST',
    BLOCKCHAIN:'BLOCKCHAIN',
    TRANSACTION: 'TRANSACTION'
};

class PubSub{
    constructor({blockchain,transactionPool,wallet}){
        this.blockchain=blockchain;
        this.transactionPool=transactionPool;
        this.wallet=wallet;
        this.pubnub=new PubNub(credentials);
        this.pubnub.subscribe({channels: Object.values(CHANNELS)});
        this.pubnub.addListener(this.listener());
    }
    listener(){
        return{
            message: messageObject => {
                const {channel,message}=messageObject;
                console.log(`Message Received. Channel: ${channel}. Message: ${message} `);
                const parsedMessage = JSON.parse(message);
                switch(channel){
                    case CHANNELS.BLOCKCHAIN:
                        this.blockchain.replaceChain(parsedMessage);
                        break;
                    case CHANNELS.TRANSACTION:
                        if(!this.transactionPool.existingTransaction({
                            inputAddress: this.wallet.publicKey
                        }))
                        this.transactionPool.setTransaction(parsedMessage);
                        break;
                    default:
                        return;
                }                    
            }
        };
        
    };
    publish({channel,message}){
        this.pubnub.publish({channel,message});
    };

    broadcastChain() {
        this.publish({
          channel: CHANNELS.BLOCKCHAIN,
          message: JSON.stringify(this.blockchain.chain)
        });
      }

    broadcastTransaction(transaction){
        this.publish({
            channel: CHANNELS.TRANSACTION,
            message: JSON.stringify(transaction)
        })
        
    }
};

module.exports=PubSub;