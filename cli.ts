import { program } from 'commander';
import log from 'loglevel';
import * as web3 from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import { readFileSync, writeFileSync } from 'fs';
import { FanoutClient, MembershipModel } from "@glasseaters/hydra-sdk";
import { NodeWallet } from "@project-serum/common"; //TODO remove this
//import { BorshAccountsCoder, Program, Provider } from "@project-serum/anchor";
import { parseTokenAccount, sendMultipleInstructions } from '@strata-foundation/spl-utils';


programCommand('create')
    .option('-s, --shares <string>', 'The total number of shares')
    .option('-n, --hydraName <string>', 'The name of the hydra wallet')
    .action(async (directory, cmd) => {
        const { keypair, env, rpc, shares, hydraName } = cmd.opts();
        //console.log(cmd.opts());
        const walletKeyPair = loadWalletKey(keypair);
        let connection;
        if (rpc === 'undefined') {
            console.log(rpc);
            connection = new web3.Connection(rpc);
        }
        else {
            connection = new web3.Connection(web3.clusterApiUrl(env));
        }

        let fanoutClient = new FanoutClient(connection, new NodeWallet(new web3.Account(walletKeyPair.secretKey)));

        const init = await fanoutClient.initializeFanout({
            totalShares: shares,
            name: hydraName,
            membershipModel: MembershipModel.NFT,
        })

        console.log("Fanout: %s\nNativeAccount: %s", init.fanout, init.nativeAccount);
    });

programCommand('add_members')
    .option('-f, --fanout <string>', 'The fanout public key')
    .option('-n, --nativeAccount <string>', 'The native account of the fanout')
    .option('-s, --shares <string>', 'The number of shares to give each member')
    .option('-o, --holders <string>', 'The JSON file containing the holder list')
    .action(async (directory, cmd) => {
        const { keypair, env, rpc, fanout, nativeAccount, shares, holders } = cmd.opts();
        const fanoutPubkey = new web3.PublicKey(fanout);
        const nativeAccountPubkey = new web3.PublicKey(nativeAccount);
        const walletKeyPair = loadWalletKey(keypair);
        let connection;
        if (rpc === 'undefined') {
            console.log(rpc);
            connection = new web3.Connection(rpc);
        }
        else {
            connection = new web3.Connection(web3.clusterApiUrl(env));
        }

        let fanoutClient = new FanoutClient(connection, new NodeWallet(new web3.Account(walletKeyPair.secretKey)));

        let holdersJson = JSON.parse(readFileSync(holders).toString());

        //let receivers: String[] = [];
        for (let holder of holdersJson) {
            //receivers.push(holder.owner_wallet);
            console.log("Adding %s", holder);
            await fanoutClient.addMemberNft({
                fanout: fanoutPubkey,
                fanoutNativeAccount: nativeAccountPubkey,
                membershipKey: new web3.PublicKey(holder.mint_account),
                shares: shares
            });
        }
    });

// programCommand('fund')
//     .option('-f, --fanout <string>', 'The fanout public key')
//     .option('-n, --nativeAccount <string>', 'The native account of the fanout')
//     .option('-m --mint <string>', 'The mint of what to distribute')
//     .option('-a --amount <string>', 'The amount to transfer')
//     .action(async (directory, cmd) => {
//         const { keypair, env, rpc, fanout, nativeAccount, mint, amount } = cmd.opts();
//         const fanoutPubkey = new web3.PublicKey(fanout);
//         const nativeAccountPubkey = new web3.PublicKey(nativeAccount);
//         const mintPubkey = new web3.PublicKey(mint);
//         const walletKeyPair = loadWalletKey(keypair);
//         let connection;
//         if (rpc === 'undefined') {
//             console.log(rpc);
//             connection = new web3.Connection(rpc);
//         }
//         else {
//             connection = new web3.Connection(web3.clusterApiUrl(env));
//         }

//         let fanoutClient = new FanoutClient(connection, new NodeWallet(new web3.Account(walletKeyPair.secretKey)));

//         transfer(connection, walletKeyPair, walletKeyPair.publicKey, fanoutPubkey, mintPubkey, +amount);
//     });

programCommand('distribute')
    .option('-f, --fanout <string>', 'The fanout public key')
    .option('-n, --nativeAccount <string>', 'The native account of the fanout')
    .option('-m --mint <string>', 'The mint of what to distribute')
    .action(async (directory, cmd) => {
        const { keypair, env, rpc, fanout, nativeAccount, mint } = cmd.opts();
        const fanoutPubkey = new web3.PublicKey(fanout);
        const nativeAccountPubkey = new web3.PublicKey(nativeAccount);
        const mintPubkey = new web3.PublicKey(mint);
        const walletKeyPair = loadWalletKey(keypair);
        let connection;
        if (rpc === 'undefined') {
            console.log(rpc);
            connection = new web3.Connection(rpc);
        }
        else {
            connection = new web3.Connection(web3.clusterApiUrl(env));
        }

        let fanoutClient = new FanoutClient(connection, new NodeWallet(new web3.Account(walletKeyPair.secretKey)));

        // console.log(await fanoutClient.getMembers({ fanout: fanoutPubkey }));
        let members = await fanoutClient.getMembers({ fanout: fanoutPubkey });
        // console.log(fanoutPubkey.toString());
        // console.log(mintPubkey.toString());
        // console.log(walletKeyPair.publicKey.toString());
        await fanoutClient.distributeAll({
            fanout: fanoutPubkey,
            mint: mintPubkey,
            payer: fanoutClient.wallet.publicKey,
        });

        // const errorMap = new Map<number, string>();
        // const instructionResultsTokens = await fanoutClient.distributeAllInstructions({ fanout: fanoutPubkey, mint: mintPubkey, payer: walletKeyPair.publicKey });
        // console.log(instructionResultsTokens.instructions);
        // await sendMultipleInstructions(
        //     errorMap,
        //     fanoutClient.provider,
        //     instructionResultsTokens.instructions,
        //     instructionResultsTokens.signers,
        //     walletKeyPair.publicKey,
        // )

        // This is the caller of the Distribute method, it can be a bot or a user,
        // they just need enough funds to pay for the transaction fee. If you're using
        // this code, airdrop a sol to distributionBot.

        //const member1.mint = "NFT Mint for Member 1";

        // for (let member of members) {
        //     console.log(member.toString());
        //     let atas = await connection.getTokenLargestAccounts(member);
        //     let tokenAccount;
        //     for (let ata of atas.value) {
        //         if (ata.uiAmount === 1) {
        //             tokenAccount = ata.address;
        //         }
        //     }
        //     console.log(tokenAccount.toString());
        //     let owner = parseTokenAccount((await connection.getAccountInfo(tokenAccount)).data).owner;
        //     //console.log(owner.owner.toString());
        //     //splToken.Token.account
        //     let distributeToMember = await fanoutClient.distributeNftMemberInstructions(
        //         {
        //             distributeForMint: true,
        //             member: owner,
        //             membershipKey: member,
        //             fanout: fanoutPubkey,
        //             payer: fanoutClient.wallet.publicKey,
        //         },
        //     );

        //     const tx = await fanoutClient.sendInstructions(
        //         [...distributeToMember.instructions],
        //         [walletKeyPair],
        //         walletKeyPair.publicKey
        //     );
        //     if (!!tx.RpcResponseAndContext.value.err) {
        //         const txdetails = await connection.getConfirmedTransaction(tx.TransactionSignature);
        //         console.log(txdetails, tx.RpcResponseAndContext.value.err);
        //     }
        // }
    });

function programCommand(name: string) {
    return program
        .command(name)
        .option(
            '-e, --env <string>',
            'Solana cluster env name',
            'devnet', //mainnet-beta, testnet, devnet
        )
        .option(
            '-r, --rpc <string>',
            "The endpoint to connect to.",
        )
        .option(
            '-k, --keypair <path>',
            `Solana wallet location`,
            '--keypair not provided',
        )
        .option('-l, --log-level <string>', 'log level', setLogLevel);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setLogLevel(value, prev) {
    if (value === undefined || value === null) {
        return;
    }
    log.info('setting the log value to: ' + value);
    log.setLevel(value);
}

program.parse(process.argv);

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function loadWalletKey(keypair: string): web3.Keypair {
    if (!keypair || keypair == '') {
        throw new Error('Keypair is required!');
    }
    const loaded = web3.Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(readFileSync(keypair).toString())),
    );
    log.info(`wallet public key: ${loaded.publicKey}`);
    return loaded;
}

// async function transfer(connection: web3.Connection, payer: web3.Signer, from: web3.PublicKey, to: web3.PublicKey, token: web3.PublicKey, amount: Number) {
//     console.log("Transfering %d %s to %s", token.toString(), to.toString());
//     let fromATA = await splToken.Token.getAssociatedTokenAddress(token, from);

//     let fromBalance = (await connection.getTokenAccountBalance(fromATA)).value.amount;
//     let toBalance = "0";
//     while (toBalance !== amount.toString()) {
//         let toATA: web3.PublicKey;
//         try {
//             toATA = (await splToken.getOrCreateAssociatedTokenAccount(connection, payer, token, to)).address;
//             //console.log("To: %d", (await connection.getTokenAccountBalance(toATA)).value.amount);

//             await splToken.transferChecked(connection, payer, fromATA, token, toATA, from, amount, 0);

//             fromBalance = (await connection.getTokenAccountBalance(fromATA)).value.amount;
//             toBalance = (await connection.getTokenAccountBalance(toATA)).value.amount;
//         }
//         catch (e) {
//             console.log(e);
//             try {
//                 fromBalance = (await connection.getTokenAccountBalance(fromATA)).value.amount;
//                 toBalance = (await connection.getTokenAccountBalance(toATA)).value.amount;
//             }
//             catch (e) {
//                 console.log(e);
//             }
//         }
//     }
// }