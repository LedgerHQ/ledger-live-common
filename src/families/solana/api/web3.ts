import { Connection, PublicKey } from "@solana/web3.js";
import { getAccountSpendableBalance } from "../logic";

const conn = new Connection("https://api.devnet.solana.com/");

export const getAccount = async (address: string) => {
    const pubKey = new PublicKey(address);
    const [accountInfo, blockHeight] = await Promise.all([
        conn.getAccountInfo(pubKey),
        conn.getEpochInfo().then((info) => info.blockHeight),
        //conn.gettoken
    ]);

    console.log(accountInfo);

    const result = await (conn as any)._rpcRequest("getFees", []);

    console.log(result);

    if (accountInfo === null) {
        return null;
    }

    /*
    const spendableBalance = await getAccountSpendableBalance(
        accountInfo.lamports,
        account
    );
    */
};

export const getTransactionFee = async () => {
    //conn.fee;
};

export const getOperations = async (address: string) => {
    const pubKey = new PublicKey(address);
    return conn.getSignaturesForAddress(pubKey);
};

async function go() {
    const acc = await getAccount(
        "3tgkMfug2gs82sy2wexQjMkR12JzFcX9rSLd9yM9m38g"
    );
    console.log(acc);
}

go();
