const Blockchain = require('./index')
const Block=require('./block')
const {cryptoHash}=require('../util');
const Wallet=require('../wallet');
const Transaction=require('../wallet/transaction')

describe('Blockchain', ()=>{
    
    let blockchain,newChain,originalChain,errorMock;
    beforeEach(()=>{
        blockchain=new Blockchain();
        newChain=new Blockchain();
        errorMock=jest.fn();
        
        originalChain=blockchain.chain;
        global.console.error=errorMock;
    });
    it('contains a `chain` array instance', ()=>{
        expect(blockchain.chain instanceof Array).toBe(true);
    });
    it('starts with a genesis block',()=>{
        expect(blockchain.chain[0]).toEqual(Block.genesis());
    });
    it('adds a new block to the chain',()=>{
        const newData = 'foo-bar';
        blockchain.addBlock({data: newData});
        expect(blockchain.chain[blockchain.chain.length-1].data)
            .toEqual(newData);
    });
    describe('isValidChain()',()=>{
        describe('when the chain does not start with a genesis block', ()=>{
            it('return false',()=>{
                blockchain.chain[0]={data: 'fake-genesis'};
                expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
            });

        });
        describe('when the chain starts with a genesis block and has multiple blocks',()=>{
            beforeEach(()=>{
                blockchain.addBlock({data:'Sasuke'});
                blockchain.addBlock({data:'Naruto'});
                blockchain.addBlock({data:'Sakura'});
            })
            describe(' and a lastHash reference has changed',()=>{
                it('returns false', ()=>{
                    blockchain.chain[2].lastHash = 'broken-lastHash';
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);                   
                });
            });
            describe(' and the chain contains a block with an invalid field',()=>{
                it('returns false', ()=>{
                    blockchain.chain[2].data = 'broken-data';
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });
            describe(' and the chain contains a block with jumped difficulty',()=>{
                it('returns false',()=>{
                    const lastBlock=blockchain.chain[blockchain.chain.length-1];
                    const lastHash=lastBlock.hash;
                    const timestamp=Date.now();
                    const nonce=0;
                    const data=[];
                    const difficulty=lastBlock.difficulty-3;
                    const hash=cryptoHash(timestamp,lastHash,difficulty,nonce,data);
                    const badBlock=new Block({timestamp,lastHash,hash,data,nonce,difficulty});
                    blockchain.chain.push(badBlock);
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });
            describe('and the chain does not contain any invalid blocks', ()=>{
                it('return true', ()=>{
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
                });
            });
        })
    });

    describe('replaceChain()',()=>{
        let logMock;
        beforeEach(()=>{
            
            logMock=jest.fn();

            
            global.console.log=logMock;
        });
        describe('when the new chain is not longer',()=>{
            it('does not replace the chain', ()=>{
                newChain.chain[0]={new: 'chain'};
                blockchain.replaceChain(newChain.chain);
                expect(blockchain.chain).toEqual(originalChain);
            });
            // it('logs an error',()=>{
            //     expect(errorMock).toHaveBeenCalled();
            // })
        });
        describe('when the new chain is longer', ()=>{
            beforeEach(()=>{
                newChain.addBlock({data:'Sasuke'});
                newChain.addBlock({data:'Naruto'});
                newChain.addBlock({data:'Sakura'});
            })
            describe('the new chain is invalid',()=>{
                it('does not replace the chain', ()=>{
                    newChain.chain[2].hash='some-fake-hash';
                    blockchain.replaceChain(newChain.chain);
                    expect(blockchain.chain).toEqual(originalChain);
                });
            });
            describe('the new chain is valid',()=>{
                it('replaces the chain', ()=>{
                    blockchain.replaceChain(newChain.chain);
                    expect(blockchain.chain).toEqual(newChain.chain);
                });
            });
        });
        describe('and the `validateTransactions` flag is true',()=>{
            it('calls the `validTransactionData()`',()=>{
                const validTransactionDataMock = jest.fn();
                blockchain.validTransactionData=validTransactionDataMock;
                newChain.addBlock({data: 'foo'});
                blockchain.replaceChain(newChain.chain,true);
                expect(validTransactionDataMock).toHaveBeenCalled();
            })
        })

    });

    describe('validTransactionData()',()=>{
        let transaction,rewardTransaction
        beforeEach(()=>{
            wallet=new Wallet();
            transaction=wallet.createTransaction({recipient:'foo-address',amount: 65});
            rewardTransaction=Transaction.rewardTransaction({minerWallet: wallet})
        })
        describe('and the transaction is valid',()=>{
            it('returns true',()=>{
                newChain.addBlock({data: [transaction,rewardTransaction]});
                expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(true);
            });
        })
        describe('and the transaction is invalid',()=>{
            describe('and the transaction data has multiple rewards',()=>{
                it('returns false',()=>{
                    newChain.addBlock({data: [transaction,rewardTransaction,rewardTransaction]});
                    expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(false);
                });
            });
            describe('and the transaction data has some malformed outputMap',()=>{
                describe('and the transaction is a rewardTransaction',()=>{
                    it('returns false',()=>{
                        rewardTransaction.outputMap[wallet.publicKey]=999999;
                        newChain.addBlock({data: [transaction,rewardTransaction]});
                        expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(false);
                    });
                });
                describe('and the transaction is not a rewardTransaction',()=>{
                    it('returns false',()=>{
                        transaction.outputMap[wallet.publicKey]=999999;
                        newChain.addBlock({data: [transaction,rewardTransaction]});
                        expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(false);
                    });
                });
            });
            describe('and the transaction data has atleast one malformed input',()=>{
                it('returns false',()=>{
                    wallet.balance=9000;
                    const badOutputMap={
                    [wallet.publicKey]:8900,
                    fooRecipient:100
                    }
                    const badTransaction={
                        input:{
                            timestamp: Date.now(),
                            amount: wallet.balance,
                            address: wallet.publicKey,
                            signature: wallet.sign(badOutputMap)
                        },
                        outputMap:badOutputMap
                    }
                    newChain.addBlock({data: [badTransaction,rewardTransaction]});
                    expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(false);
                });
            });
            describe('and the block contains multiple identical transactions',()=>{
                it('returns false',()=>{
                    newChain.addBlock({
                        data: [transaction,transaction,transaction,rewardTransaction]
                    });
                    expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(false);
                });
            });

        })
    });
})